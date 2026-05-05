#!/usr/bin/env node
/*
 * Enrich free-exercise-db rows with boxing-specific S&C metadata.
 *
 * Dry-run by default. Use --apply to update Supabase.
 * Safe rules:
 * - No deletes, no schema changes.
 * - Never prints secrets.
 * - Validates model output against a fixed taxonomy.
 */

const fs = require('node:fs');
const path = require('node:path');

const TARGET_SUPABASE_URL = 'https://rabudzkpputmollmpodd.supabase.co';
const DEFAULT_ENV_CANDIDATES = [path.resolve(process.cwd(), '.env.local'), '/home/jordan/oracle-boxing-ops/dashboard/.env.local'];
const args = new Set(process.argv.slice(2));
const argValue = (name, fallback = undefined) => {
  const prefix = `${name}=`;
  const found = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
};

const APPLY = args.has('--apply');
const LIMIT = Number(argValue('--limit', '0')) || 0;
const BATCH_SIZE = Math.max(1, Math.min(20, Number(argValue('--batch-size', '10')) || 10));
const MODEL = argValue('--model', process.env.OPENAI_WORKOUT_METADATA_MODEL || 'gpt-5.4-mini');
const VERSION = 'boxing-snc-v1';
const FORCE = args.has('--force');

const ALLOWED = {
  roles: ['warmup_prep', 'activation', 'primary_strength', 'power', 'accessory_strength', 'conditioning', 'core', 'mobility', 'rehab_prehab', 'finisher'],
  adaptations: ['trunk_stiffness', 'rotational_power', 'anti_rotation', 'anti_extension', 'shoulder_durability', 'scapular_control', 'hip_drive', 'leg_strength', 'posterior_chain', 'footwork_elasticity', 'ankle_stiffness', 'repeat_power', 'aerobic_support', 'anaerobic_tolerance', 'postural_strength', 'mobility_restore', 'neck_durability', 'general_strength'],
  movementFamilies: ['squat', 'hinge', 'lunge', 'single_leg', 'push', 'pull', 'carry', 'rotation', 'anti_rotation', 'anti_extension', 'trunk_flexion', 'lateral_flexion', 'gait', 'jump', 'calf_ankle', 'shoulder_prehab', 'mobility', 'isometric'],
  bodyRegions: ['trunk', 'abs', 'obliques', 'shoulders', 'scapula', 'chest', 'upper_back', 'lats', 'arms', 'biceps', 'triceps', 'hips', 'glutes', 'quads', 'hamstrings', 'calves', 'ankles', 'neck', 'full_body'],
};

const SCORE_KEYS = ['boxing_transfer', 'target_fit', 'strength', 'power', 'conditioning', 'trunk', 'shoulder_health', 'footwork', 'mobility', 'fatigue_cost', 'injury_risk', 'setup_cost', 'technical_complexity', 'beginner_fit'];

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const env = {};
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    env[match[1]] = value;
  }
  return env;
}

function loadConfig() {
  let env = {};
  for (const candidate of DEFAULT_ENV_CANDIDATES) {
    const parsed = parseEnvFile(candidate);
    if ((parsed.NEXT_PUBLIC_SUPABASE_URL || parsed.SUPABASE_URL) === TARGET_SUPABASE_URL) {
      env = parsed;
      break;
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY;
  const openAiKey = process.env.OPENAI_API_KEY || env.OPENAI_API_KEY || parseEnvFile('/home/jordan/oracle-boxing-ops/dashboard/.env.local').OPENAI_API_KEY;

  if (!supabaseUrl || !serviceKey || !openAiKey) throw new Error('Missing Supabase/OpenAI env vars.');
  if (supabaseUrl !== TARGET_SUPABASE_URL) throw new Error('Refusing unexpected Supabase project.');
  return { supabaseUrl, serviceKey, openAiKey };
}

function authHeaders(config, extra = {}) {
  return { apikey: config.serviceKey, authorization: `Bearer ${config.serviceKey}`, ...extra };
}

async function request(url, options = {}, attempts = 5) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await fetch(url, options);
    if ([429, 500, 502, 503, 504].includes(response.status) && attempt < attempts) {
      const retryAfter = Number(response.headers.get('retry-after')) || 0;
      await new Promise((resolve) => setTimeout(resolve, retryAfter ? retryAfter * 1000 : attempt * attempt * 500));
      continue;
    }
    return response;
  }
}

function clampScore(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function cleanArray(values, allowed) {
  if (!Array.isArray(values)) return [];
  const allowedSet = new Set(allowed);
  return [...new Set(values.map((item) => String(item).trim().toLowerCase().replace(/\s+/g, '_')).filter((item) => allowedSet.has(item)))];
}

function cleanMetadata(item) {
  const scores = {};
  for (const key of SCORE_KEYS) scores[key] = clampScore(item?.scores?.[key]);

  return {
    id: String(item.id),
    boxing_snc_roles: cleanArray(item.roles, ALLOWED.roles),
    boxing_snc_adaptations: cleanArray(item.adaptations, ALLOWED.adaptations),
    boxing_snc_movement_families: cleanArray(item.movementFamilies, ALLOWED.movementFamilies),
    boxing_snc_body_regions: cleanArray(item.bodyRegions, ALLOWED.bodyRegions),
    boxing_snc_equipment_fit: {
      required: Array.isArray(item?.equipmentFit?.required) ? item.equipmentFit.required.map(String).slice(0, 5) : [],
      optional: Array.isArray(item?.equipmentFit?.optional) ? item.equipmentFit.optional.map(String).slice(0, 5) : [],
      substitutable_with: Array.isArray(item?.equipmentFit?.substitutableWith) ? item.equipmentFit.substitutableWith.map(String).slice(0, 8) : [],
      home_friendly: Boolean(item?.equipmentFit?.homeFriendly),
      gym_friendly: item?.equipmentFit?.gymFriendly !== false,
    },
    boxing_snc_scores: scores,
    boxing_snc_prescription: {
      best_block_types: cleanArray(item?.prescription?.bestBlockTypes, ALLOWED.roles),
      default_sets: item?.prescription?.defaultSets ? String(item.prescription.defaultSets).slice(0, 24) : null,
      default_reps: item?.prescription?.defaultReps ? String(item.prescription.defaultReps).slice(0, 40) : null,
      default_duration_seconds: item?.prescription?.defaultDurationSeconds == null ? null : clampScore(item.prescription.defaultDurationSeconds),
      default_rest_seconds: item?.prescription?.defaultRestSeconds == null ? null : clampScore(item.prescription.defaultRestSeconds),
      tempo: item?.prescription?.tempo ? String(item.prescription.tempo).slice(0, 40) : null,
      coaching_cue: item?.prescription?.coachingCue ? String(item.prescription.coachingCue).slice(0, 180) : null,
    },
    boxing_snc_notes: item?.notes ? String(item.notes).slice(0, 500) : null,
    boxing_snc_version: VERSION,
    boxing_snc_model: MODEL,
    boxing_snc_enriched_at: new Date().toISOString(),
  };
}

function promptFor(exercises) {
  return [
    {
      role: 'system',
      content: `You are building metadata for a boxing-specific strength and conditioning workout builder.

Return JSON only: {"items":[...]}.

Your job is not to make every exercise sound boxing-specific. Be honest. Some exercises are general accessories.

Allowed roles: ${ALLOWED.roles.join(', ')}.
Allowed adaptations: ${ALLOWED.adaptations.join(', ')}.
Allowed movementFamilies: ${ALLOWED.movementFamilies.join(', ')}.
Allowed bodyRegions: ${ALLOWED.bodyRegions.join(', ')}.

Score all keys 0-100: ${SCORE_KEYS.join(', ')}.

Rules:
- Equipment must reflect the actual exercise. Do not invent equipment.
- Calf raises are calf/ankle or accessory strength, not automatically gas tank/conditioning.
- Conditioning score means the exercise itself can reasonably drive conditioning, not just any exercise done for reps.
- Boxing transfer should be high only for exercises with clear transfer: trunk control/rotation, shoulder durability, hip/leg drive, repeat power, posture, foot/ankle stiffness, or useful general strength.
- Fatigue cost, injury risk, setup cost, and technical complexity are costs. Higher means more expensive/risky/complex.
- Provide practical prescription defaults for how this exercise is usually programmed in a workout.

Item shape:
{
  "id": string,
  "roles": string[],
  "adaptations": string[],
  "movementFamilies": string[],
  "bodyRegions": string[],
  "scores": object,
  "equipmentFit": {"required": string[], "optional": string[], "substitutableWith": string[], "homeFriendly": boolean, "gymFriendly": boolean},
  "prescription": {"bestBlockTypes": string[], "defaultSets": string|null, "defaultReps": string|null, "defaultDurationSeconds": number|null, "defaultRestSeconds": number|null, "tempo": string|null, "coachingCue": string|null},
  "notes": string
}`,
    },
    { role: 'user', content: JSON.stringify({ exercises }) },
  ];
}

async function enrichBatch(config, exercises) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { authorization: `Bearer ${config.openAiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, response_format: { type: 'json_object' }, messages: promptFor(exercises) }),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`OpenAI HTTP ${response.status}: ${text.slice(0, 300)}`);
  const payload = JSON.parse(text);
  const content = payload.choices?.[0]?.message?.content;
  const parsed = JSON.parse(content);
  if (!Array.isArray(parsed.items)) throw new Error('Model response missing items array.');
  return parsed.items.map(cleanMetadata);
}

async function hasMetadataColumns(config) {
  const response = await request(`${config.supabaseUrl}/rest/v1/exercises?select=boxing_snc_version&limit=1`, { headers: authHeaders(config) });
  return response.ok;
}

async function fetchExercises(config) {
  const columnsExist = await hasMetadataColumns(config);
  const selectColumns = ['id', 'title', 'category', 'equipment_tags', 'difficulty', 'force', 'mechanic', 'source_equipment', 'primary_muscles', 'secondary_muscles', 'summary', 'description', 'instructions_json', 'movement_patterns', 'boxing_qualities'];
  if (columnsExist) selectColumns.push('boxing_snc_version');

  const filters = ['structure_json->>source=eq.free-exercise-db', `select=${selectColumns.join(',')}`];
  if (!FORCE && columnsExist) filters.push(`or=(boxing_snc_version.is.null,boxing_snc_version.neq.${VERSION})`);
  if (LIMIT) filters.push(`limit=${LIMIT}`);
  const url = `${config.supabaseUrl}/rest/v1/exercises?${filters.join('&')}`;
  const response = await request(url, { headers: authHeaders(config) });
  const text = await response.text();
  if (!response.ok) throw new Error(`Fetch exercises failed: HTTP ${response.status} ${text.slice(0, 300)}`);
  const rows = JSON.parse(text);
  rows.metadataColumnsExist = columnsExist;
  return rows;
}

async function updateExercise(config, item) {
  const { id, ...update } = item;
  const response = await request(`${config.supabaseUrl}/rest/v1/exercises?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: authHeaders(config, { 'content-type': 'application/json', prefer: 'return=minimal' }),
    body: JSON.stringify(update),
  });
  if (!response.ok) throw new Error(`Update ${id} failed: HTTP ${response.status} ${(await response.text()).slice(0, 300)}`);
}

async function main() {
  const config = loadConfig();
  const exercises = await fetchExercises(config);
  const metadataColumnsExist = Boolean(exercises.metadataColumnsExist);
  delete exercises.metadataColumnsExist;
  if (APPLY && !metadataColumnsExist) throw new Error('Run supabase/boxing-snc-metadata.sql before --apply. Metadata columns do not exist yet.');
  console.log(`${APPLY ? 'APPLY' : 'DRY RUN'} ${exercises.length} exercises | batch=${BATCH_SIZE} | model=${MODEL} | version=${VERSION} | columns=${metadataColumnsExist ? 'ready' : 'missing'}`);
  if (!exercises.length) return;

  let enriched = 0;
  for (let index = 0; index < exercises.length; index += BATCH_SIZE) {
    const batch = exercises.slice(index, index + BATCH_SIZE).map((exercise) => ({
      id: exercise.id,
      title: exercise.title,
      category: exercise.category,
      equipment: exercise.equipment_tags,
      difficulty: exercise.difficulty,
      force: exercise.force,
      mechanic: exercise.mechanic,
      sourceEquipment: exercise.source_equipment,
      primaryMuscles: exercise.primary_muscles,
      secondaryMuscles: exercise.secondary_muscles,
      summary: exercise.summary,
      description: exercise.description,
      instructions: exercise.instructions_json,
      oldMovementPatterns: exercise.movement_patterns,
      oldBoxingQualities: exercise.boxing_qualities,
    }));

    const items = await enrichBatch(config, batch);
    if (!APPLY) {
      console.log(JSON.stringify(items.slice(0, 2), null, 2));
      console.log('Dry-run only. Use --apply to update rows.');
      return;
    }

    for (const item of items) await updateExercise(config, item);
    enriched += items.length;
    console.log(`Updated ${enriched}/${exercises.length}`);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});

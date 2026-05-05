#!/usr/bin/env node
/*
 * Import yuhonas/free-exercise-db into Supabase without deleting anything.
 *
 * Safety rules:
 * - No deletes, truncates, or drops.
 * - Dry-run by default unless --apply is passed.
 * - Secrets are loaded from env files but never printed.
 * - Existing target table shape is detected and records are adapted.
 */

const fs = require('node:fs');
const path = require('node:path');

const TARGET_SUPABASE_URL = 'https://rabudzkpputmollmpodd.supabase.co';
const DEFAULT_ENV_CANDIDATES = [
  path.resolve(process.cwd(), '.env.local'),
  '/home/jordan/oracle-boxing-app/.env.local',
];
const RAW_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main';
const DATASET_URL = `${RAW_BASE}/dist/exercises.json`;
const DEFAULT_BUCKET = 'exercise-images';

const args = new Set(process.argv.slice(2));
const argValue = (name, fallback = undefined) => {
  const prefix = `${name}=`;
  const found = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
};

const APPLY = args.has('--apply');
const DRY_RUN = !APPLY || args.has('--dry-run');
const LIMIT = Number(argValue('--limit', '0')) || 0;
const DRY_RUN_LIMIT = Number(argValue('--dry-run-limit', '5')) || 5;
const BUCKET = argValue('--bucket', DEFAULT_BUCKET);
const SKIP_IMAGES = args.has('--skip-images');
const ENV_FILE = argValue('--env', null);
const IMAGE_CONCURRENCY = Math.max(1, Math.min(10, Number(argValue('--image-concurrency', '4')) || 4));
const EXERCISE_BATCH_SIZE = Math.max(1, Math.min(100, Number(argValue('--exercise-batch-size', '50')) || 50));

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  const text = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[match[1]] = value;
  }
  return out;
}

function loadConfig() {
  const candidates = ENV_FILE ? [ENV_FILE] : DEFAULT_ENV_CANDIDATES;
  let chosen = null;
  let env = {};
  for (const candidate of candidates) {
    const parsed = parseEnvFile(candidate);
    const url = parsed.NEXT_PUBLIC_SUPABASE_URL || parsed.SUPABASE_URL;
    const key = parsed.SUPABASE_SERVICE_ROLE_KEY || parsed.SUPABASE_SERVICE_KEY;
    if (url === TARGET_SUPABASE_URL && key) {
      chosen = candidate;
      env = parsed;
      break;
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_KEY;

  const missing = [];
  if (!supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL');
  if (!serviceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY');
  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
  if (supabaseUrl !== TARGET_SUPABASE_URL) {
    throw new Error(`Refusing to import into unexpected Supabase project. Expected ${TARGET_SUPABASE_URL}, got ${supabaseUrl.replace(/^(https?:\/\/[^.]+).*/, '$1…')}`);
  }

  return { supabaseUrl, serviceKey, chosenEnvFile: chosen || 'process.env' };
}

function headers(serviceKey, extra = {}) {
  return {
    apikey: serviceKey,
    authorization: `Bearer ${serviceKey}`,
    ...extra,
  };
}

async function request(url, options = {}, attempts = 5) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, options);
      if ([429, 500, 502, 503, 504].includes(response.status) && attempt < attempts) {
        const retryAfter = Number(response.headers.get('retry-after')) || 0;
        const delayMs = retryAfter ? retryAfter * 1000 : 400 * attempt * attempt;
        await sleep(delayMs);
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await sleep(400 * attempt * attempt);
        continue;
      }
    }
  }
  throw lastError;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function slugify(input) {
  return String(input)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function descriptionFromInstructions(instructions = []) {
  if (!instructions.length) return null;
  return instructions.join('\n');
}

function summaryForExercise(exercise) {
  const muscles = [...(exercise.primaryMuscles || []), ...(exercise.secondaryMuscles || [])].filter(Boolean);
  const parts = [exercise.level, exercise.category, exercise.equipment].filter(Boolean);
  const suffix = muscles.length ? ` targeting ${muscles.slice(0, 4).join(', ')}` : '';
  return `${parts.join(' ')} exercise${suffix}.`.trim();
}

function normalizeStoragePath(imagePath) {
  return imagePath.replace(/[^A-Za-z0-9._/-]/g, '_');
}

function publicImageUrl(supabaseUrl, bucket, objectPath) {
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${objectPath.split('/').map(encodeURIComponent).join('/')}`;
}

function normalizeDifficulty(level) {
  if (level === 'expert') return 'advanced';
  return level || null;
}

function adaptExercise(exercise, imageUrls = []) {
  const slug = slugify(exercise.id || exercise.name);
  const sourcePayload = {
    ...exercise,
    original_images: exercise.images || [],
    storage_image_urls: imageUrls,
  };

  return {
    title: exercise.name,
    slug,
    discipline: 'strength_conditioning',
    item_type: 'exercise',
    category: exercise.category || 'uncategorized',
    summary: summaryForExercise(exercise),
    description: descriptionFromInstructions(exercise.instructions || []),
    instructions_json: exercise.instructions || [],
    coaching_cues_json: [],
    common_mistakes_json: [],
    equipment_tags: exercise.equipment ? [exercise.equipment] : [],
    difficulty: normalizeDifficulty(exercise.level),
    structure_json: {
      source: 'free-exercise-db',
      source_id: exercise.id || null,
      source_payload: sourcePayload,
      force: exercise.force || null,
      mechanic: exercise.mechanic || null,
      primary_muscles: exercise.primaryMuscles || [],
      secondary_muscles: exercise.secondaryMuscles || [],
      image_paths: imageUrls,
    },
    is_active: true,
    is_curated: false,
  };
}

async function fetchDataset() {
  const response = await request(DATASET_URL, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`Failed to fetch dataset: HTTP ${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error('Dataset response was not an array');
  return data;
}

async function getExistingColumns(config) {
  const response = await request(`${config.supabaseUrl}/rest/v1/exercises?select=*&limit=1`, {
    headers: headers(config.serviceKey),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Cannot read public.exercises: HTTP ${response.status} ${text.slice(0, 200)}`);
  const rows = JSON.parse(text);
  return rows[0] ? Object.keys(rows[0]) : null;
}

async function ensureBucket(config) {
  const listResponse = await request(`${config.supabaseUrl}/storage/v1/bucket`, {
    headers: headers(config.serviceKey),
  });
  if (!listResponse.ok) throw new Error(`Cannot list storage buckets: HTTP ${listResponse.status}`);
  const buckets = await listResponse.json();
  if (buckets.some((bucket) => bucket.name === BUCKET || bucket.id === BUCKET)) return { created: false };

  const createResponse = await request(`${config.supabaseUrl}/storage/v1/bucket`, {
    method: 'POST',
    headers: headers(config.serviceKey, { 'content-type': 'application/json' }),
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true, file_size_limit: 10485760, allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp'] }),
  });
  const text = await createResponse.text();
  if (!createResponse.ok && !text.includes('already exists')) {
    throw new Error(`Cannot create bucket ${BUCKET}: HTTP ${createResponse.status} ${text.slice(0, 200)}`);
  }
  return { created: true };
}

async function uploadOneImage(config, imagePath) {
  const objectPath = normalizeStoragePath(imagePath);
  const sourceUrl = `${RAW_BASE}/exercises/${imagePath}`;
  const imageResponse = await request(sourceUrl, { headers: { accept: 'image/*' } });
  if (!imageResponse.ok) throw new Error(`Image fetch failed ${imagePath}: HTTP ${imageResponse.status}`);
  const buffer = Buffer.from(await imageResponse.arrayBuffer());
  const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
  const uploadUrl = `${config.supabaseUrl}/storage/v1/object/${BUCKET}/${objectPath.split('/').map(encodeURIComponent).join('/')}`;
  const uploadResponse = await request(uploadUrl, {
    method: 'POST',
    headers: headers(config.serviceKey, {
      'content-type': contentType,
      'x-upsert': 'true',
      'cache-control': '31536000',
    }),
    body: buffer,
  });
  const text = await uploadResponse.text();
  if (!uploadResponse.ok) throw new Error(`Image upload failed ${imagePath}: HTTP ${uploadResponse.status} ${text.slice(0, 200)}`);
  return publicImageUrl(config.supabaseUrl, BUCKET, objectPath);
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await mapper(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

async function uploadImagesForExercise(config, exercise) {
  if (SKIP_IMAGES) return [];
  const images = exercise.images || [];
  if (!images.length) return [];
  return mapWithConcurrency(images, IMAGE_CONCURRENCY, (imagePath) => uploadOneImage(config, imagePath));
}

async function findExistingBySlug(config, slugs) {
  if (!slugs.length) return new Map();
  const inList = slugs.map((slug) => `"${slug.replace(/"/g, '\\"')}"`).join(',');
  const response = await request(`${config.supabaseUrl}/rest/v1/exercises?select=id,slug&slug=in.(${encodeURIComponent(inList)})`, {
    headers: headers(config.serviceKey),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Failed to fetch existing slugs: HTTP ${response.status} ${text.slice(0, 200)}`);
  const rows = JSON.parse(text);
  return new Map(rows.map((row) => [row.slug, row.id]));
}

async function insertRecords(config, records) {
  if (!records.length) return;
  const response = await request(`${config.supabaseUrl}/rest/v1/exercises`, {
    method: 'POST',
    headers: headers(config.serviceKey, {
      'content-type': 'application/json',
      prefer: 'return=minimal',
    }),
    body: JSON.stringify(records),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Insert failed: HTTP ${response.status} ${text.slice(0, 500)}`);
}

async function updateRecord(config, id, record) {
  const response = await request(`${config.supabaseUrl}/rest/v1/exercises?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: headers(config.serviceKey, {
      'content-type': 'application/json',
      prefer: 'return=minimal',
    }),
    body: JSON.stringify(record),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Update failed for ${record.slug}: HTTP ${response.status} ${text.slice(0, 500)}`);
}

async function importExercises(config, exercises) {
  let inserted = 0;
  let updated = 0;
  let imagesUploaded = 0;
  let failures = 0;

  for (let i = 0; i < exercises.length; i += EXERCISE_BATCH_SIZE) {
    const batch = exercises.slice(i, i + EXERCISE_BATCH_SIZE);
    const slugs = batch.map((exercise) => slugify(exercise.id || exercise.name));
    const existing = await findExistingBySlug(config, slugs);
    const inserts = [];
    const updates = [];

    for (const exercise of batch) {
      try {
        const imageUrls = await uploadImagesForExercise(config, exercise);
        imagesUploaded += imageUrls.length;
        const record = adaptExercise(exercise, imageUrls);
        const existingId = existing.get(record.slug);
        if (existingId) updates.push({ id: existingId, record });
        else inserts.push(record);
      } catch (error) {
        failures += 1;
        console.error(`Failed to prepare ${exercise.id || exercise.name}: ${error.message}`);
      }
    }

    if (inserts.length) {
      await insertRecords(config, inserts);
      inserted += inserts.length;
    }
    for (const update of updates) {
      await updateRecord(config, update.id, update.record);
      updated += 1;
    }

    console.log(`Imported batch ${Math.min(i + batch.length, exercises.length)}/${exercises.length}: inserted=${inserted}, updated=${updated}, images=${imagesUploaded}, failures=${failures}`);
  }

  return { inserted, updated, imagesUploaded, failures };
}

async function verify(config) {
  const countResponse = await request(`${config.supabaseUrl}/rest/v1/exercises?select=id&structure_json->>source=eq.free-exercise-db`, {
    headers: headers(config.serviceKey, { prefer: 'count=exact' }),
  });
  const countHeader = countResponse.headers.get('content-range') || '';
  const sourceCount = countHeader.includes('/') ? Number(countHeader.split('/').pop()) : null;

  const sampleResponse = await request(`${config.supabaseUrl}/rest/v1/exercises?select=title,slug,structure_json&structure_json->>source=eq.free-exercise-db&limit=1`, {
    headers: headers(config.serviceKey),
  });
  const sampleText = await sampleResponse.text();
  if (!sampleResponse.ok) throw new Error(`Verification sample failed: HTTP ${sampleResponse.status} ${sampleText.slice(0, 200)}`);
  const sampleRows = JSON.parse(sampleText);
  const sample = sampleRows[0];
  let sampleImageStatus = null;
  if (sample?.structure_json?.image_paths?.[0]) {
    const imageResponse = await request(sample.structure_json.image_paths[0], { method: 'HEAD' });
    sampleImageStatus = imageResponse.status;
  }

  return {
    sourceCount,
    sample: sample ? { title: sample.title, slug: sample.slug, imageStatus: sampleImageStatus } : null,
  };
}

async function main() {
  const config = loadConfig();
  console.log(`Mode: ${DRY_RUN ? 'dry-run' : 'apply'}`);
  console.log(`Supabase project: ${TARGET_SUPABASE_URL}`);
  console.log(`Env source: ${config.chosenEnvFile}`);

  const columns = await getExistingColumns(config);
  if (!columns) {
    throw new Error('public.exercises exists but has no rows, column detection via REST could not infer shape. Insert one known-safe row manually or apply schema before import.');
  }
  console.log(`Detected public.exercises columns: ${columns.join(', ')}`);

  const expectedConditioningSchema = ['name', 'force', 'level', 'mechanic', 'equipment', 'primary_muscles', 'source_payload'];
  const hasConditioningSchema = expectedConditioningSchema.every((column) => columns.includes(column));
  const hasOracleExerciseSchema = ['title', 'slug', 'discipline', 'item_type', 'structure_json'].every((column) => columns.includes(column));
  if (!hasConditioningSchema && !hasOracleExerciseSchema) {
    throw new Error('public.exercises schema is not compatible with either conditioning schema.sql or Oracle app exercise schema. Refusing to guess.');
  }
  if (!hasConditioningSchema) {
    console.log('Note: target public.exercises differs from conditioning schema.sql. Preserving free-exercise-db source_payload inside structure_json.source_payload.');
  }

  const dataset = await fetchDataset();
  const selected = dataset.slice(0, LIMIT || dataset.length);
  console.log(`Dataset exercises fetched: ${dataset.length}. Selected: ${selected.length}.`);

  if (DRY_RUN) {
    const preview = selected.slice(0, DRY_RUN_LIMIT).map((exercise) => adaptExercise(exercise, (exercise.images || []).map((img) => publicImageUrl(config.supabaseUrl, BUCKET, normalizeStoragePath(img)))));
    console.log(JSON.stringify({ previewCount: preview.length, firstPreview: preview[0] }, null, 2));
    console.log('Dry-run complete. Re-run with --apply for writes.');
    return;
  }

  const bucketResult = await ensureBucket(config);
  console.log(`Storage bucket ${BUCKET}: ${bucketResult.created ? 'created' : 'exists'}`);

  const results = await importExercises(config, selected);
  const verification = await verify(config);
  console.log(JSON.stringify({ results, verification }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

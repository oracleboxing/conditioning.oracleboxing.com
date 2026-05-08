#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function loadEnv(file) {
  try {
    const raw = fs.readFileSync(file, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = trimmed.match(/^([A-Z0-9_]+)=(.*)$/i);
      if (!match) continue;
      const key = match[1];
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {}
}

loadEnv(path.join(process.cwd(), '.env.local'));
loadEnv(path.join(process.cwd(), '.env'));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing Supabase URL or service role key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const clawEmail = 'claw-demo@oracleboxing.local';

const workoutPlans = [
  {
    title: 'Claw Engine Builder',
    goal: 'engine',
    duration_minutes: 36,
    difficulty: 'intermediate',
    equipment: ['Bodyweight', 'Dumbbells'],
    intake_summary: 'A clean boxing conditioning session built to push the engine without turning movement into chaos.',
    blocks: [
      ['warmup', 'Warm-up', 2, '45s', 20, 'Open up the hips and shoulders before intensity climbs.'],
      ['strength', 'Strength', 3, '10', 60, 'Keep ribs stacked and reps clean.'],
      ['conditioning', 'Conditioning', 5, '40s', 20, 'Work hard, but keep the shape boxer-like.'],
      ['core', 'Core', 3, '12 each', 30, 'Brace before every rep.'],
    ],
  },
  {
    title: 'Claw Dumbbell Strength Round',
    goal: 'strength',
    duration_minutes: 42,
    difficulty: 'all-levels',
    equipment: ['Dumbbells', 'Bench'],
    intake_summary: 'Simple strength work for legs, trunk and upper-body control.',
    blocks: [
      ['warmup', 'Warm-up', 2, '60s', 20, 'Own the positions first.'],
      ['strength', 'Strength', 4, '8-10', 75, 'Use a load you can control.'],
      ['main', 'Main work', 3, '10 each', 45, 'Smooth reps, no rushing.'],
      ['cooldown', 'Cooldown', 2, '45s', 15, 'Bring breathing back down.'],
    ],
  },
  {
    title: 'Claw Mobility Reset',
    goal: 'mobility',
    duration_minutes: 24,
    difficulty: 'beginner',
    equipment: ['Bodyweight', 'Mat'],
    intake_summary: 'A short reset for hips, T-spine and shoulders after harder training.',
    blocks: [
      ['mobility', 'Mobility', 2, '60s', 20, 'Slow down and find useful range.'],
      ['core', 'Core', 3, '8 each', 30, 'Control the pelvis and ribs.'],
      ['cooldown', 'Cooldown', 2, '60s', 15, 'Leave feeling better than you started.'],
    ],
  },
];

async function ensureClawUser() {
  const { data: existing } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  let user = existing.users.find((candidate) => candidate.email === clawEmail);

  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: clawEmail,
      email_confirm: true,
      user_metadata: { first_name: 'Open', last_name: 'Claw', full_name: 'Open Claw', name: 'Open Claw' },
    });
    if (error) throw error;
    user = data.user;
  }

  const { error: profileError } = await supabase.from('profiles').upsert({
    id: user.id,
    email: clawEmail,
    first_name: 'Open',
    last_name: 'Claw',
    display_name: 'Open Claw',
    avatar_url: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });
  if (profileError) throw profileError;

  return user.id;
}

async function exercises() {
  const { data, error } = await supabase
    .from('exercises')
    .select('id,title,equipment_tags,image_urls,structure_json')
    .not('image_urls', 'is', null)
    .limit(80);
  if (error) throw error;
  const usable = (data || []).filter((exercise) => Array.isArray(exercise.image_urls) && exercise.image_urls.length);
  if (usable.length < 8) throw new Error('Not enough image-backed exercises to seed workouts.');
  return usable;
}

async function seedWorkout(userId, plan, pool, offset) {
  const { data: existing } = await supabase.from('workouts').select('id').eq('user_id', userId).eq('title', plan.title).maybeSingle();
  if (existing?.id) {
    await supabase.from('workout_items').delete().eq('workout_id', existing.id);
    await supabase.from('workouts').delete().eq('id', existing.id);
  }

  const { data: workout, error } = await supabase.from('workouts').insert({
    user_id: userId,
    title: plan.title,
    goal: plan.goal,
    duration_minutes: plan.duration_minutes,
    difficulty: plan.difficulty,
    equipment: plan.equipment,
    visibility: 'community',
    intake_summary: plan.intake_summary,
    ai_model: 'claw-demo-seed',
  }).select('id').single();
  if (error) throw error;

  const items = plan.blocks.map((block, index) => {
    const exercise = pool[(offset + index * 3) % pool.length];
    return {
      workout_id: workout.id,
      exercise_id: exercise.id,
      order_index: index,
      block_type: block[0],
      block_title: block[1],
      sets: block[2],
      reps: block[3],
      rest_seconds: block[4],
      coaching_note: block[5],
    };
  });

  const { error: itemError } = await supabase.from('workout_items').insert(items);
  if (itemError) throw itemError;
  return workout.id;
}

(async () => {
  const userId = await ensureClawUser();
  const pool = await exercises();
  const ids = [];
  for (let index = 0; index < workoutPlans.length; index += 1) {
    ids.push(await seedWorkout(userId, workoutPlans[index], pool, index * 7));
  }
  console.log(JSON.stringify({ userId, workoutIds: ids }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

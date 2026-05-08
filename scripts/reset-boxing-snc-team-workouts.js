#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function loadEnv(file) {
  try {
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const match = trimmed.match(/^([A-Z0-9_]+)=(.*)$/i);
      if (!match) continue;
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      if (!process.env[match[1]]) process.env[match[1]] = value;
    }
  } catch {}
}

loadEnv(path.join(process.cwd(), '.env.local'));
loadEnv(path.join(process.cwd(), '.env'));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
if (!supabaseUrl || !serviceKey) throw new Error('Missing Supabase URL or service role key');

const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const JORDAN_EMAIL = 'jordan@oracleboxing.com';
const CLAW_EMAIL = 'claw-demo@oracleboxing.local';

const workouts = [
  {
    title: 'Band Rotation + Glute Chain',
    goal: 'rotation-glutes',
    duration_minutes: 34,
    difficulty: 'all-levels',
    equipment: ['Bands', 'Cable', 'Bodyweight'],
    summary: 'Warm up the shoulders and hips, load rotation safely, wake up the glutes, then stretch down. Built for better punching mechanics, not random sweating.',
    items: [
      ['warmup', 'Warm-up', 'Arm Circles', 2, '45s', 15, null, 'Small circles first, then bigger. Keep ribs down and shoulders loose.'],
      ['warmup', 'Warm-up', 'Bodyweight Walking Lunge', 2, '10 each side', 30, null, 'Step long enough to open the hip, but keep balance like a boxer.'],
      ['rotation', 'Rotation with resistance', 'Pallof Press With Rotation', 3, '8 each side', 45, null, 'Rotate from the ribcage and hips together. No yanking with the arms.'],
      ['glutes', 'Glute chain', 'Single Leg Glute Bridge', 3, '10 each side', 35, null, 'Drive through the heel and keep the pelvis level.'],
      ['cooldown', 'Stretch down', 'Seated Glute', 2, '60s each side', 15, null, 'Breathe slow and let the hip actually release.'],
    ],
  },
  {
    title: 'Rotation Core + Boxing Abs',
    goal: 'core-rotation',
    duration_minutes: 30,
    difficulty: 'intermediate',
    equipment: ['Cable', 'Bodyweight'],
    summary: 'Anti-rotation, rotation, and trunk stiffness for boxers who need their core to transfer force instead of just look busy.',
    items: [
      ['warmup', 'Warm-up', 'Shoulder Circles', 2, '45s', 15, null, 'Open the shoulders without shrugging. Stay tall.'],
      ['core', 'Anti-rotation', 'Pallof Press', 3, '10 each side', 35, null, 'Brace before the press. Do not let the cable pull you around.'],
      ['core', 'Rotation', 'Russian Twist', 3, '16 total', 35, null, 'Move the chest, not just the hands. Keep it controlled.'],
      ['core', 'Boxing brace', 'Dead Bug', 3, '8 each side', 30, null, 'Lower the limbs without letting the lower back peel up.'],
      ['finisher', 'Short finisher', 'Push Up to Side Plank', 2, '6 each side', 45, null, 'Push, rotate, pause. Make every rep clean.'],
    ],
  },
  {
    title: 'Explosive Shoulders + Punch Power',
    goal: 'punching-power',
    duration_minutes: 38,
    difficulty: 'intermediate',
    equipment: ['Barbell', 'Medicine Ball', 'Bands'],
    summary: 'Punch-power S&C built around fast shoulder drive, trunk snap, and enough cuff work to keep the shoulders available.',
    items: [
      ['warmup', 'Shoulder prep', 'External Rotation with Band', 2, '12 each side', 25, null, 'Keep elbow pinned and move slowly. This is prep, not ego lifting.'],
      ['power', 'Punch power', 'Single-Arm Linear Jammer', 4, '5 each side', 75, 'Explosive', 'Drive from the legs and hip, then finish through the shoulder like a straight shot.'],
      ['power', 'Upper-body speed', 'Medicine Ball Chest Pass', 4, '6', 60, 'Explosive', 'Snap the pass hard, reset fully, no lazy reps.'],
      ['power', 'Overhead pop', 'Push Press', 3, '5', 75, 'Fast up, controlled down', 'Use the dip and drive. The arms finish what the legs start.'],
      ['durability', 'Cuff finisher', 'Face Pull', 2, '15', 40, null, 'Pull to the face, elbows high, shoulder blades moving cleanly.'],
    ],
  },
  {
    title: 'Hip Snap Legs + Footwork Base',
    goal: 'lower-body-boxing-strength',
    duration_minutes: 36,
    difficulty: 'all-levels',
    equipment: ['Bodyweight', 'Dumbbells', 'Kettlebells'],
    summary: 'Glutes, single-leg strength, and elastic legs for better stance, sharper exits, and less collapsing when you punch.',
    items: [
      ['warmup', 'Warm-up', 'Bodyweight Walking Lunge', 2, '10 each side', 30, null, 'Move smoothly and keep the front knee tracking.'],
      ['strength', 'Single-leg strength', 'Dumbbell Rear Lunge', 3, '8 each side', 60, null, 'Stay tall and push the floor away.'],
      ['glutes', 'Glute drive', 'Barbell Glute Bridge', 3, '10', 60, null, 'Lock out with glutes, not lower back.'],
      ['power', 'Elastic legs', 'Freehand Jump Squat', 3, '6', 60, 'Explosive', 'Jump sharp, land quiet, reset your stance.'],
      ['conditioning', 'Hip snap finisher', 'One-Arm Kettlebell Swings', 3, '12 each side', 45, null, 'Hinge and snap. Do not turn it into a shoulder raise.'],
    ],
  },
  {
    title: 'Guard Durability + Shoulder Armour',
    goal: 'shoulder-durability',
    duration_minutes: 28,
    difficulty: 'beginner',
    equipment: ['Bands', 'Cable', 'Bodyweight'],
    summary: 'Shoulder durability for keeping the guard up, throwing volume, and not feeling cooked after two rounds.',
    items: [
      ['warmup', 'Warm-up', 'Arm Circles', 2, '45s', 15, null, 'Relax the neck. Let the shoulders move freely.'],
      ['activation', 'Rotator cuff', 'External Rotation with Band', 3, '12 each side', 25, null, 'Slow reps. Feel the back of the shoulder working.'],
      ['strength', 'Scap control', 'Scapular Pull-Up', 3, '8', 45, null, 'Move the shoulder blades before bending the elbows.'],
      ['strength', 'Rear shoulder', 'Face Pull', 3, '15', 40, null, 'Pull apart and back. Do not arch to fake the range.'],
      ['conditioning', 'Guard finisher', 'Shoulder Press - With Bands', 2, '20', 45, null, 'Smooth volume. Keep the ribs stacked as fatigue builds.'],
    ],
  },
  {
    title: 'Boxing Gas Tank S&C Circuit',
    goal: 'conditioning',
    duration_minutes: 32,
    difficulty: 'intermediate',
    equipment: ['Bodyweight', 'Kettlebells', 'Medicine Ball'],
    summary: 'A boxing-specific conditioning circuit that mixes legs, trunk, shoulders, and repeat bursts without turning into sloppy bootcamp nonsense.',
    items: [
      ['warmup', 'Warm-up', 'Mountain Climbers', 2, '30s', 20, null, 'Light and quick. Wake the hips up before the work starts.'],
      ['circuit', 'Round 1-4', 'One-Arm Kettlebell Swings', 4, '10 each side', 25, null, 'Snap the hips and stay braced.'],
      ['circuit', 'Round 1-4', 'Catch and Overhead Throw', 4, '6', 25, 'Explosive', 'Explode, catch, reset. Quality over panic.'],
      ['circuit', 'Round 1-4', 'Push Up to Side Plank', 4, '6 each side', 25, null, 'Punch the floor away and rotate cleanly.'],
      ['cooldown', 'Cooldown', 'Plank', 2, '45s', 30, null, 'Finish with shape. Ribs down, glutes on, breathe.'],
    ],
  },
  {
    title: 'T-Spine + Hip Recovery Reset',
    goal: 'mobility-recovery',
    duration_minutes: 22,
    difficulty: 'beginner',
    equipment: ['Bodyweight'],
    summary: 'A short recovery session for tight hips, stiff trunk rotation, and cranky shoulders after punching or lifting.',
    items: [
      ['mobility', 'Shoulders', 'Shoulder Circles', 2, '60s', 15, null, 'Move slowly and find the sticky bits.'],
      ['mobility', 'Hips', 'Seated Glute', 2, '60s each side', 15, null, 'Keep the breath slow and steady.'],
      ['core', 'Pelvis reset', 'Dead Bug', 2, '8 each side', 25, null, 'Control the ribs and pelvis. This should feel tidy, not brutal.'],
      ['mobility', 'Rotation', 'Landmine 180\'s', 2, '8 each side', 45, null, 'Easy rotational reps. Let the hips and trunk share the movement.'],
    ],
  },
];

async function profileByEmail(email) {
  const { data, error } = await supabase.from('profiles').select('id,email,first_name,last_name,display_name').eq('email', email).maybeSingle();
  if (error) throw error;
  return data;
}

async function ensureClawProfile() {
  const existing = await profileByEmail(CLAW_EMAIL);
  if (existing?.id) return existing;

  const { data: users, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw listError;
  let user = users.users.find((candidate) => candidate.email === CLAW_EMAIL);

  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: CLAW_EMAIL,
      email_confirm: true,
      user_metadata: { first_name: 'Open', last_name: 'Claw', full_name: 'Open Claw', name: 'Open Claw' },
    });
    if (error) throw error;
    user = data.user;
  }

  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    email: CLAW_EMAIL,
    first_name: 'Open',
    last_name: 'Claw',
    display_name: 'Open Claw',
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });
  if (error) throw error;
  return profileByEmail(CLAW_EMAIL);
}

async function loadExerciseMap() {
  const titles = [...new Set(workouts.flatMap((workout) => workout.items.map((item) => item[2])))];
  const { data, error } = await supabase.from('exercises').select('id,title').in('title', titles).eq('is_active', true);
  if (error) throw error;
  const map = new Map((data || []).map((exercise) => [exercise.title, exercise.id]));
  const missing = titles.filter((title) => !map.has(title));
  if (missing.length) throw new Error(`Missing exercises: ${missing.join(', ')}`);
  return map;
}

async function clearWorkouts(userIds) {
  const { data: existing, error: lookupError } = await supabase.from('workouts').select('id,user_id,title').in('user_id', userIds);
  if (lookupError) throw lookupError;
  const ids = (existing || []).map((workout) => workout.id);
  if (!ids.length) return { deleted: 0 };

  const { error: itemError } = await supabase.from('workout_items').delete().in('workout_id', ids);
  if (itemError) throw itemError;
  const { error: workoutError } = await supabase.from('workouts').delete().in('id', ids);
  if (workoutError) throw workoutError;
  return { deleted: ids.length };
}

async function insertWorkout(userId, exerciseMap, plan, index) {
  const { data: workout, error } = await supabase.from('workouts').insert({
    user_id: userId,
    title: plan.title,
    goal: plan.goal,
    duration_minutes: plan.duration_minutes,
    difficulty: plan.difficulty,
    equipment: plan.equipment,
    visibility: 'community',
    intake_summary: plan.summary,
    ai_model: 'openclaw-boxing-snc-seed-v2',
    created_at: new Date(Date.now() - (workouts.length - index) * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  }).select('id,title').single();
  if (error) throw error;

  const rows = plan.items.map((item, itemIndex) => ({
    workout_id: workout.id,
    exercise_id: exerciseMap.get(item[2]),
    order_index: itemIndex,
    block_type: item[0],
    block_title: item[1],
    sets: item[3],
    reps: item[4],
    rest_seconds: item[5],
    tempo: item[6],
    coaching_note: item[7],
  }));
  const { error: itemError } = await supabase.from('workout_items').insert(rows);
  if (itemError) throw itemError;
  return workout;
}

(async () => {
  const [jordan, claw] = await Promise.all([profileByEmail(JORDAN_EMAIL), ensureClawProfile()]);
  if (!jordan?.id) throw new Error(`Could not find Jordan profile: ${JORDAN_EMAIL}`);
  if (!claw?.id) throw new Error(`Could not find OpenClaw profile: ${CLAW_EMAIL}`);

  const userIds = [jordan.id, claw.id];
  const cleared = await clearWorkouts(userIds);
  const exerciseMap = await loadExerciseMap();
  const created = [];
  for (let index = 0; index < workouts.length; index += 1) {
    created.push(await insertWorkout(claw.id, exerciseMap, workouts[index], index));
  }

  console.log(JSON.stringify({
    cleared,
    users: { jordan: jordan.id, openClaw: claw.id },
    created: created.map((workout) => ({ id: workout.id, title: workout.title })),
  }, null, 2));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});

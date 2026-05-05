-- Boxing-specific S&C metadata for the workout builder.
-- Safe to run repeatedly. Adds columns only, no destructive changes.

alter table public.exercises
  add column if not exists boxing_snc_roles text[] not null default '{}',
  add column if not exists boxing_snc_adaptations text[] not null default '{}',
  add column if not exists boxing_snc_movement_families text[] not null default '{}',
  add column if not exists boxing_snc_body_regions text[] not null default '{}',
  add column if not exists boxing_snc_equipment_fit jsonb not null default '{}'::jsonb,
  add column if not exists boxing_snc_scores jsonb not null default '{}'::jsonb,
  add column if not exists boxing_snc_prescription jsonb not null default '{}'::jsonb,
  add column if not exists boxing_snc_notes text,
  add column if not exists boxing_snc_version text,
  add column if not exists boxing_snc_model text,
  add column if not exists boxing_snc_enriched_at timestamptz;

create index if not exists exercises_boxing_snc_roles_gin_idx on public.exercises using gin (boxing_snc_roles);
create index if not exists exercises_boxing_snc_adaptations_gin_idx on public.exercises using gin (boxing_snc_adaptations);
create index if not exists exercises_boxing_snc_movement_families_gin_idx on public.exercises using gin (boxing_snc_movement_families);
create index if not exists exercises_boxing_snc_body_regions_gin_idx on public.exercises using gin (boxing_snc_body_regions);
create index if not exists exercises_boxing_snc_scores_gin_idx on public.exercises using gin (boxing_snc_scores jsonb_path_ops);

comment on column public.exercises.boxing_snc_roles is 'Workout-builder roles: warmup_prep, activation, primary_strength, power, accessory_strength, conditioning, core, mobility, rehab_prehab, finisher.';
comment on column public.exercises.boxing_snc_adaptations is 'Boxing S&C adaptations served by the exercise: trunk_stiffness, rotational_power, anti_rotation, shoulder_durability, hip_drive, leg_strength, footwork_elasticity, repeat_power, aerobic_support, mobility_restore, etc.';
comment on column public.exercises.boxing_snc_movement_families is 'Cleaner movement taxonomy for retrieval: squat, hinge, lunge, push, pull, carry, rotation, anti_rotation, anti_extension, flexion, lateral_flexion, gait, jump, calf_ankle, shoulder_prehab, mobility.';
comment on column public.exercises.boxing_snc_body_regions is 'Useful target regions: trunk, abs, obliques, shoulders, scapula, chest, upper_back, lats, arms, hips, glutes, quads, hamstrings, calves, ankles, neck.';
comment on column public.exercises.boxing_snc_scores is '0-100 scoring JSON for boxing_transfer, target_fit, strength, power, conditioning, trunk, shoulder_health, footwork, mobility, fatigue_cost, injury_risk, setup_cost, technical_complexity, beginner_fit.';
comment on column public.exercises.boxing_snc_prescription is 'Suggested loading/use JSON: best_block_types, default_sets, default_reps, default_duration_seconds, default_rest_seconds, tempo, coaching_cue.';

-- Oracle Conditioning MVP schema
-- Run in a fresh Supabase project after review.

create extension if not exists pg_trgm;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

create table if not exists public.member_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tier text not null default 'free',
  source text not null default 'manual',
  active boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.exercises (
  id text primary key,
  name text not null,
  force text,
  level text,
  mechanic text,
  equipment text,
  category text,
  primary_muscles text[] default '{}',
  secondary_muscles text[] default '{}',
  instructions text[] default '{}',
  image_paths text[] default '{}',
  source_equipment text,
  image_urls text[] default '{}',
  movement_patterns text[] default '{}',
  boxing_qualities text[] default '{}',
  source text not null default 'free-exercise-db',
  source_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists exercises_name_trgm_idx on public.exercises using gin (name gin_trgm_ops);
create index if not exists exercises_equipment_idx on public.exercises (equipment);
create index if not exists exercises_category_idx on public.exercises (category);
create index if not exists exercises_primary_muscles_idx on public.exercises using gin (primary_muscles);
create index if not exists exercises_secondary_muscles_idx on public.exercises using gin (secondary_muscles);
create index if not exists exercises_image_urls_idx on public.exercises using gin (image_urls);
create index if not exists exercises_movement_patterns_idx on public.exercises using gin (movement_patterns);
create index if not exists exercises_boxing_qualities_idx on public.exercises using gin (boxing_qualities);

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  goal text,
  duration_minutes int,
  difficulty text,
  equipment text[] default '{}',
  visibility text not null default 'private' check (visibility in ('private','community')),
  intake_summary text,
  ai_model text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists workouts_user_id_idx on public.workouts (user_id);
create index if not exists workouts_visibility_created_idx on public.workouts (visibility, created_at desc);

create table if not exists public.workout_items (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  exercise_id text references public.exercises(id),
  order_index int not null,
  block_type text not null,
  block_title text,
  sets int,
  reps text,
  duration_seconds int,
  rest_seconds int,
  tempo text,
  coaching_note text,
  created_at timestamptz default now()
);

create index if not exists workout_items_workout_order_idx on public.workout_items (workout_id, order_index);

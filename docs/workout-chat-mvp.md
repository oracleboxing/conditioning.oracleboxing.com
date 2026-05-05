# AI Workout Chat MVP

Route: `/app/create`
API: `POST /api/chat/workout`

The chat collects the minimum viable brief:

- goal
- equipment
- time
- level
- injuries or constraints
- boxing focus

The API asks for only one or two missing answers at a time. Once the brief is complete, it searches `/api/exercises/search` server-side via `searchExercises`, gives the model only validated Supabase exercise candidates, validates selected exercise IDs again, then attempts to save.

If `workouts` / `workout_items` are missing, the UI degrades to preview-only and the API returns a `preview_only` persistence status.

## Safe migration SQL

Review before running in Supabase. This only creates tables and indexes if missing.

```sql
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

create index if not exists workouts_user_id_idx on public.workouts(user_id);
create index if not exists workouts_visibility_created_idx on public.workouts(visibility, created_at desc);

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

create index if not exists workout_items_workout_order_idx on public.workout_items(workout_id, order_index);

alter table public.workouts enable row level security;
alter table public.workout_items enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'workouts' and policyname = 'Users can read own workouts') then
    create policy "Users can read own workouts"
      on public.workouts for select
      using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'workouts' and policyname = 'Users can insert own workouts') then
    create policy "Users can insert own workouts"
      on public.workouts for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'workout_items' and policyname = 'Users can read own workout items') then
    create policy "Users can read own workout items"
      on public.workout_items for select
      using (
        exists (
          select 1 from public.workouts
          where workouts.id = workout_items.workout_id
          and workouts.user_id = auth.uid()
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'workout_items' and policyname = 'Users can insert own workout items') then
    create policy "Users can insert own workout items"
      on public.workout_items for insert
      with check (
        exists (
          select 1 from public.workouts
          where workouts.id = workout_items.workout_id
          and workouts.user_id = auth.uid()
        )
      );
  end if;
end $$;
```

Server-side saving currently uses the service role client, so RLS is not required for the MVP API path, but the policies are included for future direct client reads.

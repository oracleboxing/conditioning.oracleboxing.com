# Community gallery SQL notes

The `/app/community` gallery reads from `public.workouts` where `visibility = 'community'` and optionally counts related `public.workout_items`.

If those tables are missing or empty, the route uses typed mock workouts so the UI can be reviewed before the workout generator is wired in.

## Minimum table shape

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

create table if not exists public.workout_items (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  exercise_id uuid references public.exercises(id),
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

create index if not exists workouts_visibility_created_idx on public.workouts (visibility, created_at desc);
create index if not exists workout_items_workout_order_idx on public.workout_items (workout_id, order_index);
```

## Visibility model

- `private`, default. Only the owner should be able to read and edit it.
- `community`, opt-in shared workout. Authenticated premium members can browse it in the gallery.
- Future layer: add `featured boolean default false` or `review_status text` for coach-approved templates.

## Suggested RLS policies

```sql
alter table public.workouts enable row level security;
alter table public.workout_items enable row level security;

create policy "workouts owner can read private and own shared"
  on public.workouts for select
  using (auth.uid() = user_id);

create policy "members can read community workouts"
  on public.workouts for select
  using (visibility = 'community');

create policy "owners can insert workouts"
  on public.workouts for insert
  with check (auth.uid() = user_id);

create policy "owners can update workouts"
  on public.workouts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "items visible when parent workout visible"
  on public.workout_items for select
  using (
    exists (
      select 1
      from public.workouts w
      where w.id = workout_items.workout_id
        and (w.user_id = auth.uid() or w.visibility = 'community')
    )
  );
```

Tighten the community read policy to paid members later by joining `member_access` once the app-level premium access model is final.

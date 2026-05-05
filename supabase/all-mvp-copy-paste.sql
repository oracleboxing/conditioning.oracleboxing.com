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
  coaching_cues text[] default '{}',
  boxing_relevance text,
  created_at timestamptz default now()
);

alter table public.workout_items
  alter column exercise_id type uuid using exercise_id::uuid;

alter table public.workout_items
  add column if not exists coaching_cues text[] default '{}',
  add column if not exists boxing_relevance text;

create index if not exists workouts_user_id_idx on public.workouts(user_id);
create index if not exists workouts_visibility_created_idx on public.workouts(visibility, created_at desc);
create index if not exists workout_items_workout_order_idx on public.workout_items(workout_id, order_index);
create index if not exists workout_items_block_order_idx on public.workout_items(workout_id, block_type, order_index);

alter table public.workouts enable row level security;
alter table public.workout_items enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'workouts' and policyname = 'Users can read own workouts') then
    create policy "Users can read own workouts"
      on public.workouts for select
      using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'workouts' and policyname = 'Members can read community workouts') then
    create policy "Members can read community workouts"
      on public.workouts for select
      using (visibility = 'community');
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'workouts' and policyname = 'Users can insert own workouts') then
    create policy "Users can insert own workouts"
      on public.workouts for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'workouts' and policyname = 'Users can update own workouts') then
    create policy "Users can update own workouts"
      on public.workouts for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'workout_items' and policyname = 'Workout items follow workout visibility') then
    create policy "Workout items follow workout visibility"
      on public.workout_items for select
      using (
        exists (
          select 1
          from public.workouts w
          where w.id = workout_items.workout_id
            and (w.user_id = auth.uid() or w.visibility = 'community')
        )
      );
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'workout_items' and policyname = 'Users can insert own workout items') then
    create policy "Users can insert own workout items"
      on public.workout_items for insert
      with check (
        exists (
          select 1
          from public.workouts w
          where w.id = workout_items.workout_id
            and w.user_id = auth.uid()
        )
      );
  end if;
end $$;


create table if not exists public.workout_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workout_id uuid references public.workouts(id) on delete set null,
  title text,
  status text not null default 'active' check (status in ('active','completed','archived')),
  intake_summary jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.workout_chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_chat_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists workout_chat_sessions_user_created_idx
  on public.workout_chat_sessions(user_id, created_at desc);

create index if not exists workout_chat_sessions_workout_idx
  on public.workout_chat_sessions(workout_id);

create index if not exists workout_chat_messages_session_created_idx
  on public.workout_chat_messages(session_id, created_at asc);

alter table public.workout_chat_sessions enable row level security;
alter table public.workout_chat_messages enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'workout_chat_sessions' and policyname = 'Users can read own workout chat sessions') then
    create policy "Users can read own workout chat sessions"
      on public.workout_chat_sessions for select
      using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'workout_chat_sessions' and policyname = 'Users can insert own workout chat sessions') then
    create policy "Users can insert own workout chat sessions"
      on public.workout_chat_sessions for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'workout_chat_sessions' and policyname = 'Users can update own workout chat sessions') then
    create policy "Users can update own workout chat sessions"
      on public.workout_chat_sessions for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'workout_chat_messages' and policyname = 'Users can read own workout chat messages') then
    create policy "Users can read own workout chat messages"
      on public.workout_chat_messages for select
      using (auth.uid() = user_id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'workout_chat_messages' and policyname = 'Users can insert own workout chat messages') then
    create policy "Users can insert own workout chat messages"
      on public.workout_chat_messages for insert
      with check (
        auth.uid() = user_id
        and exists (
          select 1
          from public.workout_chat_sessions s
          where s.id = workout_chat_messages.session_id
            and s.user_id = auth.uid()
        )
      );
  end if;
end $$;

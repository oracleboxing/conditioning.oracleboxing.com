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

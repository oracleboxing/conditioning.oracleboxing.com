create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  display_name text,
  avatar_url text,
  created_at timestamptz default now()
);

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists updated_at timestamptz default now();

alter table public.profiles enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Users can read own profile') then
    create policy "Users can read own profile"
      on public.profiles for select
      using (auth.uid() = id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Users can insert own profile') then
    create policy "Users can insert own profile"
      on public.profiles for insert
      with check (auth.uid() = id);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'profiles' and policyname = 'Users can update own profile') then
    create policy "Users can update own profile"
      on public.profiles for update
      using (auth.uid() = id)
      with check (auth.uid() = id);
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-images',
  'profile-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Profile images are publicly readable') then
    create policy "Profile images are publicly readable"
      on storage.objects for select
      using (bucket_id = 'profile-images');
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Users can upload own profile images') then
    create policy "Users can upload own profile images"
      on storage.objects for insert
      with check (bucket_id = 'profile-images' and auth.uid()::text = (storage.foldername(name))[1]);
  end if;

  if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Users can update own profile images') then
    create policy "Users can update own profile images"
      on storage.objects for update
      using (bucket_id = 'profile-images' and auth.uid()::text = (storage.foldername(name))[1])
      with check (bucket_id = 'profile-images' and auth.uid()::text = (storage.foldername(name))[1]);
  end if;
end $$;

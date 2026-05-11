-- ============================================================
-- FurnishAI Auth Schema
-- Run this in the Supabase SQL Editor (project > SQL Editor)
-- ============================================================

-- 1. Profiles table (mirrors auth.users, adds role)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  role        text not null default 'user' check (role in ('user', 'vendor', 'admin')),
  full_name   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2. Trigger: auto-create profile on new user signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_app_meta_data->>'role', 'user')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. Row Level Security
alter table public.profiles enable row level security;

-- Users can read their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can update their own non-role fields
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));

-- Admins can read all profiles
create policy "Admins can view all profiles"
  on public.profiles for select
  using (
    (select raw_app_meta_data->>'role' from auth.users where id = auth.uid()) = 'admin'
  );

-- 4. Helper function: set a user's role (call from service-role only, e.g. admin panel)
-- Usage: select set_user_role('<user-id>', 'vendor');
create or replace function public.set_user_role(target_user_id uuid, new_role text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if new_role not in ('user', 'vendor', 'admin') then
    raise exception 'Invalid role: %', new_role;
  end if;

  -- Update profiles table
  update public.profiles set role = new_role, updated_at = now()
  where id = target_user_id;

  -- Mirror into app_metadata so middleware JWT claims are consistent
  update auth.users
  set raw_app_meta_data = raw_app_meta_data || jsonb_build_object('role', new_role)
  where id = target_user_id;
end;
$$;

-- ============================================================
-- NOTES
-- • After running this, go to Authentication > Providers in the
--   Supabase dashboard and confirm Email is enabled.
-- • Set Site URL to: http://localhost:3000
-- • Add redirect URL:  http://localhost:3000/auth/callback
-- • Email confirmations can be disabled for local dev in
--   Authentication > Settings > "Confirm email" toggle.
-- ============================================================

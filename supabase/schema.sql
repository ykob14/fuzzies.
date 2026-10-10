-- Fuzzies cloud database (Supabase / Postgres).
-- Run this once in the Supabase dashboard → SQL Editor → New query → Run. Safe to run again.
--
-- One row per profile, design and uploaded photo. Row-level security means every
-- signed-in person can only read and write their own rows.

-- ---------- profiles: the account (name, avatar, Fuzzies, unlocks, settings…) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_.]{3,20}$'),
  data jsonb not null default '{}'::jsonb,
  updated_at bigint not null default 0 -- ms since 1970, set by the app (last write wins)
);

-- ---------- designs ----------
create table if not exists public.designs (
  id text primary key,
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data jsonb, -- null once deleted
  deleted boolean not null default false,
  updated_at bigint not null
);
create index if not exists designs_owner_idx on public.designs (owner, updated_at);

-- ---------- uploaded photos ----------
create table if not exists public.uploads (
  id text primary key,
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data jsonb,
  deleted boolean not null default false,
  updated_at bigint not null
);
create index if not exists uploads_owner_idx on public.uploads (owner, updated_at);

-- ---------- privacy: only your own rows ----------
alter table public.profiles enable row level security;
alter table public.designs enable row level security;
alter table public.uploads enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "own designs" on public.designs;
create policy "own designs" on public.designs for all to authenticated
  using (owner = (select auth.uid())) with check (owner = (select auth.uid()));

drop policy if exists "own uploads" on public.uploads;
create policy "own uploads" on public.uploads for all to authenticated
  using (owner = (select auth.uid())) with check (owner = (select auth.uid()));

-- ---------- helpers the app calls ----------
-- Is this username still free? (Only answers yes/no; never reveals who has it.)
create or replace function public.username_available(name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.profiles where username = lower(name));
$$;
revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

-- "Delete my account": removes the login and, through the cascades, every profile/design/upload row.
create or replace function public.delete_my_account()
returns void language sql security definer set search_path = '' as $$
  delete from auth.users where id = auth.uid();
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

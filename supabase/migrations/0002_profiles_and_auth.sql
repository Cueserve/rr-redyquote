-- ============================================================================
-- 0002: profiles, auth integration, is_admin(), and profiles RLS
--
-- Transcribed from docs/DATABASE-SQL.md §1 (block "0002") and §3 (profiles
-- policies), plus the role-escalation guard specified in §4.2.
--
-- Deviation from the doc's suggested split: RLS is enabled and policied in the
-- same migration that creates the table, not in a later 0006_rls_policies.
-- A table must never exist on a hosted project with RLS off, even briefly.
-- ============================================================================

create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  role        user_role not null default 'rep',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on profiles
  for each row execute function set_updated_at();

-- Auto-provision a profile on first sign-in (PRD-002)
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'rep');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- is_admin() helper -- SECURITY DEFINER so RLS policies on `profiles` itself
-- don't recurse when they call it.
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ----------------------------------------------------------------------------
-- Role-escalation guard (DATABASE-SQL §4.2)
--
-- profiles_update_self_or_admin below lets a user update their own row, and RLS
-- cannot express "this one column may only change if X". Without this trigger,
-- every RLS-enforced admin-only write in the schema is one self-update away
-- from any authenticated rep (PRD-019, NFR-002).
--
-- The `auth.uid() is not null` clause is a deliberate carve-out, NOT verbatim
-- from §4.2: auth.uid() is NULL only in a superuser / migration / service-role
-- context, and ARCHITECTURE §1 states no service-role key exists anywhere in
-- the app. Without the carve-out there is no way to create the FIRST admin --
-- handle_new_user() always writes 'rep', and a dashboard SQL promotion runs as
-- `postgres` with a NULL auth.uid(), so the trigger would reject it and the
-- schema could never have an admin at all. An unauthenticated request cannot
-- reach this path: every profiles policy is `to authenticated`, so RLS rejects
-- an `anon` UPDATE before the trigger ever fires.
-- ----------------------------------------------------------------------------
create or replace function enforce_profile_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not is_admin() then
    raise exception 'Only an admin may change a profile role';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role_change
  before update on profiles
  for each row execute function enforce_profile_role_change();

-- ----------------------------------------------------------------- profiles RLS
alter table profiles enable row level security;

create policy "profiles_select_authenticated"
  on profiles for select
  to authenticated
  using (true);

create policy "profiles_update_self_or_admin"
  on profiles for update
  to authenticated
  using (id = auth.uid() or is_admin())
  with check (id = auth.uid() or is_admin());
-- Role changes through this policy are additionally gated by
-- profiles_guard_role_change above.

-- no INSERT policy: profiles are created only by handle_new_user() (SECURITY DEFINER)
-- no DELETE policy: profiles are never deleted by the app

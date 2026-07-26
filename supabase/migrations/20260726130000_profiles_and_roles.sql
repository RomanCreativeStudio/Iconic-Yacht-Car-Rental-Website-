-- ============================================================================
-- Profiles & roles
--
-- Foundation for role-gated access to the new content tables added in this
-- phase (fleet_items, fleet_media, experiences, experience_media). This is
-- new — booking_requests' existing RLS (any authenticated user can view/
-- update inquiries, per supabase/schema.sql) is untouched by this migration
-- and keeps working exactly as documented in CLIENT_SETUP.md.
--
-- One row per Supabase Auth user. New signups aren't possible on this
-- project (auth.enable_signup = false, per CLIENT_SETUP.md's "Admin
-- Dashboard Access" section — accounts are created by hand in the
-- dashboard), so every profile row corresponds to a real staff member.
-- ============================================================================

create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'staff' check (role in ('admin', 'staff')),
  full_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table profiles is 'One row per Supabase Auth (admin dashboard) user, holding their role. Not used by booking_requests access, which remains "any authenticated user" as before.';
comment on column profiles.role is '''admin'' has full CRUD on the new content tables (fleet_items, fleet_media, experiences, experience_media). ''staff'' (the default for anyone new) reads published content only, same as the public site, until promoted.';

-- ----------------------------------------------------------------------------
-- Shared trigger: keep `updated_at` current on any row update. Reused by
-- every table in this phase that has an `updated_at` column.
-- ----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on profiles;
create trigger profiles_set_updated_at
  before update on profiles
  for each row
  execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Auto-provision a profile row whenever a new Supabase Auth user is
-- created (i.e. whenever the site owner adds a staff account from the
-- dashboard, per CLIENT_SETUP.md). Defaults to 'staff' — promote to
-- 'admin' with a one-off SQL Editor statement:
--   update public.profiles set role = 'admin' where id = '<user-id>';
-- ----------------------------------------------------------------------------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function handle_new_user();

-- Backfill: any staff account created before this migration existed
-- (i.e. before profiles/roles existed at all) is granted 'admin' rather
-- than the 'staff' default — under the current model every authenticated
-- user already has full access to everything that exists today
-- (booking_requests), so this preserves that same level of access for
-- whatever new content tables this phase adds, for whoever already had a
-- login. Accounts created after this point default to 'staff' instead.
insert into profiles (id, role)
select id, 'admin' from auth.users
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- is_admin(): the single check every new RLS policy below uses. Marked
-- security definer so it can read `profiles` regardless of that table's
-- own RLS (see policies below — profiles intentionally has no broad
-- authenticated-read policy).
-- ----------------------------------------------------------------------------
create or replace function is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

comment on function is_admin is 'True if the current auth.uid() has role = admin in profiles. Used by every RLS policy added in Phase 6.1 for full-CRUD gating.';

-- ----------------------------------------------------------------------------
-- Row Level Security on profiles itself
--
-- No policy grants blanket access to this table on purpose — it's not
-- meant to be queried directly by client code (there's no admin UI for
-- managing staff/roles yet; that's out of scope for this phase, per the
-- "do not build the admin dashboard yet" instruction). A signed-in user
-- can see their own row (useful for a future "what can I do" check); admins
-- can see everyone's. Nobody can write to this table through the API —
-- role changes are a deliberate, manual SQL Editor action, not a
-- self-service one.
-- ----------------------------------------------------------------------------
alter table profiles enable row level security;

drop policy if exists "Users can view their own profile" on profiles;
create policy "Users can view their own profile"
  on profiles
  for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "Admins can view every profile" on profiles;
create policy "Admins can view every profile"
  on profiles
  for select
  to authenticated
  using (is_admin());

-- No insert/update/delete policy for any role: rows are only ever written
-- by the handle_new_user() trigger (security definer) or by hand in the
-- SQL Editor.

-- Phase 6.10: Team management without the SQL Editor.
--
-- profiles has no UPDATE policy at all today — promoting/demoting a
-- team member's role requires opening Supabase's SQL Editor and running
-- raw SQL by hand (see CLIENT_SETUP.md, "Creating another admin or
-- staff account"). A blanket "admins can update any profile" RLS policy
-- would work but would let an admin edit any column blindly (including
-- id) with no validation. These three SECURITY DEFINER functions follow
-- the exact pattern already established by is_admin()/get_storage_usage()
-- instead: gated by is_admin(), narrowly scoped to exactly the operation
-- an admin should be able to do, with real validation.
--
-- list_team_members() also solves a problem no client-side RLS policy
-- could solve at all: auth.users (where email actually lives — profiles
-- has no email column) isn't exposed via PostgREST to anon/authenticated
-- roles. A SECURITY DEFINER function running with elevated privilege can
-- read it directly and join it against profiles.

create or replace function public.list_team_members()
returns table(id uuid, email text, role text, full_name text, created_at timestamptz)
language plpgsql
stable security definer
set search_path to 'public'
as $$
begin
  if not is_admin() then
    raise exception 'Only admins can view team members.';
  end if;

  return query
    select p.id, u.email::text, p.role, p.full_name, p.created_at
    from public.profiles p
    join auth.users u on u.id = p.id
    order by p.created_at asc;
end;
$$;

create or replace function public.update_user_role(target_id uuid, new_role text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not is_admin() then
    raise exception 'Only admins can change roles.';
  end if;
  if new_role not in ('admin', 'staff', 'read_only') then
    raise exception 'Invalid role: %', new_role;
  end if;
  if target_id = auth.uid() then
    raise exception 'You cannot change your own role — ask another admin, or use the SQL Editor if you are the only one.';
  end if;

  update public.profiles set role = new_role, updated_at = now() where id = target_id;
end;
$$;

-- Revokes dashboard access by deleting the profiles row, without
-- deleting the underlying Auth user (that step — full account removal —
-- still requires Supabase Dashboard > Authentication > Users, since
-- deleting an Auth user needs the GoTrue Admin API, not something a
-- SECURITY DEFINER SQL function can do). auth-guard.js's
-- hasDashboardAccess(null) already denies access to anyone with no
-- matching profiles row, so this alone is enough to lock someone out.
create or replace function public.remove_team_member(target_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if not is_admin() then
    raise exception 'Only admins can remove team members.';
  end if;
  if target_id = auth.uid() then
    raise exception 'You cannot remove your own access.';
  end if;

  delete from public.profiles where id = target_id;
end;
$$;

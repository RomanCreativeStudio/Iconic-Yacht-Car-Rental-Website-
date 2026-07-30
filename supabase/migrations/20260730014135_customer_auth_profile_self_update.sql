-- Customer Auth Integration — let a signed-in user update their own full_name
--
-- profiles had zero UPDATE policies before this (Phase 6.10 deliberately
-- routed all role changes through update_user_role(), a SECURITY DEFINER
-- function, specifically so there was no direct client write path to this
-- table). account.html needs customers to be able to edit their own
-- display name, which is a genuinely different, much narrower need — not
-- a reason to open the table up generally.
--
-- Table-level UPDATE is already GRANTed broadly to `authenticated` by
-- Supabase's default schema setup (this project's RLS-is-the-real-boundary
-- model has always relied on that, same as every other table here) — so
-- adding an RLS policy alone would let a signed-in user update *any*
-- column on their own row, including role, since RLS restricts rows, not
-- columns. Revoking the broad grant and re-granting only the full_name
-- column closes that off at the privilege level, not just the row level:
-- even a hand-crafted API request trying to also set role on this same
-- request is rejected by Postgres before RLS is ever evaluated. Verified
-- live: self full_name update succeeds; a role change (alone or combined
-- with a full_name change in the same statement) is rejected with
-- "permission denied for table profiles"; updating another user's row is
-- silently filtered to zero rows by the row-level check.
--
-- update_user_role()/remove_team_member()/list_team_members() are
-- SECURITY DEFINER and run as their owner, not as `authenticated` — this
-- revoke has no effect on them; Team Manager's role-change flow is
-- unchanged.
revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;

create policy "Users can update their own full name"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

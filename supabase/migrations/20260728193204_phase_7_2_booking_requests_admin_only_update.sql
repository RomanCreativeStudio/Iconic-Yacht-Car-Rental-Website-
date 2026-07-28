-- Phase 7.2 — align booking_requests UPDATE RLS with actual app behavior
--
-- admin/dashboard.js only ever shows the status-update control to an
-- 'admin'-role session (`canWrite = result.role === 'admin'`), but the
-- existing "Staff can update inquiry status" policy granted UPDATE to
-- ANY authenticated user regardless of role (`USING (true) WITH CHECK
-- (true)`) — a 'staff' or 'read_only' session could bypass the UI
-- restriction entirely via a direct REST call with their own valid
-- session token, since RLS (not the hidden button) is this app's actual
-- security boundary everywhere else. This brings booking_requests in
-- line with every other write policy in the schema (fleet_items,
-- experiences, clientele_endorsements, instagram_posts/reels, etc. all
-- gate writes on is_admin()) and with the app's own real behavior.
-- SELECT stays unrestricted for any authenticated role — that already
-- matches admin/dashboard.js showing the inquiry list to all three
-- roles, view-only for staff/read_only.
drop policy "Staff can update inquiry status" on public.booking_requests;

create policy "Admins can update inquiry status"
on public.booking_requests for update
to authenticated
using (is_admin())
with check (is_admin());

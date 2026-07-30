-- Customer booking ownership model
--
-- booking_requests had no column linking a submitted inquiry to a
-- signed-in customer account (flagged as a known gap when customer auth
-- shipped — see CLIENT_SETUP.md's "Customer Accounts" section). This
-- adds that link and the RLS needed for a customer to see only their own
-- bookings, without touching admin/staff/read_only's existing access.

-- 1. The ownership column. DEFAULT auth.uid() means a client doesn't need
-- to include this in its insert payload at all — as long as the request
-- carries the submitting customer's own access token (not the anon key),
-- Postgres fills it in automatically from their JWT. An anonymous
-- request (anon key, no JWT sub claim) naturally gets NULL here, exactly
-- matching today's "no owner" bookings.
alter table public.booking_requests
  add column customer_user_id uuid references auth.users(id) default auth.uid();

create index booking_requests_customer_user_id_idx
  on public.booking_requests (customer_user_id);

-- 2. Small reusable helper, same shape as the existing is_admin() —
-- "is this session one of the three staff-facing roles" (unchanged
-- meaning from CLIENT_SETUP.md's role model), used below to make sure
-- the *existing* staff-viewing policy explicitly excludes the new
-- 'customer' role rather than accidentally continuing to include it.
create or replace function public.is_staff_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('admin', 'staff', 'read_only')
  );
$$;

-- 3. Tighten the existing "Staff can view inquiries" policy. It was
-- `USING (true)` for any authenticated session — correct before a
-- 'customer' role could ever sign in, but it would otherwise let any
-- customer read every other customer's booking via this same policy no
-- matter what new customer-scoped policy gets added alongside it (RLS
-- policies are OR'd together — a broader policy makes a narrower one
-- alongside it redundant, not additive). Behavior for admin/staff/
-- read_only is unchanged; only 'customer' sessions are newly excluded.
drop policy "Staff can view inquiries" on public.booking_requests;

create policy "Staff can view inquiries"
on public.booking_requests for select
to authenticated
using (is_staff_or_admin());

-- 4. A customer can see only their own rows.
create policy "Customers can view their own bookings"
on public.booking_requests for select
to authenticated
using (customer_user_id = auth.uid());

-- 5. A signed-in customer currently has no INSERT policy at all (only
-- `anon` could submit) — needed so a customer submitting the booking
-- form with their own session (required for auth.uid() to resolve to
-- them at all) can still save a booking, same as before. WITH CHECK
-- blocks setting someone else's id; DEFAULT above already makes that the
-- normal case regardless.
create policy "Authenticated customers can submit inquiries"
on public.booking_requests for insert
to authenticated
with check (customer_user_id = auth.uid() or customer_user_id is null);

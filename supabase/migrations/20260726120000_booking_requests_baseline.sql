-- ============================================================================
-- Baseline migration — booking_requests
--
-- This is a direct, unmodified capture of supabase/schema.sql (the table
-- design already documented in CLIENT_SETUP.md and already shipped in
-- js/booking-api.js / admin/dashboard.js) as the first entry in a proper,
-- CLI-managed migration history. No columns, policies, or behavior change
-- from what schema.sql already describes — this file just gives future
-- changes (Phase 6.0 Part 2 onward) a `supabase db push`-able foundation
-- to layer on top of, instead of every change being a hand-pasted SQL
-- Editor script.
--
-- If schema.sql has already been run by hand against this project (via
-- the dashboard's SQL Editor, per CLIENT_SETUP.md's original
-- instructions), this migration is safe to apply anyway — every
-- statement is idempotent (IF NOT EXISTS / OR REPLACE / DROP POLICY IF
-- EXISTS), matching schema.sql's own guarantee.
-- ============================================================================

create table if not exists booking_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  phone text not null,
  rental_type text not null check (rental_type in ('Yacht Rental', 'Car Rental', 'Not sure yet')),
  fleet_item text,
  date date,
  time time,
  duration text,
  guests integer,
  message text,
  status text not null default 'New' check (status in ('New', 'Contacted', 'Confirmed', 'Completed', 'Cancelled')),
  source text not null default 'full_form' check (source in ('full_form', 'quick_form'))
);

comment on table booking_requests is 'Reservation inquiries submitted from the public booking form and Quick Book modal.';

create index if not exists booking_requests_created_at_idx on booking_requests (created_at desc);
create index if not exists booking_requests_status_idx on booking_requests (status);

alter table booking_requests enable row level security;

drop policy if exists "Anonymous can submit inquiries" on booking_requests;
create policy "Anonymous can submit inquiries"
  on booking_requests
  for insert
  to anon
  with check (true);

drop policy if exists "Staff can view inquiries" on booking_requests;
create policy "Staff can view inquiries"
  on booking_requests
  for select
  to authenticated
  using (true);

drop policy if exists "Staff can update inquiry status" on booking_requests;
create policy "Staff can update inquiry status"
  on booking_requests
  for update
  to authenticated
  using (true)
  with check (true);

-- No delete policy is created on purpose — see supabase/schema.sql's
-- comment on this same point.

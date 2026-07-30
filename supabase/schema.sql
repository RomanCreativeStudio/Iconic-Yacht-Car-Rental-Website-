-- ============================================================================
-- Iconic Rentals — Booking Requests Schema
--
-- Run this once in your Supabase project's SQL Editor (Dashboard > SQL
-- Editor > New query > paste this whole file > Run). See CLIENT_SETUP.md,
-- "Database Setup" for the full walkthrough.
--
-- Safe to re-run: every statement below is idempotent (IF NOT EXISTS /
-- OR REPLACE), so running this twice will not duplicate anything or error.
--
-- As of Phase 6.0, this exact table design also exists as a proper,
-- CLI-managed migration at supabase/migrations/20260726120000_booking_
-- requests_baseline.sql. Both are kept in sync intentionally: this file
-- remains the copy-paste path for a non-technical client who only wants
-- the original booking table, the migration is the path for
-- `supabase db push` and everything layered on top of it since.
--
-- IMPORTANT (Phase 8.0): this file only ever creates booking_requests.
-- Everything else — profiles, fleet_items, experiences, site_content,
-- clientele_endorsements, instagram_posts/reels, activity_log, every RLS
-- policy, and every Storage bucket — now lives exclusively in
-- supabase/migrations/, applied via `supabase db push`. Running this
-- file alone on a fresh project sets up booking_requests but leaves the
-- admin dashboard and every CMS page with nothing to read — see
-- CLIENT_SETUP.md's "Database Setup" section for the current, complete
-- setup path. supabase/SCHEMA_PROPOSAL.md is Phase 6.0/6.1 planning
-- history, not a current reference — everything it proposed has since
-- shipped; see CLIENT_SETUP.md for what the schema actually is today.
-- ============================================================================

-- Status values are constrained at the database level, not just in the UI,
-- so a bad value can never be written even if someone bypasses the app.
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

-- Keep inquiries sorted by recency and filterable by status without a
-- full table scan as the table grows.
create index if not exists booking_requests_created_at_idx on booking_requests (created_at desc);
create index if not exists booking_requests_status_idx on booking_requests (status);

-- ----------------------------------------------------------------------------
-- Row Level Security
--
-- This is the part that actually protects customer data. The anon key used
-- by the public website is, by design, visible to anyone who opens the
-- browser's network tab — RLS, not secrecy, is what keeps this safe:
--   - Anonymous visitors (the public site) may INSERT a new inquiry, and
--     may do nothing else: no reading, updating, or deleting any row,
--     including their own. This is intentional — a booking form has no
--     legitimate reason to read back other customers' inquiries.
--   - Authenticated users (staff logged into the admin dashboard) may
--     SELECT and UPDATE every row, so the team can review and manage
--     inquiries. There is no DELETE policy at all — cancelling a booking
--     should set status = 'Cancelled', not erase the record.
-- ----------------------------------------------------------------------------
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

-- No delete policy is created on purpose — see the comment above.

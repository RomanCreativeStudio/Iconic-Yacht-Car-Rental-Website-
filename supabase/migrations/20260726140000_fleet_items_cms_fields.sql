-- ============================================================================
-- fleet_items — CMS fields (Phase 6.2 Part 2)
--
-- The Fleet Manager needs a few columns fleet_items didn't have yet:
-- featured, availability, and pricing. Everything else the editor exposes
-- (Length, Guests, Cabins, Horsepower, Top Speed, etc.) already lives in
-- the `specs` jsonb column added in Phase 6.1 — deliberately NOT adding
-- fixed columns like "bedrooms"/"bathrooms"/"engines" here, because the
-- real spec fields differ by vehicle type (a yacht has Cabins/Crew/Beam,
-- a car has Horsepower/0-60/Transmission) and forcing them into rigid
-- columns would fit neither well. The Fleet Editor's Specifications
-- section is a dynamic key/value editor over `specs` instead, matching
-- the shape fleet-data.js already uses.
--
-- No pricing values are seeded anywhere by this migration — see
-- supabase/seed.sql, which explicitly leaves starting_price/deposit_
-- amount null for every real vehicle, consistent with the site's stated
-- "pricing available upon request, quoted personally" policy documented
-- in CLIENT_SETUP.md. These columns exist so a real number CAN be
-- entered later; nothing requires that it is.
-- ============================================================================

alter table fleet_items
  add column if not exists featured boolean not null default false,
  add column if not exists available boolean not null default true,
  add column if not exists starting_price numeric(10, 2),
  add column if not exists deposit_amount numeric(10, 2),
  add column if not exists duration_options text[] not null default '{}';

comment on column fleet_items.featured is 'Surfaces this item first in featured groupings. Distinct from `published` (visible at all) — a published item can be featured or not.';
comment on column fleet_items.available is 'Currently bookable. Distinct from `published` (visible at all) — a published item can be temporarily unavailable, e.g. during maintenance, without being unpublished.';
comment on column fleet_items.starting_price is 'Nullable on purpose — no fixed number is fabricated where none exists. Null means "pricing available upon request," matching the site''s existing booking-flow copy.';
comment on column fleet_items.deposit_amount is 'Nullable on purpose, same reasoning as starting_price.';
comment on column fleet_items.duration_options is 'Short labels like ''2 hours'', ''Full day'', ''Multi-day'' — mirrors booking_requests.duration''s free-text values without constraining them to a fixed list.';

create index if not exists fleet_items_featured_idx on fleet_items (featured);
create index if not exists fleet_items_available_idx on fleet_items (available);

-- RLS is unaffected: the existing policies from
-- supabase/migrations/20260726130100_fleet_items.sql apply to these new
-- columns automatically (Postgres RLS is row-level, not column-level) —
-- no new policy statements are needed for this migration.

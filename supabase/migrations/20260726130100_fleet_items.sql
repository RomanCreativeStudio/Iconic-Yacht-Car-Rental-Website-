-- ============================================================================
-- fleet_items
--
-- Table shape for what js/fleet-data.js's FLEET_DATA array currently holds
-- (see supabase/SCHEMA_PROPOSAL.md, section 2, for the full mapping and
-- rationale). This migration only creates the table and its access rules
-- — no rows are migrated from the JS file, and no frontend page reads
-- from this table yet. FLEET_DATA remains the live source of truth for
-- the site until a later, separately-scoped phase switches it over.
-- ============================================================================

create table if not exists fleet_items (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  type text not null check (type in ('yacht', 'car')),
  name text not null,
  category text not null,
  tagline text,
  description text,
  capacity integer,
  specs jsonb not null default '{}'::jsonb,
  features text[] not null default '{}',
  amenities text[] not null default '{}',
  book_label text,
  sort_order integer not null default 0,
  -- Unpublished by default on purpose: this phase creates the table, it
  -- does not go live with any content. See "Public: read published
  -- content only" in the RLS policies below.
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table fleet_items is 'One row per yacht or exotic car. Mirrors js/fleet-data.js''s FLEET_DATA shape; not yet read by any page.';
comment on column fleet_items.specs is 'Free-form label/value pairs, e.g. {"Length": "85 ft", "Guests": "12"} — matches the existing JS ''specs'' object exactly, order-sensitive for display.';
comment on column fleet_items.capacity is 'Guest capacity for yachts, seat count for cars — one nullable column reused per type, matching how the two fields never both apply to the same row today.';

create index if not exists fleet_items_type_idx on fleet_items (type);
create index if not exists fleet_items_published_idx on fleet_items (published);
create index if not exists fleet_items_sort_order_idx on fleet_items (sort_order);

drop trigger if exists fleet_items_set_updated_at on fleet_items;
create trigger fleet_items_set_updated_at
  before update on fleet_items
  for each row
  execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Row Level Security
--   - Public (anon) and any signed-in non-admin: read published rows only.
--   - Admin (profiles.role = 'admin'): full read (including unpublished
--     drafts) and full CRUD.
-- ----------------------------------------------------------------------------
alter table fleet_items enable row level security;

drop policy if exists "Published fleet items are publicly readable" on fleet_items;
create policy "Published fleet items are publicly readable"
  on fleet_items
  for select
  to anon, authenticated
  using (published = true or is_admin());

drop policy if exists "Admins have full access to fleet items" on fleet_items;
create policy "Admins have full access to fleet items"
  on fleet_items
  for all
  to authenticated
  using (is_admin())
  with check (is_admin());

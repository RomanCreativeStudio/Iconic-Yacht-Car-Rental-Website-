-- ============================================================================
-- Phase 6.4 — Content Management CMS: schema extensions
--
-- Everything here is either (a) a genuinely new field a new admin page
-- needs, with no existing column that already covers it, or (b) a new
-- table for content that has no home yet. Nothing here changes what the
-- public site reads — it still reads js/fleet-data.js and the other
-- static *-data.js files unchanged; every table/column added below is
-- staging ground for the admin CMS only, same pattern as fleet_items was
-- before Phase 6.2.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- experiences: sort_order (fleet_items already has this; experiences never
-- did) + archived (distinct from `published` — an archived experience was
-- live once and is being retired, not a draft that was never published).
-- ----------------------------------------------------------------------------
alter table experiences
  add column if not exists sort_order integer not null default 0,
  add column if not exists archived boolean not null default false;

comment on column experiences.archived is 'Was published before, now retired — distinct from `published=false`, which also covers "never published yet". Archiving auto-unpublishes (enforced in admin/experience-editor.js, not a DB constraint, since a UI-level toggle order is simpler than a trigger here).';

create index if not exists experiences_sort_order_idx on experiences (sort_order);
create index if not exists experiences_archived_idx on experiences (archived);

-- ----------------------------------------------------------------------------
-- fleet_items: availability_status replaces the old two-state `available`
-- boolean with a four-state one (task 5). `available` becomes a generated
-- column derived from it, so every existing reader (Fleet Manager's
-- filters/badges, admin/media-service.js) keeps working unchanged — this
-- is a stricter version of the same column, not a second source of truth.
-- ----------------------------------------------------------------------------
drop index if exists fleet_items_available_idx;
alter table fleet_items drop column if exists available;

alter table fleet_items
  add column availability_status text not null default 'available'
    check (availability_status in ('available', 'unavailable', 'maintenance', 'reserved'));

alter table fleet_items
  add column available boolean generated always as (availability_status = 'available') stored;

comment on column fleet_items.availability_status is 'Four-state operational status. `available` (below) is generated from this — always read/filter on whichever is more convenient, they can never disagree.';
comment on column fleet_items.available is 'Generated from availability_status = ''available''. Kept as a real column (not just a view) so existing eq(''available'', ...) filters in admin/fleet-service.js keep working unchanged.';

create index if not exists fleet_items_available_idx on fleet_items (available);
create index if not exists fleet_items_availability_status_idx on fleet_items (availability_status);

-- Pricing extensions (task 6). starting_price/deposit_amount/duration_options
-- already exist from Phase 6.2 Part 2B — only the genuinely new fields below.
alter table fleet_items
  add column if not exists seasonal_notes text,
  add column if not exists pricing_public boolean not null default false;

comment on column fleet_items.seasonal_notes is 'Free text, e.g. "Holiday weekends carry a premium." Shown to staff/admin today; not read by the public site yet.';
comment on column fleet_items.pricing_public is 'Whether starting_price should be shown publicly once the frontend migration happens, vs. staying "available upon request". Defaults false, matching the site''s existing quote-personally policy.';

-- Internal notes are staff-only by design, not just by convention — RLS is
-- row-level in Postgres, so a plain column on fleet_items would be visible
-- to anyone who can read that row at all (including `anon` once the public
-- site migrates, since it would see every column of a published row, not
-- just the ones the frontend adapter chooses to map). A separate table
-- with admin-only RLS is the only way to actually keep this staff-only,
-- the same reasoning profiles itself already uses.
create table if not exists fleet_item_private_notes (
  fleet_item_id uuid primary key references fleet_items (id) on delete cascade,
  notes text,
  updated_at timestamptz not null default now()
);

comment on table fleet_item_private_notes is 'Admin-only staff notes per vehicle (task 6 "Internal notes"). Deliberately a separate table, not a fleet_items column — RLS is row-level, so a column here would be exposed to anyone who can read the parent row at all.';

drop trigger if exists fleet_item_private_notes_set_updated_at on fleet_item_private_notes;
create trigger fleet_item_private_notes_set_updated_at
  before update on fleet_item_private_notes
  for each row
  execute function set_updated_at();

alter table fleet_item_private_notes enable row level security;

drop policy if exists "Only admins can access private fleet notes" on fleet_item_private_notes;
create policy "Only admins can access private fleet notes"
  on fleet_item_private_notes
  for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- ----------------------------------------------------------------------------
-- profiles: add the 'read_only' role (task 7). RLS itself needs no other
-- change — every existing policy already gates writes on is_admin() alone,
-- so 'read_only' behaves exactly like 'staff' at the database layer
-- (verified live, not just assumed, per this phase's verification step).
-- The only place the new role changes behavior is admin/auth-guard.js's
-- allow-list, so a read_only session can still sign in.
-- ----------------------------------------------------------------------------
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('admin', 'staff', 'read_only'));

comment on column profiles.role is '''admin'' has full CRUD on every content table. ''staff'' and ''read_only'' currently behave identically at the RLS layer (read published/admin-visible content only, no writes) — ''read_only'' exists so the admin UI can additionally hide write controls for accounts that should never even be offered them, not because RLS treats the two roles differently today.';

-- ----------------------------------------------------------------------------
-- site_content: staging ground for homepage copy currently hardcoded in
-- index.html (task 3) — Hero, About, Trust, Statistics, FAQ, Instagram
-- profile, Videos section intro, Clientele categories, Experience
-- categories. One flexible table rather than nine near-identical ones,
-- since each section's shape is genuinely document-like (a single object
-- or a reorderable list), not relational data. Not read by the public
-- site yet — index.html is unchanged by this phase.
-- ----------------------------------------------------------------------------
create table if not exists site_content (
  section text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table site_content is 'One row per homepage content section (hero, about, trust, statistics, faq, instagram_profile, videos_section, clientele_categories, experience_categories). Mirrors what index.html currently hardcodes; not read by the public site yet — see admin/homepage.html.';

drop trigger if exists site_content_set_updated_at on site_content;
create trigger site_content_set_updated_at
  before update on site_content
  for each row
  execute function set_updated_at();

alter table site_content enable row level security;

drop policy if exists "Signed-in staff can read site content" on site_content;
create policy "Signed-in staff can read site content"
  on site_content
  for select
  to authenticated
  using (true);

drop policy if exists "Admins have full access to site content" on site_content;
create policy "Admins have full access to site content"
  on site_content
  for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- ----------------------------------------------------------------------------
-- site_settings: singleton row for business/site-wide settings (task 4).
-- The `id boolean primary key default true check (id)` trick guarantees
-- exactly one row can ever exist — a second insert collides on the
-- primary key instead of needing a trigger to enforce singleton-ness.
-- ----------------------------------------------------------------------------
create table if not exists site_settings (
  id boolean primary key default true check (id),
  business_name text,
  phone text,
  email text,
  address text,
  social_links jsonb not null default '{}'::jsonb,
  logo_path text,
  seo_title text,
  seo_description text,
  google_maps_url text,
  booking_email text,
  updated_at timestamptz not null default now()
);

comment on table site_settings is 'Single-row business/site settings (task 4) — becomes the future source of truth for what js/booking-config.js, index.html''s structured data, and CLIENT_SETUP.md''s "Updating Business Information" section currently hold as static values. Not read by the public site yet.';
comment on column site_settings.social_links is 'Free-form {platform: url} map, e.g. {"instagram": "...", "whatsapp": "..."} — matches how many/few platforms the business actually uses without a fixed column per platform.';
comment on column site_settings.logo_path is 'Path into the `logos` Storage bucket (now RLS-enabled by this same migration, see below).';

insert into site_settings (id) values (true) on conflict (id) do nothing;

drop trigger if exists site_settings_set_updated_at on site_settings;
create trigger site_settings_set_updated_at
  before update on site_settings
  for each row
  execute function set_updated_at();

alter table site_settings enable row level security;

drop policy if exists "Signed-in staff can read site settings" on site_settings;
create policy "Signed-in staff can read site settings"
  on site_settings
  for select
  to authenticated
  using (true);

drop policy if exists "Admins have full access to site settings" on site_settings;
create policy "Admins have full access to site settings"
  on site_settings
  for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- ----------------------------------------------------------------------------
-- activity_log (task 9). Every authenticated user can insert their own
-- entries (needed for login/logout events from staff/read_only accounts,
-- which aren't gated by is_admin()); only admins can read the log back.
-- ----------------------------------------------------------------------------
create table if not exists activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  user_email text,
  action text not null check (action in ('create', 'update', 'delete', 'publish', 'unpublish', 'login', 'logout', 'media_upload', 'media_delete')),
  entity text not null,
  entity_id text,
  details jsonb,
  created_at timestamptz not null default now()
);

comment on table activity_log is 'Simple audit trail (task 9) — who did what, when. No frontend beyond a plain table on the dashboard; see admin/activity-log.js for the shared logger every other admin page calls.';

create index if not exists activity_log_created_at_idx on activity_log (created_at desc);
create index if not exists activity_log_entity_idx on activity_log (entity);
create index if not exists activity_log_user_id_idx on activity_log (user_id);

alter table activity_log enable row level security;

drop policy if exists "Users can log their own activity" on activity_log;
create policy "Users can log their own activity"
  on activity_log
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Admins can view the activity log" on activity_log;
create policy "Admins can view the activity log"
  on activity_log
  for select
  to authenticated
  using (is_admin());

-- ----------------------------------------------------------------------------
-- Storage: `logos` bucket (task 4's "Logo selection"). Pre-existing bucket
-- the site owner created (see supabase/SCHEMA_PROPOSAL.md §5), left
-- untouched through Phase 6.1-6.3 as out of scope. This phase brings it
-- into scope: same public-read/admin-write pattern as the four media
-- buckets, plus size/type limits sized for a logo rather than a photo.
-- ----------------------------------------------------------------------------
update storage.buckets
set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
where id = 'logos';

drop policy if exists "Public can read the logos bucket" on storage.objects;
create policy "Public can read the logos bucket"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'logos');

drop policy if exists "Admins can write to the logos bucket" on storage.objects;
create policy "Admins can write to the logos bucket"
  on storage.objects
  for all
  to authenticated
  using (bucket_id = 'logos' and is_admin())
  with check (bucket_id = 'logos' and is_admin());

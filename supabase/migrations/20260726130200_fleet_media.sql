-- ============================================================================
-- fleet_media
--
-- Replaces the eight near-identical slot lists on each js/fleet-data.js
-- entry (gallery, galleries.{exterior,interior,lifestyle,drone},
-- videos.{walkthrough,reels,tiktok,tours360}) with one flexible table —
-- see supabase/SCHEMA_PROPOSAL.md, section 2, for the reasoning. A row
-- with storage_path null is exactly today's "coming soon" placeholder
-- slot; no new frontend concept is implied by this table existing.
-- ============================================================================

create table if not exists fleet_media (
  id uuid primary key default gen_random_uuid(),
  fleet_item_id uuid not null references fleet_items (id) on delete cascade,
  kind text not null check (kind in ('photo', 'video')),
  section text not null check (
    section in (
      'hero', 'card', 'gallery',
      'exterior', 'interior', 'lifestyle', 'drone',
      'walkthrough', 'reels', 'tiktok', 'tours360'
    )
  ),
  slot_key text,
  label text,
  -- Path into the `media` storage bucket (see the storage migration in
  -- this same phase). Null is the default and expected state for this
  -- phase — no photography is being uploaded yet.
  storage_path text,
  platform text check (platform in ('video', 'instagram', 'tiktok', 'tour360')),
  alt text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table fleet_media is 'Photo/video slots for a fleet item. storage_path is null by default — that is today''s honest "coming soon" placeholder state, not an error state.';

create index if not exists fleet_media_fleet_item_id_idx on fleet_media (fleet_item_id);
create index if not exists fleet_media_section_idx on fleet_media (fleet_item_id, section);
create index if not exists fleet_media_sort_order_idx on fleet_media (sort_order);

drop trigger if exists fleet_media_set_updated_at on fleet_media;
create trigger fleet_media_set_updated_at
  before update on fleet_media
  for each row
  execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Row Level Security
--
-- fleet_media has no published column of its own — visibility follows
-- its parent fleet_items row exactly (a media slot is never "more
-- published" than the vehicle it belongs to).
-- ----------------------------------------------------------------------------
alter table fleet_media enable row level security;

drop policy if exists "Fleet media readable when its fleet item is published" on fleet_media;
create policy "Fleet media readable when its fleet item is published"
  on fleet_media
  for select
  to anon, authenticated
  using (
    is_admin()
    or exists (
      select 1 from fleet_items f
      where f.id = fleet_media.fleet_item_id
        and f.published = true
    )
  );

drop policy if exists "Admins have full access to fleet media" on fleet_media;
create policy "Admins have full access to fleet media"
  on fleet_media
  for all
  to authenticated
  using (is_admin())
  with check (is_admin());

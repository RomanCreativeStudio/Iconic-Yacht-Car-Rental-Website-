-- ============================================================================
-- experiences & experience_media
--
-- Table shape for what js/experiences-data.js's EXPERIENCES_DATA array
-- (currently empty — no charters have been documented yet) and its fixed
-- EXPERIENCE_CATEGORIES list currently hold. See
-- supabase/SCHEMA_PROPOSAL.md, section 2, for the full mapping.
-- ============================================================================

create table if not exists experiences (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null check (
    category in (
      'birthday', 'proposal', 'bachelor', 'corporate', 'sunset',
      'athlete', 'influencer', 'vacation', 'family', 'vip'
    )
  ),
  -- Kept as free text ("June 2026"), matching EXPERIENCES_DATA's existing
  -- `date` field exactly, rather than forcing a real date the source
  -- data was never structured to provide.
  date_text text,
  yacht_slug text references fleet_items (slug) on delete set null,
  description text,
  instagram_post_url text,
  instagram_reel_url text,
  -- Folded onto this table rather than a separate one-row-per-review
  -- table: EXPERIENCES_DATA models clientReview as an optional single
  -- object per experience, not a list.
  client_review_quote text,
  client_review_guest_name text,
  client_review_rating integer check (client_review_rating between 1 and 5),
  featured boolean not null default false,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table experiences is 'Documented charter/rental experiences. Mirrors js/experiences-data.js''s EXPERIENCES_DATA shape; empty and unpublished today — no charters have been logged yet, matching the JS file''s own current state.';
comment on column experiences.client_review_rating is 'Never populate without a real, permitted guest review — see js/experiences-data.js''s own "do NOT add placeholder entries" rule, which applies equally here.';

create index if not exists experiences_yacht_slug_idx on experiences (yacht_slug);
create index if not exists experiences_category_idx on experiences (category);
create index if not exists experiences_published_idx on experiences (published);
create index if not exists experiences_featured_idx on experiences (featured);

drop trigger if exists experiences_set_updated_at on experiences;
create trigger experiences_set_updated_at
  before update on experiences
  for each row
  execute function set_updated_at();

create table if not exists experience_media (
  id uuid primary key default gen_random_uuid(),
  experience_id uuid not null references experiences (id) on delete cascade,
  kind text not null check (kind in ('cover', 'photo', 'video')),
  storage_path text,
  platform text check (platform in ('video', 'instagram', 'tiktok', 'drone', 'client')),
  label text,
  alt text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table experience_media is 'Photos/videos for one experience — replaces that experience''s `photos` and `videos` arrays in js/experiences-data.js.';

create index if not exists experience_media_experience_id_idx on experience_media (experience_id);
create index if not exists experience_media_sort_order_idx on experience_media (sort_order);

drop trigger if exists experience_media_set_updated_at on experience_media;
create trigger experience_media_set_updated_at
  before update on experience_media
  for each row
  execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Row Level Security — same pattern as fleet_items / fleet_media:
-- public/staff read published rows (and their media) only, admin has
-- full CRUD on both tables.
-- ----------------------------------------------------------------------------
alter table experiences enable row level security;

drop policy if exists "Published experiences are publicly readable" on experiences;
create policy "Published experiences are publicly readable"
  on experiences
  for select
  to anon, authenticated
  using (published = true or is_admin());

drop policy if exists "Admins have full access to experiences" on experiences;
create policy "Admins have full access to experiences"
  on experiences
  for all
  to authenticated
  using (is_admin())
  with check (is_admin());

alter table experience_media enable row level security;

drop policy if exists "Experience media readable when its experience is published" on experience_media;
create policy "Experience media readable when its experience is published"
  on experience_media
  for select
  to anon, authenticated
  using (
    is_admin()
    or exists (
      select 1 from experiences e
      where e.id = experience_media.experience_id
        and e.published = true
    )
  );

drop policy if exists "Admins have full access to experience media" on experience_media;
create policy "Admins have full access to experience media"
  on experience_media
  for all
  to authenticated
  using (is_admin())
  with check (is_admin());

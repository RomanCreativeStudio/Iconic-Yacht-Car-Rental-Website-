-- Phase 6.6: open site_content to public reads, add clientele endorsements
-- and Instagram posts/reels as real, admin-managed, publicly-readable tables.

-- 1. site_content: replace the authenticated-only read policy with a public
--    one. This table holds homepage marketing copy only (no drafts/private
--    fields), so an unconditional SELECT is appropriate — same reasoning
--    already applied to site_settings's read policy, just widened to anon.
--    Admin write policy is untouched.
drop policy if exists "Signed-in staff can read site content" on public.site_content;
create policy "Site content is publicly readable"
  on public.site_content for select
  to anon, authenticated
  using (true);

-- 2. Clientele endorsements — same published-style gate as fleet_items /
--    experiences, using "approved" as the gate name to match the meaning
--    already established in js/clientele-data.js (never publish an
--    endorsement without the named person/brand's explicit approval).
create table public.clientele_endorsements (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  quote text not null,
  photo text,
  logo text,
  approved boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.clientele_endorsements is 'Real, named client/brand endorsements for the homepage Clientele section. Mirrors js/clientele-data.js''s CLIENTELE_ENDORSEMENTS shape. approved=true is required before an entry is publicly visible, same discipline as the static file''s own rule: never publish a quote, name, or logo without that person/brand''s explicit permission.';

alter table public.clientele_endorsements enable row level security;

create policy "Admins have full access to clientele endorsements"
  on public.clientele_endorsements for all
  to authenticated
  using (is_admin())
  with check (is_admin());

create policy "Approved clientele endorsements are publicly readable"
  on public.clientele_endorsements for select
  to anon, authenticated
  using (approved = true or is_admin());

-- 3. Instagram posts — shaped to match js/instagram-data.js's
--    INSTAGRAM_POSTS objects (and, per that file's own migration note,
--    close to the Graph API's IG Media object) so a later Graph API
--    connection is a data-source swap, not a reshape.
create table public.instagram_posts (
  id uuid primary key default gen_random_uuid(),
  media_type text not null default 'IMAGE' check (media_type = any (array['IMAGE', 'VIDEO', 'CAROUSEL_ALBUM'])),
  media_url text not null,
  media_url_webp text,
  permalink text not null,
  caption text,
  posted_at timestamptz,
  published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.instagram_posts is 'Manually-curated Instagram post previews for the homepage feed, until the real Graph API is connected (see js/instagram-data.js''s migration note). published=true required before public visibility.';

alter table public.instagram_posts enable row level security;

create policy "Admins have full access to instagram posts"
  on public.instagram_posts for all
  to authenticated
  using (is_admin())
  with check (is_admin());

create policy "Published instagram posts are publicly readable"
  on public.instagram_posts for select
  to anon, authenticated
  using (published = true or is_admin());

-- 4. Instagram Reels — shaped to match js/instagram.js's reel rendering
--    (reel.caption, reel.permalink, reel.thumbnail_url, reel.thumbnail_url_webp).
create table public.instagram_reels (
  id uuid primary key default gen_random_uuid(),
  caption text,
  permalink text not null,
  thumbnail_url text,
  thumbnail_url_webp text,
  published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
comment on table public.instagram_reels is 'Real Instagram Reels for the homepage Reels row. Empty until the first Reel is actually shot/posted — mirrors js/instagram-data.js''s empty INSTAGRAM_REELS array, not filled with placeholder entries. published=true required before public visibility.';

alter table public.instagram_reels enable row level security;

create policy "Admins have full access to instagram reels"
  on public.instagram_reels for all
  to authenticated
  using (is_admin())
  with check (is_admin());

create policy "Published instagram reels are publicly readable"
  on public.instagram_reels for select
  to anon, authenticated
  using (published = true or is_admin());

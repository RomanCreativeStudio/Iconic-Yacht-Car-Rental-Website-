-- ============================================================================
-- Storage: fleet & experience media buckets
--
-- The site owner had already created a set of storage buckets directly in
-- the Supabase dashboard before this migration was written — including
-- fleet-images, fleet-videos, experience-images, and experience-videos,
-- which map exactly to what this phase needs (task 5: "fleet images,
-- fleet videos, experience media"). This migration configures those
-- existing buckets rather than creating a competing one; the `insert ...
-- on conflict do nothing` below is what makes it replayable against a
-- fresh project that doesn't have them yet (e.g. a staging project spun
-- up from these migrations alone).
--
-- Other buckets the owner already created — logos, hero, gallery,
-- instagram, documents, avatars — are outside this phase's scope
-- (task 5 names three content types only) and are left exactly as they
-- were: no policies added, no public flag changed.
--
-- Public, since this is all public marketing photography — exactly as
-- public today as the files already sitting in /images/ that anyone can
-- already view directly. No files are uploaded by this migration.
--
-- Path convention (for when uploads start in a later phase):
--   fleet-images:       {slug}/{section}/{slot_key}.{ext}
--   fleet-videos:       {slug}/{section}/{slot_key}.{ext}
--   experience-images:  {experience_id}/{kind}-{n}.{ext}
--   experience-videos:  {experience_id}/{kind}-{n}.{ext}
-- ============================================================================

insert into storage.buckets (id, name, public)
values
  ('fleet-images', 'fleet-images', true),
  ('fleet-videos', 'fleet-videos', true),
  ('experience-images', 'experience-images', true),
  ('experience-videos', 'experience-videos', true)
on conflict (id) do update set public = true;

-- ----------------------------------------------------------------------------
-- Row Level Security on storage.objects, scoped to these four buckets only
--   - Public (anon) and any signed-in user: read.
--   - Admin (profiles.role = 'admin'): full read/write/delete.
--   - No anon write policy at all — matches booking_requests' insert-only
--     public model in spirit (the public can submit a form; it can never
--     write a file).
-- ----------------------------------------------------------------------------
drop policy if exists "Public can read fleet and experience media buckets" on storage.objects;
create policy "Public can read fleet and experience media buckets"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id in ('fleet-images', 'fleet-videos', 'experience-images', 'experience-videos'));

drop policy if exists "Admins can upload to fleet and experience media buckets" on storage.objects;
create policy "Admins can upload to fleet and experience media buckets"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id in ('fleet-images', 'fleet-videos', 'experience-images', 'experience-videos')
    and is_admin()
  );

drop policy if exists "Admins can update files in fleet and experience media buckets" on storage.objects;
create policy "Admins can update files in fleet and experience media buckets"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id in ('fleet-images', 'fleet-videos', 'experience-images', 'experience-videos')
    and is_admin()
  )
  with check (
    bucket_id in ('fleet-images', 'fleet-videos', 'experience-images', 'experience-videos')
    and is_admin()
  );

drop policy if exists "Admins can delete files in fleet and experience media buckets" on storage.objects;
create policy "Admins can delete files in fleet and experience media buckets"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id in ('fleet-images', 'fleet-videos', 'experience-images', 'experience-videos')
    and is_admin()
  );

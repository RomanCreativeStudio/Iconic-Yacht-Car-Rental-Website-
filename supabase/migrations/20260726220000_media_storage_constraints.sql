-- ============================================================================
-- Storage constraints for the Media Manager (Phase 6.3)
--
-- The four buckets themselves and their RLS already exist (see
-- supabase/migrations/20260726130400_storage_fleet_experience_buckets.sql) —
-- this migration adds nothing new there. It only turns on Storage's own
-- built-in `file_size_limit` / `allowed_mime_types` enforcement, so an
-- oversized or wrong-type upload is rejected by the server itself (a 400
-- from the Storage API before any bytes are written), not just by the
-- Media Manager's client-side checks, which a direct API call could bypass.
--
-- Limits mirror what CLIENT_SETUP.md documents for the Media Manager:
--   Images (fleet-images, experience-images): jpg/jpeg/png/webp, 20 MB max.
--   Videos (fleet-videos, experience-videos): mp4/mov/webm, 500 MB max.
-- ============================================================================

update storage.buckets
set
  file_size_limit = 20971520, -- 20 MB
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id in ('fleet-images', 'experience-images');

update storage.buckets
set
  file_size_limit = 524288000, -- 500 MB
  allowed_mime_types = array['video/mp4', 'video/quicktime', 'video/webm']
where id in ('fleet-videos', 'experience-videos');

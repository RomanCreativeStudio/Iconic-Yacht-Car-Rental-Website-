-- Phase 6.11 — Clientele & Instagram media uploads
--
-- Configures the pre-existing (previously unconfigured) "avatars" and
-- "instagram" Storage buckets so the admin Clientele/Instagram Managers
-- can upload endorsement photos, Instagram post media, and Instagram reel
-- thumbnails instead of requiring the owner to paste in URLs manually.
-- Both buckets already existed in the project (created directly in the
-- Supabase dashboard) but had no public access, no size/mime limits, and
-- no RLS policies — this migration brings them in line with the existing
-- fleet-images/experience-images/logos buckets' pattern. No new buckets
-- are created.

-- 1. Bucket configuration: public read, 20MB limit, image-only.
update storage.buckets
set public = true,
    file_size_limit = 20971520,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id in ('avatars', 'instagram');

-- 2. RLS: public can read, only admins can write — same shape as the
-- existing fleet-images/experience-images/logos policies.
create policy "Public can read avatars and instagram buckets"
on storage.objects for select
to anon, authenticated
using (bucket_id in ('avatars', 'instagram'));

create policy "Admins can upload to avatars and instagram buckets"
on storage.objects for insert
to authenticated
with check (bucket_id in ('avatars', 'instagram') and is_admin());

create policy "Admins can update files in avatars and instagram buckets"
on storage.objects for update
to authenticated
using (bucket_id in ('avatars', 'instagram') and is_admin())
with check (bucket_id in ('avatars', 'instagram') and is_admin());

create policy "Admins can delete files in avatars and instagram buckets"
on storage.objects for delete
to authenticated
using (bucket_id in ('avatars', 'instagram') and is_admin());

-- 3. Include the two buckets in the dashboard's Storage Used rollup.
create or replace function public.get_storage_usage()
returns table (bucket_id text, bytes bigint)
language plpgsql
stable security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Only admins can view storage usage.';
  end if;

  return query
    select o.bucket_id, coalesce(sum((o.metadata->>'size')::bigint), 0)::bigint
    from storage.objects o
    where o.bucket_id in ('fleet-images', 'fleet-videos', 'experience-images', 'experience-videos', 'logos', 'avatars', 'instagram')
    group by o.bucket_id;
end;
$$;

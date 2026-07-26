-- ============================================================================
-- Dashboard "Storage Usage" card (task 8) needs a total across
-- storage.objects, which PostgREST doesn't expose directly (only the
-- `public` schema is in its default search path) — and even if it did,
-- storage.objects' own RLS is scoped per-bucket, not built for an
-- aggregate across all of them. A small security-definer function
-- (same pattern as public.is_admin()) is the standard way to expose one
-- specific, narrow read without opening the whole table up.
-- ============================================================================

create or replace function public.get_storage_usage()
returns table (bucket_id text, bytes bigint)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Only admins can view storage usage.';
  end if;

  return query
    -- sum(bigint) returns numeric in Postgres, not bigint — cast back
    -- explicitly or PostgREST's RETURNS TABLE type check rejects it.
    select o.bucket_id, coalesce(sum((o.metadata->>'size')::bigint), 0)::bigint
    from storage.objects o
    where o.bucket_id in ('fleet-images', 'fleet-videos', 'experience-images', 'experience-videos', 'logos')
    group by o.bucket_id;
end;
$$;

comment on function public.get_storage_usage is 'Admin-only total bytes used per CMS storage bucket, for the dashboard summary card. Security definer so it can read storage.objects regardless of that table''s own per-bucket RLS; checks is_admin() itself since the EXECUTE grant below is broader than that.';

revoke all on function public.get_storage_usage() from public;
grant execute on function public.get_storage_usage() to authenticated;

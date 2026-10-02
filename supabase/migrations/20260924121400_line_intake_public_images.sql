-- Both storage buckets remain private. Only published property media is projected.
create function private.project_ready_images_after_publish()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.status='published' then
    insert into public.public_property_media(media_id,property_id,position,mime_type,width,height)
    select id,property_id,position,mime_type,width,height from public.property_media
    where property_id=new.id and tenant_id=new.tenant_id and status='ready' and bucket_id='property-published'
    on conflict(media_id) do update set position=excluded.position,mime_type=excluded.mime_type,width=excluded.width,height=excluded.height;
  end if;
  return new;
end $$;
-- Alphabetically after properties_sync_public_projection, which creates the parent row.
create trigger properties_z_project_ready_images after insert or update on public.properties
for each row execute function private.project_ready_images_after_publish();
revoke all on function private.project_ready_images_after_publish() from public,anon,authenticated;

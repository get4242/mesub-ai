create or replace function public.mark_property_sold(
  target_property_id uuid,
  expected_property_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  property_row public.properties;
begin
  select * into property_row
  from public.properties
  where id = target_property_id
  for update;

  if not found or not exists (
    select 1 from public.tenant_memberships membership
    where membership.tenant_id = property_row.tenant_id
      and membership.user_id = auth.uid()
      and membership.role = 'owner'
      and membership.status = 'active'
  ) then
    return jsonb_build_object('outcome', 'forbidden');
  end if;

  if property_row.version <> expected_property_version then
    return jsonb_build_object('outcome', 'conflict');
  end if;
  if property_row.status <> 'published' then
    return jsonb_build_object('outcome', 'invalid_status');
  end if;

  perform set_config('app.property_transition_authorized', 'true', true);
  update public.properties set status = 'sold' where id = property_row.id;
  return jsonb_build_object('outcome', 'sold');
end;
$$;

create or replace function public.delete_sold_property(
  target_property_id uuid,
  expected_property_version integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  property_row public.properties;
  media_files jsonb;
begin
  select * into property_row
  from public.properties
  where id = target_property_id
  for update;

  if not found or not exists (
    select 1 from public.tenant_memberships membership
    where membership.tenant_id = property_row.tenant_id
      and membership.user_id = auth.uid()
      and membership.role = 'owner'
      and membership.status = 'active'
  ) then
    return jsonb_build_object('outcome', 'forbidden');
  end if;

  if property_row.version <> expected_property_version then
    return jsonb_build_object('outcome', 'conflict');
  end if;
  if property_row.status <> 'sold' then
    return jsonb_build_object('outcome', 'invalid_status');
  end if;
  if exists (select 1 from public.leads where property_id = property_row.id)
    or exists (select 1 from public.appointments where property_id = property_row.id) then
    return jsonb_build_object('outcome', 'has_history');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('bucketId', bucket_id, 'objectPath', object_path)), '[]'::jsonb)
  into media_files
  from public.property_media
  where property_id = property_row.id;

  delete from public.properties where id = property_row.id;
  return jsonb_build_object('outcome', 'deleted', 'media', media_files);
end;
$$;

revoke all on function public.mark_property_sold(uuid, integer) from public, anon;
revoke all on function public.delete_sold_property(uuid, integer) from public, anon;
grant execute on function public.mark_property_sold(uuid, integer) to authenticated;
grant execute on function public.delete_sold_property(uuid, integer) to authenticated;

alter table public.property_media
  drop constraint property_media_property_id_position_key,
  add constraint property_media_property_id_position_key
    unique (property_id, position) deferrable initially immediate;

create function public.reorder_property_media(target_property_id uuid, ordered_media_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  target_tenant_id uuid;
  active_count integer;
begin
  if cardinality(ordered_media_ids) > 20
    or cardinality(ordered_media_ids) <> (select count(distinct value) from unnest(ordered_media_ids) as items(value)) then
    raise exception 'INVALID_MEDIA_ORDER' using errcode = '22023';
  end if;

  select property.tenant_id into target_tenant_id
  from public.properties as property
  where property.id = target_property_id;

  if target_tenant_id is null or not exists (
    select 1 from public.tenant_memberships as membership
    where membership.tenant_id = target_tenant_id
      and membership.user_id = auth.uid()
      and membership.role = 'owner'
      and membership.status = 'active'
  ) then
    raise exception 'PROPERTY_NOT_FOUND' using errcode = '42501';
  end if;

  select count(*) into active_count
  from public.property_media
  where property_id = target_property_id and status <> 'archived';

  if active_count <> cardinality(ordered_media_ids)
    or exists (
      select 1 from unnest(ordered_media_ids) as items(media_id)
      where not exists (
        select 1 from public.property_media
        where id = media_id and property_id = target_property_id and tenant_id = target_tenant_id and status <> 'archived'
      )
    ) then
    raise exception 'INVALID_MEDIA_ORDER' using errcode = '22023';
  end if;

  set constraints property_media_property_id_position_key deferred;

  update public.property_media as media
  set position = ordered.position - 1
  from unnest(ordered_media_ids) with ordinality as ordered(id, position)
  where media.id = ordered.id
    and media.property_id = target_property_id
    and media.tenant_id = target_tenant_id;
end;
$$;

revoke all on function public.reorder_property_media(uuid, uuid[]) from public, anon;
grant execute on function public.reorder_property_media(uuid, uuid[]) to authenticated;

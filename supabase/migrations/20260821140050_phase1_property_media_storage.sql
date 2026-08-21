create type public.property_media_status as enum ('uploading', 'ready', 'failed', 'archived');

alter table public.properties
  add constraint properties_tenant_id_id_key unique (tenant_id, id);

create table public.property_media (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null,
  property_id uuid not null,
  bucket_id text not null check (bucket_id in ('property-intake', 'property-published')),
  object_path text not null unique,
  original_filename text not null check (char_length(original_filename) between 1 and 255),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  byte_size bigint not null check (byte_size between 1 and 10485760),
  width integer not null check (width between 1 and 20000),
  height integer not null check (height between 1 and 20000),
  checksum_sha256 char(64) not null check (checksum_sha256 ~ '^[0-9a-f]{64}$'),
  position integer not null check (position between 0 and 19),
  status public.property_media_status not null default 'uploading',
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint property_media_property_tenant_fk
    foreign key (tenant_id, property_id) references public.properties (tenant_id, id) on delete cascade,
  constraint property_media_path_matches_identity check (
    object_path like tenant_id::text || '/' || property_id::text || '/' || id::text || '/%'
  ),
  constraint property_media_archive_timestamp check (
    (status = 'archived' and archived_at is not null)
    or (status <> 'archived' and archived_at is null)
  ),
  unique (property_id, position)
);

create index property_media_tenant_property_idx on public.property_media (tenant_id, property_id, position);

create function private.enforce_property_media_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.tenant_id is distinct from old.tenant_id
    or new.property_id is distinct from old.property_id
    or new.bucket_id is distinct from old.bucket_id
    or new.object_path is distinct from old.object_path then
    raise exception 'media ownership and storage identity are immutable' using errcode = '42501';
  end if;
  new.updated_at := now();
  new.archived_at := case when new.status = 'archived' then coalesce(old.archived_at, now()) else null end;
  return new;
end;
$$;

create trigger property_media_enforce_update
before update on public.property_media
for each row execute function private.enforce_property_media_update();

create function private.limit_property_media_count()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.property_media where property_id = new.property_id and status <> 'archived') >= 20 then
    raise exception 'PROPERTY_MEDIA_LIMIT_REACHED' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger property_media_limit_count
before insert on public.property_media
for each row execute function private.limit_property_media_count();

create function private.audit_property_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_logs (tenant_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (
    new.tenant_id,
    auth.uid(),
    case when tg_op = 'INSERT' then 'property.created' else 'property.updated' end,
    'property',
    new.id,
    jsonb_build_object('version', new.version, 'criticalVersion', new.critical_version, 'status', new.status)
  );
  return new;
end;
$$;

create trigger properties_write_audit
after insert or update on public.properties
for each row execute function private.audit_property_mutation();

revoke all on function private.enforce_property_media_update() from public, anon, authenticated;
revoke all on function private.limit_property_media_count() from public, anon, authenticated;
revoke all on function private.audit_property_mutation() from public, anon, authenticated;

alter table public.property_media enable row level security;

create policy property_media_select_member on public.property_media
for select to authenticated
using (
  exists (
    select 1 from public.tenant_memberships as membership
    where membership.tenant_id = property_media.tenant_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
  )
);

create policy property_media_insert_owner on public.property_media
for insert to authenticated
with check (
  exists (
    select 1 from public.tenant_memberships as membership
    where membership.tenant_id = property_media.tenant_id
      and membership.user_id = (select auth.uid())
      and membership.role = 'owner'
      and membership.status = 'active'
  )
);

create policy property_media_update_owner on public.property_media
for update to authenticated
using (
  exists (
    select 1 from public.tenant_memberships as membership
    where membership.tenant_id = property_media.tenant_id
      and membership.user_id = (select auth.uid())
      and membership.role = 'owner'
      and membership.status = 'active'
  )
)
with check (
  exists (
    select 1 from public.tenant_memberships as membership
    where membership.tenant_id = property_media.tenant_id
      and membership.user_id = (select auth.uid())
      and membership.role = 'owner'
      and membership.status = 'active'
  )
);

revoke all on public.property_media from anon, authenticated;
grant select on public.property_media to authenticated;
grant insert (id, tenant_id, property_id, bucket_id, object_path, original_filename, mime_type, byte_size, width, height, checksum_sha256, position, status)
  on public.property_media to authenticated;
grant update (position, status, archived_at) on public.property_media to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('property-intake', 'property-intake', false, 10485760, array['image/jpeg', 'image/png', 'image/webp']),
  ('property-published', 'property-published', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy property_objects_select_owner
on storage.objects for select to authenticated
using (
  bucket_id in ('property-intake', 'property-published')
  and exists (
    select 1
    from public.properties as property
    join public.tenant_memberships as membership on membership.tenant_id = property.tenant_id
    where property.tenant_id::text = (storage.foldername(name))[1]
      and property.id::text = (storage.foldername(name))[2]
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
  )
);

create policy property_objects_insert_owner
on storage.objects for insert to authenticated
with check (
  bucket_id in ('property-intake', 'property-published')
  and exists (
    select 1
    from public.properties as property
    join public.tenant_memberships as membership on membership.tenant_id = property.tenant_id
    where property.tenant_id::text = (storage.foldername(name))[1]
      and property.id::text = (storage.foldername(name))[2]
      and membership.user_id = (select auth.uid())
      and membership.role = 'owner'
      and membership.status = 'active'
  )
);

create policy property_objects_update_owner
on storage.objects for update to authenticated
using (
  bucket_id in ('property-intake', 'property-published')
  and exists (
    select 1
    from public.properties as property
    join public.tenant_memberships as membership on membership.tenant_id = property.tenant_id
    where property.tenant_id::text = (storage.foldername(name))[1]
      and property.id::text = (storage.foldername(name))[2]
      and membership.user_id = (select auth.uid())
      and membership.role = 'owner'
      and membership.status = 'active'
  )
)
with check (bucket_id in ('property-intake', 'property-published'));

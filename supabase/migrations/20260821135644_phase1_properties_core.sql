create type public.property_listing_type as enum ('sale', 'rent');
create type public.property_type as enum (
  'land', 'detached_house', 'townhouse', 'condominium', 'commercial_building', 'other'
);
create type public.property_status as enum (
  'draft', 'pending_confirmation', 'published', 'sold', 'inactive', 'archived'
);

alter table public.agent_profiles
  add constraint agent_profiles_tenant_id_id_key unique (tenant_id, id);

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  owner_agent_id uuid not null,
  listing_type public.property_listing_type not null,
  property_type public.property_type not null,
  status public.property_status not null default 'draft',
  title text not null check (char_length(title) between 1 and 200),
  description text not null check (char_length(description) between 1 and 10000),
  province text not null check (char_length(province) between 1 and 100),
  district text not null check (char_length(district) between 1 and 100),
  subdistrict text check (subdistrict is null or char_length(subdistrict) between 1 and 100),
  address_line text check (address_line is null or char_length(address_line) <= 500),
  latitude numeric(9, 6) check (latitude between -90 and 90),
  longitude numeric(9, 6) check (longitude between -180 and 180),
  price numeric(16, 2) not null check (price >= 0),
  currency char(3) not null default 'THB' check (currency = 'THB'),
  land_area_sqm numeric(16, 4) check (land_area_sqm > 0),
  building_area_sqm numeric(16, 4) check (building_area_sqm > 0),
  bedrooms integer check (bedrooms between 0 and 100),
  bathrooms integer check (bathrooms between 0 and 100),
  version integer not null default 1 check (version > 0),
  critical_version integer not null default 1 check (critical_version > 0 and critical_version <= version),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint properties_owner_tenant_fk
    foreign key (tenant_id, owner_agent_id)
    references public.agent_profiles (tenant_id, id)
    on delete restrict,
  constraint properties_conditional_fields check (
    (property_type = 'land' and land_area_sqm is not null)
    or (property_type in ('detached_house', 'townhouse', 'condominium')
      and building_area_sqm is not null and bedrooms is not null and bathrooms is not null)
    or (property_type = 'commercial_building' and building_area_sqm is not null)
    or (property_type = 'other' and (land_area_sqm is not null or building_area_sqm is not null))
  ),
  constraint properties_archive_timestamp check (
    (status = 'archived' and archived_at is not null)
    or (status <> 'archived' and archived_at is null)
  )
);

create index properties_tenant_status_updated_idx on public.properties (tenant_id, status, updated_at desc);
create index properties_owner_agent_id_idx on public.properties (owner_agent_id);

create function private.enforce_property_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  critical_changed boolean;
begin
  if new.tenant_id is distinct from old.tenant_id or new.owner_agent_id is distinct from old.owner_agent_id then
    raise exception 'property ownership is immutable' using errcode = '42501';
  end if;

  if new.status is distinct from old.status then
    if new.status = 'published' then
      raise exception 'PUBLISH_NOT_AVAILABLE_IN_PHASE_1' using errcode = 'P0001';
    end if;
    if not (
      (old.status = 'draft' and new.status in ('pending_confirmation', 'archived'))
      or (old.status = 'pending_confirmation' and new.status in ('draft', 'archived'))
    ) then
      raise exception 'INVALID_PHASE_1_PROPERTY_TRANSITION' using errcode = 'P0001';
    end if;
  end if;

  critical_changed := row(
    new.listing_type, new.property_type, new.price, new.province, new.district,
    new.subdistrict, new.address_line, new.latitude, new.longitude,
    new.land_area_sqm, new.building_area_sqm, new.bedrooms, new.bathrooms
  ) is distinct from row(
    old.listing_type, old.property_type, old.price, old.province, old.district,
    old.subdistrict, old.address_line, old.latitude, old.longitude,
    old.land_area_sqm, old.building_area_sqm, old.bedrooms, old.bathrooms
  );

  new.version := old.version + 1;
  new.critical_version := old.critical_version + case when critical_changed then 1 else 0 end;
  new.updated_at := now();
  new.archived_at := case when new.status = 'archived' then coalesce(old.archived_at, now()) else null end;
  return new;
end;
$$;

create trigger properties_enforce_update
before update on public.properties
for each row execute function private.enforce_property_update();

revoke all on function private.enforce_property_update() from public, anon, authenticated;

alter table public.properties enable row level security;

create policy properties_select_member
on public.properties
for select
to authenticated
using (
  exists (
    select 1 from public.tenant_memberships as membership
    where membership.tenant_id = properties.tenant_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
  )
);

create policy properties_insert_owner
on public.properties
for insert
to authenticated
with check (
  exists (
    select 1 from public.tenant_memberships as membership
    join public.agent_profiles as agent
      on agent.tenant_id = membership.tenant_id
     and agent.user_id = membership.user_id
    where membership.tenant_id = properties.tenant_id
      and membership.user_id = (select auth.uid())
      and membership.role = 'owner'
      and membership.status = 'active'
      and agent.id = properties.owner_agent_id
  )
);

create policy properties_update_owner
on public.properties
for update
to authenticated
using (
  exists (
    select 1 from public.tenant_memberships as membership
    where membership.tenant_id = properties.tenant_id
      and membership.user_id = (select auth.uid())
      and membership.role = 'owner'
      and membership.status = 'active'
  )
)
with check (
  exists (
    select 1 from public.tenant_memberships as membership
    join public.agent_profiles as agent
      on agent.tenant_id = membership.tenant_id
     and agent.user_id = membership.user_id
    where membership.tenant_id = properties.tenant_id
      and membership.user_id = (select auth.uid())
      and membership.role = 'owner'
      and membership.status = 'active'
      and agent.id = properties.owner_agent_id
  )
);

revoke all on public.properties from anon, authenticated;
grant select on public.properties to authenticated;
grant insert (
  tenant_id, owner_agent_id, listing_type, property_type, status, title, description,
  province, district, subdistrict, address_line, latitude, longitude, price, currency,
  land_area_sqm, building_area_sqm, bedrooms, bathrooms
) on public.properties to authenticated;
grant update (
  listing_type, property_type, status, title, description, province, district, subdistrict,
  address_line, latitude, longitude, price, currency, land_area_sqm, building_area_sqm,
  bedrooms, bathrooms
) on public.properties to authenticated;

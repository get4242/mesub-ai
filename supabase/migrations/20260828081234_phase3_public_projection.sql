create table public.public_properties (
  id uuid primary key,
  slug text not null unique,
  listing_type public.property_listing_type not null,
  property_type public.property_type not null,
  title text not null,
  description text not null,
  province text not null,
  district text not null,
  subdistrict text,
  price numeric(16, 2) not null,
  currency char(3) not null,
  land_area_sqm numeric(16, 4),
  building_area_sqm numeric(16, 4),
  bedrooms integer,
  bathrooms integer,
  published_at timestamptz not null,
  updated_at timestamptz not null
);

create index public_properties_location_price_idx
  on public.public_properties (province, district, price, id);
create index public_properties_type_updated_idx
  on public.public_properties (property_type, updated_at desc, id);

create table public.public_property_media (
  media_id uuid primary key,
  property_id uuid not null references public.public_properties (id) on delete cascade,
  position integer not null check (position between 0 and 19),
  mime_type text not null,
  width integer not null,
  height integer not null,
  unique (property_id, position)
);

create function private.sync_public_property_projection()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'published' then
    insert into public.public_properties (
      id, slug, listing_type, property_type, title, description, province, district,
      subdistrict, price, currency, land_area_sqm, building_area_sqm, bedrooms,
      bathrooms, published_at, updated_at
    ) values (
      new.id, new.id::text, new.listing_type, new.property_type, new.title, new.description,
      new.province, new.district, new.subdistrict, new.price, new.currency,
      new.land_area_sqm, new.building_area_sqm, new.bedrooms, new.bathrooms,
      case when old.status is distinct from 'published' then now() else coalesce((select published_at from public.public_properties where id = new.id), now()) end,
      new.updated_at
    ) on conflict (id) do update set
      listing_type = excluded.listing_type, property_type = excluded.property_type,
      title = excluded.title, description = excluded.description, province = excluded.province,
      district = excluded.district, subdistrict = excluded.subdistrict, price = excluded.price,
      currency = excluded.currency, land_area_sqm = excluded.land_area_sqm,
      building_area_sqm = excluded.building_area_sqm, bedrooms = excluded.bedrooms,
      bathrooms = excluded.bathrooms, updated_at = excluded.updated_at;
  else
    delete from public.public_properties where id = new.id;
  end if;
  return new;
end;
$$;

create trigger properties_sync_public_projection
after insert or update on public.properties
for each row execute function private.sync_public_property_projection();

create function private.sync_public_property_media()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'ready' and new.bucket_id = 'property-published'
    and exists (select 1 from public.public_properties where id = new.property_id) then
    insert into public.public_property_media (media_id, property_id, position, mime_type, width, height)
    values (new.id, new.property_id, new.position, new.mime_type, new.width, new.height)
    on conflict (media_id) do update set position = excluded.position, mime_type = excluded.mime_type,
      width = excluded.width, height = excluded.height;
  else
    delete from public.public_property_media where media_id = new.id;
  end if;
  return new;
end;
$$;

create trigger property_media_sync_public_projection
after insert or update on public.property_media
for each row execute function private.sync_public_property_media();

insert into public.public_properties (
  id, slug, listing_type, property_type, title, description, province, district,
  subdistrict, price, currency, land_area_sqm, building_area_sqm, bedrooms,
  bathrooms, published_at, updated_at
)
select id, id::text, listing_type, property_type, title, description, province, district,
  subdistrict, price, currency, land_area_sqm, building_area_sqm, bedrooms, bathrooms,
  updated_at, updated_at
from public.properties where status = 'published';

insert into public.public_property_media (media_id, property_id, position, mime_type, width, height)
select media.id, media.property_id, media.position, media.mime_type, media.width, media.height
from public.property_media as media
join public.public_properties as property on property.id = media.property_id
where media.status = 'ready' and media.bucket_id = 'property-published';

alter table public.public_properties enable row level security;
alter table public.public_property_media enable row level security;
create policy public_properties_read on public.public_properties for select to anon, authenticated using (true);
create policy public_property_media_read on public.public_property_media for select to anon, authenticated using (true);

revoke all on public.public_properties, public.public_property_media from anon, authenticated;
grant select on public.public_properties, public.public_property_media to anon, authenticated;
revoke all on function private.sync_public_property_projection() from public, anon, authenticated;
revoke all on function private.sync_public_property_media() from public, anon, authenticated;

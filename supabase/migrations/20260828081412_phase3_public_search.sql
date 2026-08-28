create function public.search_public_properties(
  search_query text default null,
  filter_province text default null,
  filter_district text default null,
  filter_listing_type public.property_listing_type default null,
  filter_property_type public.property_type default null,
  minimum_price numeric default null,
  maximum_price numeric default null,
  sort_order text default 'newest',
  page_number integer default 1,
  page_size integer default 20
)
returns setof public.public_properties
language sql
stable
security invoker
set search_path = ''
as $$
  select property.*
  from public.public_properties as property
  where (nullif(trim(search_query), '') is null or concat_ws(' ', property.title, property.description, property.province, property.district, property.subdistrict) ilike '%' || trim(search_query) || '%')
    and (filter_province is null or property.province = filter_province)
    and (filter_district is null or property.district = filter_district)
    and (filter_listing_type is null or property.listing_type = filter_listing_type)
    and (filter_property_type is null or property.property_type = filter_property_type)
    and (minimum_price is null or property.price >= minimum_price)
    and (maximum_price is null or property.price <= maximum_price)
  order by
    case when sort_order = 'price_asc' then property.price end asc,
    case when sort_order = 'price_desc' then property.price end desc,
    case when sort_order = 'newest' then property.published_at end desc,
    property.id asc
  limit least(greatest(page_size, 1), 50)
  offset (greatest(page_number, 1) - 1) * least(greatest(page_size, 1), 50);
$$;

revoke all on function public.search_public_properties(text, text, text, public.property_listing_type, public.property_type, numeric, numeric, text, integer, integer) from public;
grant execute on function public.search_public_properties(text, text, text, public.property_listing_type, public.property_type, numeric, numeric, text, integer, integer) to anon, authenticated;

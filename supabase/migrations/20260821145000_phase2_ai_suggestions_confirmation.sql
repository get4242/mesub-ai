create type public.ai_suggestion_decision as enum ('pending', 'accepted', 'rejected');
create type public.ai_validation_status as enum ('valid', 'invalid', 'unknown');

create table public.ai_suggestions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  property_id uuid not null,
  ai_run_id uuid not null,
  field_key text not null check (field_key in (
    'listing_type','property_type','title','description','province','district','subdistrict','address_line',
    'latitude','longitude','price','land_area_sqm','building_area_sqm','bedrooms','bathrooms'
  )),
  proposed_value jsonb not null,
  confidence numeric(5, 4) check (confidence between 0 and 1),
  confidence_unknown boolean not null default false,
  validation_status public.ai_validation_status not null,
  decision public.ai_suggestion_decision not null default 'pending',
  decided_by_user_id uuid references auth.users (id) on delete restrict,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, property_id) references public.properties (tenant_id, id) on delete cascade,
  foreign key (tenant_id, ai_run_id) references public.ai_runs (tenant_id, id) on delete cascade,
  check ((confidence_unknown and confidence is null) or (not confidence_unknown and confidence is not null)),
  check ((decision = 'pending' and decided_by_user_id is null and decided_at is null)
    or (decision <> 'pending' and decided_by_user_id is not null and decided_at is not null))
);

create table public.ai_suggestion_sources (
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  suggestion_id uuid not null,
  source_id uuid not null,
  primary key (suggestion_id, source_id),
  foreign key (tenant_id, suggestion_id) references public.ai_suggestions (tenant_id, id) on delete cascade,
  foreign key (tenant_id, source_id) references public.ai_sources (tenant_id, id) on delete restrict
);

create table public.property_confirmations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  property_id uuid not null,
  confirmed_by_user_id uuid not null references auth.users (id) on delete restrict,
  property_version integer not null check (property_version > 0),
  critical_version integer not null check (critical_version > 0),
  review_run_id uuid,
  schema_version integer not null default 1 check (schema_version > 0),
  confirmed_at timestamptz not null default now(),
  unique (tenant_id, property_id, critical_version, schema_version),
  foreign key (tenant_id, property_id) references public.properties (tenant_id, id) on delete cascade,
  foreign key (tenant_id, review_run_id) references public.ai_runs (tenant_id, id) on delete restrict
);

create index ai_suggestions_tenant_run_decision_idx on public.ai_suggestions (tenant_id, ai_run_id, decision);
create index ai_suggestions_tenant_property_idx on public.ai_suggestions (tenant_id, property_id, created_at desc);
create index ai_suggestion_sources_tenant_idx on public.ai_suggestion_sources (tenant_id, suggestion_id);
create index property_confirmations_tenant_property_idx on public.property_confirmations (tenant_id, property_id, confirmed_at desc);

create trigger ai_suggestions_set_updated_at before update on public.ai_suggestions
for each row execute function private.set_updated_at();
create trigger property_confirmations_immutable before update or delete on public.property_confirmations
for each row execute function private.reject_immutable_ai_row_update();

alter table public.ai_suggestions enable row level security;
alter table public.ai_suggestion_sources enable row level security;
alter table public.property_confirmations enable row level security;

create policy ai_suggestions_select_owner on public.ai_suggestions for select to authenticated using (
  exists (select 1 from public.tenant_memberships m where m.tenant_id = ai_suggestions.tenant_id
    and m.user_id = (select auth.uid()) and m.role = 'owner' and m.status = 'active')
);
create policy ai_suggestion_sources_select_owner on public.ai_suggestion_sources for select to authenticated using (
  exists (select 1 from public.tenant_memberships m where m.tenant_id = ai_suggestion_sources.tenant_id
    and m.user_id = (select auth.uid()) and m.role = 'owner' and m.status = 'active')
);
create policy confirmations_select_owner on public.property_confirmations for select to authenticated using (
  exists (select 1 from public.tenant_memberships m where m.tenant_id = property_confirmations.tenant_id
    and m.user_id = (select auth.uid()) and m.role = 'owner' and m.status = 'active')
);

create function public.accept_ai_suggestion(target_suggestion_id uuid, expected_property_version integer)
returns table (property_id uuid, version integer, critical_version integer)
language plpgsql security definer set search_path = '' as $$
declare s public.ai_suggestions; p public.properties; critical_fields constant text[] := array[
  'listing_type','property_type','province','district','subdistrict','address_line','latitude','longitude','price',
  'land_area_sqm','building_area_sqm','bedrooms','bathrooms'
];
begin
  if auth.uid() is null then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  select * into s from public.ai_suggestions where id = target_suggestion_id for update;
  if not found or not exists (select 1 from public.tenant_memberships m where m.tenant_id=s.tenant_id
    and m.user_id=auth.uid() and m.role='owner' and m.status='active') then
    raise exception 'NOT_FOUND' using errcode = 'P0002';
  end if;
  if s.decision <> 'pending' then raise exception 'SUGGESTION_ALREADY_DECIDED' using errcode='55000'; end if;
  if s.validation_status <> 'valid' then raise exception 'SUGGESTION_INVALID' using errcode='22023'; end if;
  if s.field_key = any(critical_fields) and not exists (
    select 1 from public.ai_suggestion_sources ss where ss.tenant_id=s.tenant_id and ss.suggestion_id=s.id
  ) then raise exception 'SOURCE_REQUIRED' using errcode='22023'; end if;
  select * into p from public.properties where id=s.property_id and tenant_id=s.tenant_id for update;
  if p.version <> expected_property_version then raise exception 'VERSION_CONFLICT' using errcode='40001'; end if;

  update public.properties set
    listing_type = case when s.field_key='listing_type' then (s.proposed_value #>> '{}')::public.property_listing_type else listing_type end,
    property_type = case when s.field_key='property_type' then (s.proposed_value #>> '{}')::public.property_type else property_type end,
    title = case when s.field_key='title' then s.proposed_value #>> '{}' else title end,
    description = case when s.field_key='description' then s.proposed_value #>> '{}' else description end,
    province = case when s.field_key='province' then s.proposed_value #>> '{}' else province end,
    district = case when s.field_key='district' then s.proposed_value #>> '{}' else district end,
    subdistrict = case when s.field_key='subdistrict' then s.proposed_value #>> '{}' else subdistrict end,
    address_line = case when s.field_key='address_line' then s.proposed_value #>> '{}' else address_line end,
    latitude = case when s.field_key='latitude' then (s.proposed_value #>> '{}')::numeric else latitude end,
    longitude = case when s.field_key='longitude' then (s.proposed_value #>> '{}')::numeric else longitude end,
    price = case when s.field_key='price' then (s.proposed_value #>> '{}')::numeric else price end,
    land_area_sqm = case when s.field_key='land_area_sqm' then (s.proposed_value #>> '{}')::numeric else land_area_sqm end,
    building_area_sqm = case when s.field_key='building_area_sqm' then (s.proposed_value #>> '{}')::numeric else building_area_sqm end,
    bedrooms = case when s.field_key='bedrooms' then (s.proposed_value #>> '{}')::integer else bedrooms end,
    bathrooms = case when s.field_key='bathrooms' then (s.proposed_value #>> '{}')::integer else bathrooms end
  where id=p.id and tenant_id=p.tenant_id;
  update public.ai_suggestions set decision='accepted', decided_by_user_id=auth.uid(), decided_at=now() where id=s.id;
  return query select pr.id, pr.version, pr.critical_version from public.properties pr where pr.id=p.id;
end;
$$;

create function public.reject_ai_suggestion(target_suggestion_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare s public.ai_suggestions;
begin
  if auth.uid() is null then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select * into s from public.ai_suggestions where id=target_suggestion_id for update;
  if not found or not exists (select 1 from public.tenant_memberships m where m.tenant_id=s.tenant_id
    and m.user_id=auth.uid() and m.role='owner' and m.status='active') then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  if s.decision <> 'pending' then raise exception 'SUGGESTION_ALREADY_DECIDED' using errcode='55000'; end if;
  update public.ai_suggestions set decision='rejected', decided_by_user_id=auth.uid(), decided_at=now() where id=s.id;
end;
$$;

create function public.confirm_property_current_version(
  target_property_id uuid, expected_property_version integer, expected_critical_version integer, review_run_id uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare p public.properties; inserted_id uuid;
begin
  if auth.uid() is null then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select * into p from public.properties where id=target_property_id for update;
  if not found or p.status='archived' or not exists (select 1 from public.tenant_memberships m where m.tenant_id=p.tenant_id
    and m.user_id=auth.uid() and m.role='owner' and m.status='active') then raise exception 'NOT_FOUND' using errcode='P0002'; end if;
  if p.version <> expected_property_version or p.critical_version <> expected_critical_version then
    raise exception 'VERSION_CONFLICT' using errcode='40001';
  end if;
  if exists (select 1 from public.ai_suggestions s where s.tenant_id=p.tenant_id and s.property_id=p.id
    and s.validation_status='invalid' and s.decision='pending' and s.field_key not in ('title','description')) then
    raise exception 'UNRESOLVED_CRITICAL_SUGGESTIONS' using errcode='55000';
  end if;
  insert into public.property_confirmations (tenant_id,property_id,confirmed_by_user_id,property_version,critical_version,review_run_id)
  values (p.tenant_id,p.id,auth.uid(),p.version,p.critical_version,review_run_id)
  on conflict (tenant_id,property_id,critical_version,schema_version) do update set property_version=excluded.property_version
  returning id into inserted_id;
  return inserted_id;
end;
$$;

revoke all on public.ai_suggestions, public.ai_suggestion_sources, public.property_confirmations from anon, authenticated;
grant select on public.ai_suggestions, public.ai_suggestion_sources, public.property_confirmations to authenticated;
revoke all on function public.accept_ai_suggestion(uuid, integer) from public, anon;
revoke all on function public.reject_ai_suggestion(uuid) from public, anon;
revoke all on function public.confirm_property_current_version(uuid, integer, integer, uuid) from public, anon;
grant execute on function public.accept_ai_suggestion(uuid, integer) to authenticated;
grant execute on function public.reject_ai_suggestion(uuid) to authenticated;
grant execute on function public.confirm_property_current_version(uuid, integer, integer, uuid) to authenticated;

create table public.property_publication_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  actor_user_id uuid not null references auth.users (id) on delete restrict,
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 200),
  outcome text not null check (outcome in ('published', 'already_published')),
  published_count integer not null check (published_count >= 0),
  active_property_limit integer not null check (active_property_limit > 0),
  created_at timestamptz not null default now(),
  unique (tenant_id, idempotency_key)
);

create index property_publication_events_tenant_property_idx
  on public.property_publication_events (tenant_id, property_id, created_at desc);

alter table public.property_publication_events enable row level security;
create policy property_publication_events_select_member
on public.property_publication_events for select to authenticated
using (
  exists (
    select 1 from public.tenant_memberships as membership
    where membership.tenant_id = property_publication_events.tenant_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
  )
);
revoke all on public.property_publication_events from anon, authenticated;
grant select on public.property_publication_events to authenticated;

create or replace function private.enforce_property_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  critical_changed boolean;
  authorized_transition boolean := current_setting('app.property_transition_authorized', true) = 'true';
begin
  if new.tenant_id is distinct from old.tenant_id or new.owner_agent_id is distinct from old.owner_agent_id then
    raise exception 'property ownership is immutable' using errcode = '42501';
  end if;

  if new.status is distinct from old.status then
    if not authorized_transition and new.status in ('published', 'sold', 'inactive') then
      raise exception 'PROPERTY_TRANSITION_REQUIRES_SERVER_ACTION' using errcode = '42501';
    end if;
    if not (
      (old.status = 'draft' and new.status in ('pending_confirmation', 'published', 'archived'))
      or (old.status = 'pending_confirmation' and new.status in ('draft', 'published', 'archived'))
      or (old.status = 'published' and new.status in ('sold', 'inactive'))
      or (old.status in ('sold', 'inactive') and new.status = 'published')
    ) then
      raise exception 'INVALID_PROPERTY_TRANSITION' using errcode = 'P0001';
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

create function public.publish_property(
  target_property_id uuid,
  expected_property_version integer,
  request_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  property_row public.properties;
  prior_event public.property_publication_events;
  effective_limit integer;
  published_count integer;
begin
  if auth.uid() is null then
    return jsonb_build_object('outcome', 'forbidden');
  end if;
  if request_idempotency_key is null or char_length(trim(request_idempotency_key)) not between 8 and 200 then
    return jsonb_build_object('outcome', 'validation_failed');
  end if;

  select * into property_row from public.properties where id = target_property_id;
  if not found or not exists (
    select 1 from public.tenant_memberships as membership
    where membership.tenant_id = property_row.tenant_id
      and membership.user_id = auth.uid()
      and membership.role = 'owner'
      and membership.status = 'active'
  ) then
    return jsonb_build_object('outcome', 'forbidden');
  end if;

  perform 1 from public.tenants where id = property_row.tenant_id for update;
  select * into property_row from public.properties where id = target_property_id for update;

  select * into prior_event
  from public.property_publication_events
  where tenant_id = property_row.tenant_id and idempotency_key = trim(request_idempotency_key);
  if found then
    return jsonb_build_object(
      'outcome', 'already_published', 'propertyId', prior_event.property_id,
      'publishedCount', prior_event.published_count, 'limit', prior_event.active_property_limit
    );
  end if;

  if property_row.version <> expected_property_version then
    return jsonb_build_object('outcome', 'conflict');
  end if;
  if property_row.status = 'published' then
    return jsonb_build_object('outcome', 'already_published', 'propertyId', property_row.id);
  end if;
  if property_row.status not in ('draft', 'pending_confirmation', 'sold', 'inactive') then
    return jsonb_build_object('outcome', 'validation_failed');
  end if;
  if not exists (
    select 1 from public.property_confirmations as confirmation
    where confirmation.tenant_id = property_row.tenant_id
      and confirmation.property_id = property_row.id
      and confirmation.critical_version = property_row.critical_version
  ) then
    return jsonb_build_object('outcome', 'validation_failed');
  end if;

  select entitlement.integer_value into effective_limit
  from public.tenant_subscriptions as subscription
  join public.plan_entitlements as entitlement
    on entitlement.plan_code = subscription.plan_code
   and entitlement.entitlement_key = 'active_property_limit'
  where subscription.tenant_id = property_row.tenant_id
    and subscription.status = 'active'
    and subscription.starts_at <= now()
    and (subscription.ends_at is null or subscription.ends_at > now())
  order by subscription.starts_at desc limit 1;

  if effective_limit is null then
    return jsonb_build_object('outcome', 'validation_failed');
  end if;
  select count(*) into published_count from public.properties
  where tenant_id = property_row.tenant_id and status = 'published';
  if published_count >= effective_limit then
    return jsonb_build_object('outcome', 'quota_exceeded');
  end if;

  perform set_config('app.property_transition_authorized', 'true', true);
  update public.properties set status = 'published' where id = property_row.id;
  published_count := published_count + 1;

  insert into public.property_publication_events (
    tenant_id, property_id, actor_user_id, idempotency_key, outcome, published_count, active_property_limit
  ) values (
    property_row.tenant_id, property_row.id, auth.uid(), trim(request_idempotency_key),
    'published', published_count, effective_limit
  );
  insert into public.usage_ledger (tenant_id, event_type, source_type, source_id, idempotency_key)
  values (property_row.tenant_id, 'property_published', 'property', property_row.id, trim(request_idempotency_key));

  return jsonb_build_object(
    'outcome', 'published', 'propertyId', property_row.id,
    'publishedCount', published_count, 'limit', effective_limit
  );
end;
$$;

revoke all on function public.publish_property(uuid, integer, text) from public, anon;
grant execute on function public.publish_property(uuid, integer, text) to authenticated;

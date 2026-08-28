create type public.lead_kind as enum ('property', 'general');
create type public.lead_route_kind as enum ('property_owner', 'platform_intake');
create type public.intake_status as enum ('unassigned', 'acknowledged', 'closed');

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  kind public.lead_kind not null,
  tenant_id uuid references public.tenants (id) on delete restrict,
  property_id uuid references public.properties (id) on delete restrict,
  name text not null check (char_length(name) between 1 and 120),
  email text check (email is null or char_length(email) between 3 and 254),
  phone text check (phone is null or char_length(phone) between 6 and 40),
  message text not null check (char_length(message) between 1 and 2000),
  consent_purpose text not null check (char_length(consent_purpose) between 1 and 120),
  consent_version text not null check (char_length(consent_version) between 1 and 40),
  consented_at timestamptz not null,
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 200),
  created_at timestamptz not null default now(),
  unique (kind, idempotency_key),
  constraint leads_contact_required check (email is not null or phone is not null),
  constraint leads_route_shape check (
    (kind = 'property' and tenant_id is not null and property_id is not null)
    or (kind = 'general' and tenant_id is null and property_id is null)
  )
);

create index leads_tenant_created_idx on public.leads (tenant_id, created_at desc) where tenant_id is not null;

create table public.lead_routing_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete restrict,
  route_kind public.lead_route_kind not null,
  target_tenant_id uuid references public.tenants (id) on delete restrict,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (lead_id, route_kind),
  unique (idempotency_key),
  constraint routing_target_shape check (
    (route_kind = 'property_owner' and target_tenant_id is not null)
    or (route_kind = 'platform_intake' and target_tenant_id is null)
  )
);

create table public.platform_intake_queue (
  lead_id uuid primary key references public.leads (id) on delete restrict,
  status public.intake_status not null default 'unassigned',
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  constraint platform_intake_ack_shape check (
    (status = 'unassigned' and acknowledged_at is null) or status <> 'unassigned'
  )
);

create function private.reject_append_only_mutation()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'APPEND_ONLY' using errcode = '42501';
end;
$$;
create trigger leads_append_only before update or delete on public.leads for each row execute function private.reject_append_only_mutation();
create trigger lead_routing_events_append_only before update or delete on public.lead_routing_events for each row execute function private.reject_append_only_mutation();

alter table public.leads enable row level security;
alter table public.lead_routing_events enable row level security;
alter table public.platform_intake_queue enable row level security;

create policy leads_select_tenant_member on public.leads for select to authenticated using (
  tenant_id is not null and exists (
    select 1 from public.tenant_memberships as membership
    where membership.tenant_id = leads.tenant_id and membership.user_id = (select auth.uid()) and membership.status = 'active'
  )
);
create policy routing_events_select_tenant_member on public.lead_routing_events for select to authenticated using (
  target_tenant_id is not null and exists (
    select 1 from public.tenant_memberships as membership
    where membership.tenant_id = lead_routing_events.target_tenant_id and membership.user_id = (select auth.uid()) and membership.status = 'active'
  )
);

revoke all on public.leads, public.lead_routing_events, public.platform_intake_queue from anon, authenticated;
grant select on public.leads, public.lead_routing_events to authenticated;
revoke all on function private.reject_append_only_mutation() from public, anon, authenticated;

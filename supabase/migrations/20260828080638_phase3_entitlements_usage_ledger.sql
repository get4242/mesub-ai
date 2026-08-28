create type public.subscription_status as enum ('active', 'cancelled');

create table public.plans (
  code text primary key check (code ~ '^[a-z][a-z0-9_-]{1,49}$'),
  name text not null check (char_length(name) between 1 and 100),
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create unique index plans_single_default_idx on public.plans (is_default) where is_default;

create table public.plan_entitlements (
  plan_code text not null references public.plans (code) on delete restrict,
  entitlement_key text not null check (entitlement_key ~ '^[a-z][a-z0-9_]{1,79}$'),
  integer_value integer not null check (integer_value > 0),
  created_at timestamptz not null default now(),
  primary key (plan_code, entitlement_key)
);

create table public.tenant_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  plan_code text not null references public.plans (code) on delete restrict,
  status public.subscription_status not null default 'active',
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  constraint tenant_subscriptions_period check (ends_at is null or ends_at > starts_at)
);

create unique index tenant_subscriptions_one_active_idx
  on public.tenant_subscriptions (tenant_id)
  where status = 'active' and ends_at is null;

create type public.usage_event_type as enum (
  'property_published',
  'property_released',
  'lead_accepted',
  'notification_attempted',
  'notification_delivered',
  'notification_failed',
  'safety_cap_rejected'
);

create table public.usage_ledger (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  event_type public.usage_event_type not null,
  source_type text not null check (char_length(source_type) between 1 and 80),
  source_id uuid,
  idempotency_key text not null check (char_length(idempotency_key) between 1 and 200),
  quantity integer not null default 1 check (quantity > 0),
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  unique (tenant_id, event_type, idempotency_key)
);

create index usage_ledger_tenant_occurred_idx
  on public.usage_ledger (tenant_id, occurred_at desc);

insert into public.plans (code, name, is_default)
values ('free', 'Free', true);

insert into public.plan_entitlements (plan_code, entitlement_key, integer_value)
values ('free', 'active_property_limit', 3);

create function private.provision_free_subscription(target_tenant_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  subscription_id uuid;
begin
  insert into public.tenant_subscriptions (tenant_id, plan_code)
  values (target_tenant_id, 'free')
  on conflict (tenant_id) where status = 'active' and ends_at is null do nothing
  returning id into subscription_id;

  if subscription_id is null then
    select id into subscription_id
    from public.tenant_subscriptions
    where tenant_id = target_tenant_id and status = 'active' and ends_at is null;
  end if;

  return subscription_id;
end;
$$;

create function private.provision_tenant_free_subscription()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.provision_free_subscription(new.id);
  return new;
end;
$$;

create trigger tenants_provision_free_subscription
after insert on public.tenants
for each row execute function private.provision_tenant_free_subscription();

select private.provision_free_subscription(id) from public.tenants;

create function public.get_effective_entitlement(target_tenant_id uuid)
returns table (plan_code text, active_property_limit integer)
language sql
stable
security invoker
set search_path = ''
as $$
  select subscription.plan_code, entitlement.integer_value
  from public.tenant_subscriptions as subscription
  join public.plan_entitlements as entitlement
    on entitlement.plan_code = subscription.plan_code
   and entitlement.entitlement_key = 'active_property_limit'
  where subscription.tenant_id = target_tenant_id
    and subscription.status = 'active'
    and subscription.starts_at <= now()
    and (subscription.ends_at is null or subscription.ends_at > now())
  order by subscription.starts_at desc
  limit 1;
$$;

alter table public.plans enable row level security;
alter table public.plan_entitlements enable row level security;
alter table public.tenant_subscriptions enable row level security;
alter table public.usage_ledger enable row level security;

create policy tenant_subscriptions_select_member
on public.tenant_subscriptions for select to authenticated
using (
  exists (
    select 1 from public.tenant_memberships as membership
    where membership.tenant_id = tenant_subscriptions.tenant_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
  )
);

create policy usage_ledger_select_member
on public.usage_ledger for select to authenticated
using (
  exists (
    select 1 from public.tenant_memberships as membership
    where membership.tenant_id = usage_ledger.tenant_id
      and membership.user_id = (select auth.uid())
      and membership.status = 'active'
  )
);

revoke all on public.plans, public.plan_entitlements, public.tenant_subscriptions, public.usage_ledger
  from anon, authenticated;
grant select on public.plans, public.plan_entitlements, public.tenant_subscriptions, public.usage_ledger
  to authenticated;

revoke all on function private.provision_free_subscription(uuid) from public, anon, authenticated;
revoke all on function private.provision_tenant_free_subscription() from public, anon, authenticated;
revoke all on function public.get_effective_entitlement(uuid) from public, anon;
grant execute on function public.get_effective_entitlement(uuid) to authenticated;

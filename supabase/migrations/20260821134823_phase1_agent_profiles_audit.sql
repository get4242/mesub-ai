create type public.agent_verification_status as enum ('unverified', 'pending', 'verified', 'rejected');

create table public.agent_profiles (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null unique references public.tenants (id) on delete cascade,
  user_id uuid not null unique references auth.users (id) on delete cascade,
  public_display_name text not null check (char_length(public_display_name) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  brand_name text check (brand_name is null or char_length(brand_name) between 1 and 120),
  bio text check (bio is null or char_length(bio) <= 2000),
  public_email text,
  public_phone text,
  show_email boolean not null default false,
  show_phone boolean not null default false,
  verification_status public.agent_verification_status not null default 'unverified',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_profiles_public_email_opt_in check (not show_email or public_email is not null),
  constraint agent_profiles_public_phone_opt_in check (not show_phone or public_phone is not null)
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  actor_user_id uuid references auth.users (id) on delete set null,
  action text not null check (char_length(action) between 1 and 100),
  entity_type text not null check (char_length(entity_type) between 1 and 100),
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now()
);

create index agent_profiles_user_id_idx on public.agent_profiles (user_id);
create index audit_logs_tenant_created_idx on public.audit_logs (tenant_id, created_at desc);
create index audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);

create trigger agent_profiles_set_updated_at
before update on public.agent_profiles
for each row execute function private.set_updated_at();

create function private.write_audit_log(
  target_tenant_id uuid,
  target_action text,
  target_entity_type text,
  target_entity_id uuid default null,
  safe_metadata jsonb default '{}'::jsonb
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_id bigint;
begin
  if jsonb_typeof(safe_metadata) <> 'object' then
    raise exception 'audit metadata must be a JSON object' using errcode = '22023';
  end if;

  insert into public.audit_logs (tenant_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (target_tenant_id, auth.uid(), target_action, target_entity_type, target_entity_id, safe_metadata)
  returning id into inserted_id;

  return inserted_id;
end;
$$;

revoke all on function private.write_audit_log(uuid, text, text, uuid, jsonb) from public, anon, authenticated;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_tenant_id uuid := gen_random_uuid();
  tenant_name text;
begin
  tenant_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Mesub Agent'
  );

  insert into public.profiles (user_id, display_name)
  values (new.id, tenant_name);

  insert into public.tenants (id, type, name, slug, created_by_user_id)
  values (
    new_tenant_id,
    'personal',
    tenant_name,
    'agent-' || replace(new_tenant_id::text, '-', ''),
    new.id
  );

  insert into public.tenant_memberships (tenant_id, user_id, role, status)
  values (new_tenant_id, new.id, 'owner', 'active');

  insert into public.agent_profiles (tenant_id, user_id, public_display_name, slug)
  values (
    new_tenant_id,
    new.id,
    tenant_name,
    'agent-' || replace(new_tenant_id::text, '-', '')
  );

  return new;
end;
$$;

insert into public.agent_profiles (tenant_id, user_id, public_display_name, slug)
select
  tenant.id,
  membership.user_id,
  profile.display_name,
  'agent-' || replace(tenant.id::text, '-', '')
from public.tenants as tenant
join public.tenant_memberships as membership
  on membership.tenant_id = tenant.id
 and membership.role = 'owner'
 and membership.status = 'active'
join public.profiles as profile on profile.user_id = membership.user_id
where tenant.type = 'personal'
on conflict do nothing;

alter table public.agent_profiles enable row level security;
alter table public.audit_logs enable row level security;

create policy agent_profiles_select_owner
on public.agent_profiles
for select
to authenticated
using (
  exists (
    select 1
    from public.tenant_memberships as membership
    where membership.tenant_id = agent_profiles.tenant_id
      and membership.user_id = (select auth.uid())
      and membership.role = 'owner'
      and membership.status = 'active'
  )
);

create policy agent_profiles_update_owner
on public.agent_profiles
for update
to authenticated
using (
  exists (
    select 1
    from public.tenant_memberships as membership
    where membership.tenant_id = agent_profiles.tenant_id
      and membership.user_id = (select auth.uid())
      and membership.role = 'owner'
      and membership.status = 'active'
  )
)
with check (
  exists (
    select 1
    from public.tenant_memberships as membership
    where membership.tenant_id = agent_profiles.tenant_id
      and membership.user_id = (select auth.uid())
      and membership.role = 'owner'
      and membership.status = 'active'
  )
);

revoke all on public.agent_profiles from anon, authenticated;
revoke all on public.audit_logs from anon, authenticated;

grant select on public.agent_profiles to authenticated;
grant update (
  public_display_name,
  slug,
  brand_name,
  bio,
  public_email,
  public_phone,
  show_email,
  show_phone
) on public.agent_profiles to authenticated;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.platform_role as enum ('user', 'admin');
create type public.profile_status as enum ('active', 'suspended');
create type public.tenant_type as enum ('personal', 'agency');
create type public.tenant_status as enum ('active', 'suspended', 'archived');
create type public.membership_role as enum ('owner', 'member');
create type public.membership_status as enum ('active', 'invited', 'revoked');

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 120),
  phone text,
  locale text not null default 'th-TH',
  platform_role public.platform_role not null default 'user',
  status public.profile_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  type public.tenant_type not null default 'personal',
  name text not null check (char_length(name) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  status public.tenant_status not null default 'active',
  created_by_user_id uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.membership_role not null,
  status public.membership_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

create index tenant_memberships_user_id_idx on public.tenant_memberships (user_id);
create index tenant_memberships_active_tenant_user_idx
  on public.tenant_memberships (tenant_id, user_id)
  where status = 'active';
create index tenants_created_by_user_id_idx on public.tenants (created_by_user_id);

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger tenants_set_updated_at
before update on public.tenants
for each row execute function private.set_updated_at();

create trigger tenant_memberships_set_updated_at
before update on public.tenant_memberships
for each row execute function private.set_updated_at();

create function private.handle_new_user()
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

  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;
revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

alter table public.profiles enable row level security;
alter table public.tenants enable row level security;
alter table public.tenant_memberships enable row level security;

create policy profiles_select_own
on public.profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy profiles_update_own
on public.profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy memberships_select_own
on public.tenant_memberships
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy tenants_select_member
on public.tenants
for select
to authenticated
using (
  id in (
    select membership.tenant_id
    from public.tenant_memberships as membership
    where membership.user_id = (select auth.uid())
      and membership.status = 'active'
  )
);

create policy tenants_update_owner
on public.tenants
for update
to authenticated
using (
  id in (
    select membership.tenant_id
    from public.tenant_memberships as membership
    where membership.user_id = (select auth.uid())
      and membership.role = 'owner'
      and membership.status = 'active'
  )
)
with check (
  id in (
    select membership.tenant_id
    from public.tenant_memberships as membership
    where membership.user_id = (select auth.uid())
      and membership.role = 'owner'
      and membership.status = 'active'
  )
);

revoke all on public.profiles from anon, authenticated;
revoke all on public.tenants from anon, authenticated;
revoke all on public.tenant_memberships from anon, authenticated;

grant select on public.profiles to authenticated;
grant update (display_name, phone, locale) on public.profiles to authenticated;
grant select on public.tenants to authenticated;
grant update (name, slug) on public.tenants to authenticated;
grant select on public.tenant_memberships to authenticated;

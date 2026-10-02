create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  agent_id uuid not null,
  property_id uuid not null,
  lead_id uuid references public.leads(id),
  customer_name text not null check(length(trim(customer_name)) between 1 and 120),
  customer_phone text check(customer_phone is null or length(customer_phone) between 6 and 40),
  customer_email text check(customer_email is null or length(customer_email) between 3 and 254),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'requested' check(status in ('requested','confirmed','cancelled')),
  notes text not null default '' check(length(notes)<=2000),
  version integer not null default 1,
  reminder_minutes integer not null default 60 check(reminder_minutes between 5 and 1440),
  reminder_queued_version integer,
  requester_provider text,
  requester_environment text,
  requester_subject_hash text,
  idempotency_key text not null check(length(idempotency_key) between 8 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key(tenant_id,agent_id) references public.agent_profiles(tenant_id,id),
  foreign key(tenant_id,property_id) references public.properties(tenant_id,id),
  unique(tenant_id,idempotency_key),
  check(ends_at>starts_at and ends_at<=starts_at+interval '8 hours'),
  check(customer_phone is not null or customer_email is not null)
);
create index appointments_agent_time on public.appointments(tenant_id,agent_id,starts_at) where status<>'cancelled';
create index appointments_due_reminders on public.appointments(starts_at) where status='confirmed';
alter table public.appointments enable row level security;
create policy appointments_owner_read on public.appointments for select to authenticated using (
  exists(select 1 from public.agent_profiles a join public.tenant_memberships m on m.tenant_id=a.tenant_id and m.user_id=a.user_id
    where a.id=appointments.agent_id and a.tenant_id=appointments.tenant_id and a.user_id=(select auth.uid()) and m.role='owner' and m.status='active')
);
revoke all on public.appointments from public,anon,authenticated;
grant select on public.appointments to authenticated;

create function private.appointment_owner(target_property uuid)
returns public.agent_profiles language plpgsql stable security definer set search_path='' as $$
declare agent public.agent_profiles;
begin
  select a.* into agent from public.agent_profiles a join public.properties p on p.tenant_id=a.tenant_id and p.owner_agent_id=a.id
  join public.tenant_memberships m on m.tenant_id=a.tenant_id and m.user_id=a.user_id
  where p.id=target_property and a.user_id=auth.uid() and m.role='owner' and m.status='active';
  if not found then raise exception 'APPOINTMENT_FORBIDDEN' using errcode='42501'; end if;
  return agent;
end $$;
revoke all on function private.appointment_owner(uuid) from public,anon,authenticated;

create type public.notification_delivery_status as enum ('queued', 'running', 'delivered', 'dead_letter');

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  lead_id uuid not null references public.leads (id) on delete restrict,
  kind text not null default 'new_lead' check (kind = 'new_lead'),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tenant_id, lead_id, kind)
);
create index notifications_tenant_unread_idx on public.notifications (tenant_id, created_at desc) where read_at is null;

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications (id) on delete cascade,
  channel text not null check (channel = 'email'),
  status public.notification_delivery_status not null default 'queued',
  attempt_count integer not null default 0 check (attempt_count between 0 and 3),
  provider text,
  provider_receipt_id text,
  last_error_code text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (notification_id, channel)
);

select pgmq.create('mesub_notification_jobs');

create function private.enqueue_notification(target_notification_id uuid)
returns bigint language plpgsql security definer set search_path = '' as $$
declare message_id bigint;
begin
  if not exists (select 1 from public.notifications where id = target_notification_id) then
    raise exception 'NOTIFICATION_NOT_FOUND' using errcode = 'P0002';
  end if;
  select pgmq.send('mesub_notification_jobs', jsonb_build_object('notificationId', target_notification_id, 'schemaVersion', 1)) into message_id;
  return message_id;
end;
$$;

create function private.create_lead_notification()
returns trigger language plpgsql security definer set search_path = '' as $$
declare notification_id uuid;
begin
  if new.route_kind <> 'property_owner' then return new; end if;
  insert into public.notifications (tenant_id, lead_id) values (new.target_tenant_id, new.lead_id)
  on conflict (tenant_id, lead_id, kind) do update set tenant_id = excluded.tenant_id
  returning id into notification_id;
  insert into public.notification_deliveries (notification_id, channel) values (notification_id, 'email')
  on conflict (notification_id, channel) do nothing;
  perform private.enqueue_notification(notification_id);
  return new;
end;
$$;
create trigger lead_routing_create_notification after insert on public.lead_routing_events
for each row execute function private.create_lead_notification();

create function public.read_notification_jobs_server(visibility_timeout_seconds integer default 60, batch_size integer default 1)
returns table (message_id bigint, read_count integer, message jsonb)
language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  return query select job.msg_id, job.read_ct, job.message
  from pgmq.read('mesub_notification_jobs', greatest(1, least(visibility_timeout_seconds, 3600)), greatest(1, least(batch_size, 10))) as job;
end;
$$;

create function public.archive_notification_job_server(message_id bigint)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  return pgmq.archive('mesub_notification_jobs', message_id);
end;
$$;

alter table public.notifications enable row level security;
alter table public.notification_deliveries enable row level security;
create policy notifications_select_member on public.notifications for select to authenticated using (
  exists (select 1 from public.tenant_memberships m where m.tenant_id = notifications.tenant_id and m.user_id = (select auth.uid()) and m.status = 'active')
);
create policy notification_deliveries_select_member on public.notification_deliveries for select to authenticated using (
  exists (select 1 from public.notifications n join public.tenant_memberships m on m.tenant_id = n.tenant_id
    where n.id = notification_deliveries.notification_id and m.user_id = (select auth.uid()) and m.status = 'active')
);
revoke all on public.notifications, public.notification_deliveries from anon, authenticated;
grant select on public.notifications, public.notification_deliveries to authenticated;
revoke all on function private.enqueue_notification(uuid) from public, anon, authenticated;
revoke all on function private.create_lead_notification() from public, anon, authenticated;
revoke all on function public.read_notification_jobs_server(integer, integer) from public, anon, authenticated;
revoke all on function public.archive_notification_job_server(bigint) from public, anon, authenticated;
grant execute on function public.read_notification_jobs_server(integer, integer) to service_role;
grant execute on function public.archive_notification_job_server(bigint) to service_role;

create table public.line_identity_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider_id text not null check (char_length(provider_id) between 1 and 120),
  environment text not null check (environment in ('development','review','production')),
  subject_hash text not null check (char_length(subject_hash) = 64),
  consent_version text not null check (char_length(consent_version) between 1 and 40),
  linked_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint line_identity_link_state check (revoked_at is null or revoked_at >= linked_at)
);
create unique index line_identity_active_subject_idx on public.line_identity_links(provider_id,environment,subject_hash) where revoked_at is null;
create unique index line_identity_active_user_idx on public.line_identity_links(provider_id,environment,user_id) where revoked_at is null;

create table public.line_link_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_hash text not null unique check (char_length(challenge_hash)=64),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint line_challenge_time check (expires_at > created_at),
  constraint line_challenge_consumed check (consumed_at is null or consumed_at >= created_at)
);

create table public.line_notification_consents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  consent_version text,
  consented_at timestamptz,
  revoked_at timestamptz,
  quiet_hours_start time,
  quiet_hours_end time,
  updated_at timestamptz not null default now(),
  constraint line_consent_shape check (
    (enabled and consent_version is not null and consented_at is not null and revoked_at is null)
    or (not enabled)
  )
);

create table public.line_webhook_receipts (
  event_id text primary key check (char_length(event_id) between 1 and 200),
  environment text not null check (environment in ('development','review','production')),
  event_type text not null check (char_length(event_type) between 1 and 60),
  event_timestamp_ms bigint not null check (event_timestamp_ms >= 0),
  normalized_payload jsonb not null default '{}'::jsonb,
  status text not null default 'queued' check (status in ('queued','running','completed','ignored','dead_letter')),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  retention_until timestamptz not null,
  constraint line_webhook_payload_object check (jsonb_typeof(normalized_payload)='object')
);

create table public.line_delivery_attempts (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  line_link_id uuid not null references public.line_identity_links(id) on delete restrict,
  idempotency_key text not null unique check (char_length(idempotency_key) between 8 and 200),
  status text not null default 'queued' check (status in ('queued','running','delivered','dead_letter')),
  attempt_count integer not null default 0 check (attempt_count between 0 and 3),
  provider_receipt_id text,
  last_error_code text,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.line_audit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (char_length(event_type) between 1 and 80),
  line_link_id uuid references public.line_identity_links(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  retention_until timestamptz not null default (now() + interval '2 years'),
  constraint line_audit_metadata_object check (jsonb_typeof(metadata)='object')
);
create trigger line_audit_events_append_only before update or delete on public.line_audit_events for each row execute function private.reject_append_only_mutation();

select pgmq.create('mesub_line_jobs');

alter table public.line_identity_links enable row level security;
alter table public.line_link_challenges enable row level security;
alter table public.line_notification_consents enable row level security;
alter table public.line_webhook_receipts enable row level security;
alter table public.line_delivery_attempts enable row level security;
alter table public.line_audit_events enable row level security;

create policy line_links_select_self on public.line_identity_links for select to authenticated using (user_id=(select auth.uid()));
create policy line_consents_select_self on public.line_notification_consents for select to authenticated using (user_id=(select auth.uid()));
create policy line_audit_select_self on public.line_audit_events for select to authenticated using (user_id=(select auth.uid()));

revoke all on public.line_identity_links, public.line_link_challenges, public.line_notification_consents, public.line_webhook_receipts, public.line_delivery_attempts, public.line_audit_events from public, anon, authenticated;
grant select on public.line_identity_links, public.line_notification_consents, public.line_audit_events to authenticated;

create function public.create_line_link_server(
  target_user_id uuid,
  target_provider_id text,
  target_environment text,
  target_subject_hash text,
  target_challenge_hash text
) returns uuid language plpgsql security definer set search_path='' as $$
declare challenge public.line_link_challenges; link_id uuid;
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if target_environment not in ('development','review') then raise exception 'ENVIRONMENT_FORBIDDEN' using errcode='42501'; end if;
  select * into challenge from public.line_link_challenges
    where user_id=target_user_id and challenge_hash=target_challenge_hash and consumed_at is null and expires_at>now()
    for update;
  if not found then raise exception 'LINK_CHALLENGE_INVALID' using errcode='55000'; end if;
  update public.line_link_challenges set consumed_at=now() where id=challenge.id;
  insert into public.line_identity_links(user_id,provider_id,environment,subject_hash,consent_version)
  values(target_user_id,trim(target_provider_id),target_environment,target_subject_hash,'line-link-v1')
  returning id into link_id;
  insert into public.line_audit_events(user_id,event_type,line_link_id) values(target_user_id,'line_identity_linked',link_id);
  return link_id;
end $$;

create function public.revoke_line_link_server(target_user_id uuid,target_provider_id text)
returns boolean language plpgsql security definer set search_path='' as $$
declare link_id uuid;
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  update public.line_identity_links set revoked_at=now()
  where user_id=target_user_id and provider_id=target_provider_id and revoked_at is null returning id into link_id;
  if link_id is null then return false; end if;
  insert into public.line_audit_events(user_id,event_type,line_link_id) values(target_user_id,'line_identity_unlinked',link_id);
  update public.line_notification_consents set enabled=false,revoked_at=now(),updated_at=now() where user_id=target_user_id;
  return true;
end $$;

create function public.accept_line_webhook_server(
  target_event_id text,
  target_environment text,
  target_event_type text,
  target_timestamp_ms bigint,
  target_payload jsonb,
  target_retention_until timestamptz
) returns boolean language plpgsql security definer set search_path='' as $$
declare affected integer; message_id bigint;
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if target_environment not in ('development','review') then raise exception 'ENVIRONMENT_FORBIDDEN' using errcode='42501'; end if;
  insert into public.line_webhook_receipts(event_id,environment,event_type,event_timestamp_ms,normalized_payload,retention_until)
  values(target_event_id,target_environment,target_event_type,target_timestamp_ms,coalesce(target_payload,'{}'::jsonb),target_retention_until)
  on conflict(event_id) do nothing;
  get diagnostics affected = row_count;
  if affected = 0 then return false; end if;
  select pgmq.send('mesub_line_jobs',jsonb_build_object('eventId',target_event_id,'schemaVersion',1)) into message_id;
  return true;
end $$;

create function public.read_line_jobs_server(visibility_timeout_seconds integer default 60,batch_size integer default 1)
returns table(message_id bigint,read_count integer,message jsonb)
language plpgsql security definer set search_path='' as $$
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  return query select job.msg_id,job.read_ct,job.message from pgmq.read('mesub_line_jobs',greatest(1,least(visibility_timeout_seconds,3600)),greatest(1,least(batch_size,10))) job;
end $$;

create function public.archive_line_job_server(message_id bigint)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  return pgmq.archive('mesub_line_jobs',message_id);
end $$;

revoke all on function public.create_line_link_server(uuid,text,text,text,text) from public,anon,authenticated;
revoke all on function public.revoke_line_link_server(uuid,text) from public,anon,authenticated;
revoke all on function public.accept_line_webhook_server(text,text,text,bigint,jsonb,timestamptz) from public,anon,authenticated;
revoke all on function public.read_line_jobs_server(integer,integer) from public,anon,authenticated;
revoke all on function public.archive_line_job_server(bigint) from public,anon,authenticated;
grant execute on function public.create_line_link_server(uuid,text,text,text,text) to service_role;
grant execute on function public.revoke_line_link_server(uuid,text) to service_role;
grant execute on function public.accept_line_webhook_server(text,text,text,bigint,jsonb,timestamptz) to service_role;
grant execute on function public.read_line_jobs_server(integer,integer) to service_role;
grant execute on function public.archive_line_job_server(bigint) to service_role;

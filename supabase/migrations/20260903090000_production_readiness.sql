-- Production Readiness (migration 27): additive service-role worker bridges and
-- Production support. Existing RLS and tenant policies remain unchanged.

create or replace function public.create_line_link_server(
  target_user_id uuid, target_provider_id text, target_environment text,
  target_subject_hash text, target_subject_ciphertext text, target_challenge_hash text
) returns uuid language plpgsql security definer set search_path='' as $$
declare challenge public.line_link_challenges; link_id uuid;
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if target_environment not in ('development','review','production') then raise exception 'ENVIRONMENT_FORBIDDEN' using errcode='42501'; end if;
  if char_length(coalesce(target_subject_ciphertext,'')) < 40 then raise exception 'DESTINATION_REQUIRED' using errcode='22023'; end if;
  select * into challenge from public.line_link_challenges where user_id=target_user_id and challenge_hash=target_challenge_hash and consumed_at is null and expires_at>now() for update;
  if not found then raise exception 'LINK_CHALLENGE_INVALID' using errcode='55000'; end if;
  update public.line_link_challenges set consumed_at=now() where id=challenge.id;
  insert into public.line_identity_links(user_id,provider_id,environment,subject_hash,subject_ciphertext,consent_version)
  values(target_user_id,trim(target_provider_id),target_environment,target_subject_hash,target_subject_ciphertext,'line-link-v1') returning id into link_id;
  insert into public.line_audit_events(user_id,event_type,line_link_id) values(target_user_id,'line_identity_linked',link_id);
  return link_id;
end $$;

create or replace function public.accept_line_webhook_server(
  target_event_id text, target_environment text, target_event_type text,
  target_timestamp_ms bigint, target_payload jsonb, target_retention_until timestamptz
) returns boolean language plpgsql security definer set search_path='' as $$
declare affected integer;
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if target_environment not in ('development','review','production') then raise exception 'ENVIRONMENT_FORBIDDEN' using errcode='42501'; end if;
  insert into public.line_webhook_receipts(event_id,environment,event_type,event_timestamp_ms,normalized_payload,retention_until)
  values(target_event_id,target_environment,target_event_type,target_timestamp_ms,coalesce(target_payload,'{}'::jsonb),target_retention_until) on conflict(event_id) do nothing;
  get diagnostics affected=row_count;
  if affected=0 then return false; end if;
  perform pgmq.send('mesub_line_jobs',jsonb_build_object('eventId',target_event_id,'schemaVersion',1));
  return true;
end $$;

create function public.claim_ai_run_server(target_run_id uuid)
returns table(id uuid,attempt integer,snapshot jsonb,task text,model text,source_ids text[])
language plpgsql security definer set search_path='' as $$
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  return query
  with claimed as (
    update public.ai_runs r set state='running',attempt_count=attempt_count+1,started_at=now(),retryable=false,error_category=null
    where r.id=target_run_id and r.state='queued' and coalesce(r.next_attempt_at,now())<=now()
    returning r.*
  )
  select c.id,c.attempt_count,c.input_snapshot,c.model_profile_key::text,coalesce(c.resolved_model_id,''),
    coalesce(array_agg(s.id::text) filter(where s.id is not null),array[]::text[])
  from claimed c left join public.ai_sources s on s.tenant_id=c.tenant_id and s.ai_run_id=c.id
  group by c.id,c.attempt_count,c.input_snapshot,c.model_profile_key,c.resolved_model_id;
end $$;

create function public.complete_ai_run_server(
  target_run_id uuid,target_provider_request_id text,target_resolved_model_id text,
  target_input_tokens integer,target_output_tokens integer,target_suggestions jsonb
)
returns boolean language plpgsql security definer set search_path='' as $$
declare target public.ai_runs; suggestion jsonb; inserted_suggestion uuid; source_id text;
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select * into target from public.ai_runs where id=target_run_id and state='running' for update;
  if not found then return false; end if;
  for suggestion in select value from jsonb_array_elements(coalesce(target_suggestions,'[]'::jsonb)) loop
    insert into public.ai_suggestions(tenant_id,property_id,ai_run_id,field_key,proposed_value,confidence,confidence_unknown,validation_status)
    values(target.tenant_id,target.property_id,target.id,suggestion->>'fieldKey',suggestion->'value',
      case when (suggestion->>'confidenceUnknown')::boolean then null else (suggestion->>'confidence')::numeric end,
      (suggestion->>'confidenceUnknown')::boolean,'valid') returning id into inserted_suggestion;
    for source_id in select jsonb_array_elements_text(coalesce(suggestion->'sourceIds','[]'::jsonb)) loop
      insert into public.ai_suggestion_sources(tenant_id,suggestion_id,source_id)
      values(target.tenant_id,inserted_suggestion,source_id::uuid);
    end loop;
  end loop;
  insert into public.ai_usage_events(tenant_id,ai_run_id,attempt,task_key,measurement_status,input_tokens,output_tokens,outcome,provider_request_id)
  values(target.tenant_id,target.id,target.attempt_count,target.model_profile_key,
    case when target_input_tokens is null or target_output_tokens is null then 'unknown'::public.ai_measurement_status else 'measured'::public.ai_measurement_status end,
    target_input_tokens,target_output_tokens,'succeeded',target_provider_request_id);
  update public.ai_runs set state='succeeded',provider_request_id=target_provider_request_id,resolved_model_id=target_resolved_model_id,finished_at=now(),retryable=false where id=target_run_id;
  return true;
end $$;

create function public.read_ai_jobs_server(visibility_timeout_seconds integer default 60,batch_size integer default 1)
returns table(message_id bigint,read_count integer,message jsonb)
language plpgsql security definer set search_path='' as $$
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  return query select j.msg_id,j.read_ct,j.message from pgmq.read('mesub_ai_jobs',greatest(1,least(visibility_timeout_seconds,3600)),greatest(1,least(batch_size,10))) j;
end $$;

create function public.archive_ai_job_server(message_id bigint)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  return pgmq.archive('mesub_ai_jobs',message_id);
end $$;

create function public.fail_ai_run_server(target_run_id uuid,target_error_category text,target_retryable boolean,target_dead_letter boolean)
returns text language plpgsql security definer set search_path='' as $$
declare next_state public.ai_run_state;
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select case when target_dead_letter then 'dead_letter'::public.ai_run_state when target_retryable then 'queued'::public.ai_run_state else 'failed'::public.ai_run_state end into next_state;
  update public.ai_runs set state=next_state,retryable=target_retryable,error_category=left(target_error_category,80),
    next_attempt_at=case when target_retryable and not target_dead_letter then now()+interval '1 minute' else null end,
    finished_at=case when next_state in ('failed','dead_letter') then now() else null end where id=target_run_id and state='running';
  return next_state::text;
end $$;

create function public.claim_line_webhook_server(target_event_id text)
returns table(event_id text,event_type text,payload jsonb)
language plpgsql security definer set search_path='' as $$
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  return query
  with claimed as (
    update public.line_webhook_receipts r set status='running'
      where r.event_id=target_event_id and r.status='queued'
      returning r.event_id,r.event_type,r.normalized_payload
  )
  select c.event_id,c.event_type,c.normalized_payload from claimed c;
end $$;

create function public.complete_line_webhook_server(target_event_id text,target_ignored boolean default false)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  update public.line_webhook_receipts set status=case when target_ignored then 'ignored' else 'completed' end,processed_at=now() where event_id=target_event_id and status='running';
  return found;
end $$;

create function public.fail_line_webhook_server(target_event_id text,target_dead_letter boolean)
returns text language plpgsql security definer set search_path='' as $$
declare next_state text:=case when target_dead_letter then 'dead_letter' else 'queued' end;
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  update public.line_webhook_receipts set status=next_state,processed_at=case when target_dead_letter then now() else null end where event_id=target_event_id and status='running';
  return next_state;
end $$;

do $$
begin
  if not exists(select 1 from pgmq.list_queues() where queue_name='mesub_line_notification_jobs') then
    perform pgmq.create('mesub_line_notification_jobs');
  end if;
end $$;

create function private.enqueue_line_delivery()
returns trigger language plpgsql security definer set search_path='' as $$
declare link_id uuid; attempt_id uuid;
begin
  select l.id into link_id from public.line_identity_links l
  join public.line_notification_consents c on c.user_id=l.user_id and c.enabled
  join public.tenant_memberships m on m.user_id=l.user_id and m.tenant_id=new.tenant_id and m.status='active'
  where l.revoked_at is null order by l.linked_at desc limit 1;
  if link_id is null then return new; end if;
  insert into public.line_delivery_attempts(notification_id,line_link_id,idempotency_key)
  values(new.id,link_id,'line-notification:'||new.id::text) on conflict(idempotency_key) do nothing returning id into attempt_id;
  if attempt_id is not null then perform pgmq.send('mesub_line_notification_jobs',jsonb_build_object('notificationId',attempt_id,'schemaVersion',1)); end if;
  return new;
end $$;
create trigger notifications_enqueue_line after insert on public.notifications for each row execute function private.enqueue_line_delivery();

create function public.read_line_notification_jobs_server(visibility_timeout_seconds integer default 60,batch_size integer default 1)
returns table(message_id bigint,read_count integer,message jsonb) language plpgsql security definer set search_path='' as $$
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  return query select j.msg_id,j.read_ct,j.message from pgmq.read('mesub_line_notification_jobs',greatest(1,least(visibility_timeout_seconds,3600)),greatest(1,least(batch_size,10))) j;
end $$;

create function public.archive_line_notification_job_server(message_id bigint)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  return pgmq.archive('mesub_line_notification_jobs',message_id);
end $$;

create function public.claim_line_delivery_server(target_delivery_id uuid,target_cap integer default 20)
returns table(notification_id text,destination text,message text,attempt integer)
language plpgsql security definer set search_path='' as $$
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  return query with claimed as (
    update public.line_delivery_attempts d set status='running',attempt_count=attempt_count+1,updated_at=now()
    from public.line_identity_links l,public.line_notification_consents c,public.notifications n,public.leads lead
    where d.id=target_delivery_id and d.status='queued' and d.line_link_id=l.id and l.revoked_at is null
      and c.user_id=l.user_id and c.enabled and d.notification_id=n.id and n.lead_id=lead.id
      and (select count(*) from public.line_delivery_attempts sent where sent.line_link_id=l.id and sent.status='delivered' and sent.delivered_at>=date_trunc('day',now()))<greatest(1,least(target_cap,100))
    returning d.id::text as notification_id,l.subject_ciphertext as destination,('ลูกค้าใหม่สนใจทรัพย์: '||lead.name) as message,d.attempt_count as attempt
  ) select c.notification_id,c.destination,c.message,c.attempt from claimed c;
end $$;

create function public.complete_line_delivery_server(target_delivery_id uuid,target_provider text,target_receipt_id text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  update public.line_delivery_attempts set status='delivered',provider_receipt_id=left(target_receipt_id,200),last_error_code=null,delivered_at=now(),updated_at=now() where id=target_delivery_id and status='running';
  return found;
end $$;

create function public.fail_line_delivery_server(target_delivery_id uuid,target_error_code text)
returns text language plpgsql security definer set search_path='' as $$
declare next_state text;
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  update public.line_delivery_attempts set status=case when attempt_count>=3 then 'dead_letter' else 'queued' end,
    last_error_code=left(target_error_code,80),updated_at=now() where id=target_delivery_id and status='running' returning status into next_state;
  return coalesce(next_state,'unchanged');
end $$;

create function public.claim_platform_intake_server(batch_size integer default 1)
returns table(lead_id uuid) language plpgsql security definer set search_path='' as $$
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  return query with targets as (
    select q.lead_id from public.platform_intake_queue q where q.status='unassigned' order by q.created_at for update skip locked limit greatest(1,least(batch_size,10))
  ) update public.platform_intake_queue q set status='acknowledged',acknowledged_at=now() from targets t where q.lead_id=t.lead_id returning q.lead_id;
end $$;

revoke all on function public.create_line_link_server(uuid,text,text,text,text,text) from public,anon,authenticated;
revoke all on function public.accept_line_webhook_server(text,text,text,bigint,jsonb,timestamptz) from public,anon,authenticated;
revoke all on function public.read_ai_jobs_server(integer,integer),public.archive_ai_job_server(bigint),public.claim_ai_run_server(uuid),public.complete_ai_run_server(uuid,text,text,integer,integer,jsonb),public.fail_ai_run_server(uuid,text,boolean,boolean) from public,anon,authenticated;
revoke all on function public.claim_line_webhook_server(text),public.complete_line_webhook_server(text,boolean),public.fail_line_webhook_server(text,boolean) from public,anon,authenticated;
revoke all on function public.read_line_notification_jobs_server(integer,integer),public.archive_line_notification_job_server(bigint),public.claim_line_delivery_server(uuid,integer),public.complete_line_delivery_server(uuid,text,text),public.fail_line_delivery_server(uuid,text),public.claim_platform_intake_server(integer) from public,anon,authenticated;
revoke all on function private.enqueue_line_delivery() from public,anon,authenticated;
grant execute on function public.create_line_link_server(uuid,text,text,text,text,text),public.accept_line_webhook_server(text,text,text,bigint,jsonb,timestamptz) to service_role;
grant execute on function public.read_ai_jobs_server(integer,integer),public.archive_ai_job_server(bigint),public.claim_ai_run_server(uuid),public.complete_ai_run_server(uuid,text,text,integer,integer,jsonb),public.fail_ai_run_server(uuid,text,boolean,boolean) to service_role;
grant execute on function public.claim_line_webhook_server(text),public.complete_line_webhook_server(text,boolean),public.fail_line_webhook_server(text,boolean) to service_role;
grant execute on function public.read_line_notification_jobs_server(integer,integer),public.archive_line_notification_job_server(bigint),public.claim_line_delivery_server(uuid,integer),public.complete_line_delivery_server(uuid,text,text),public.fail_line_delivery_server(uuid,text),public.claim_platform_intake_server(integer) to service_role;

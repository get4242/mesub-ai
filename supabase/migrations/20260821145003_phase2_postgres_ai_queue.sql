create extension if not exists pgmq;

select pgmq.create('mesub_ai_jobs');

create function private.enqueue_ai_run(run_id uuid, tenant_id uuid, trace_id uuid, schema_version integer)
returns bigint language plpgsql security definer set search_path = '' as $$
declare message_id bigint;
begin
  if run_id is null or tenant_id is null or trace_id is null or schema_version < 1 then
    raise exception 'INVALID_QUEUE_MESSAGE' using errcode='22023';
  end if;
  if not exists (select 1 from public.ai_runs r where r.id=run_id and r.tenant_id=tenant_id and r.trace_id=trace_id) then
    raise exception 'AI_RUN_NOT_FOUND' using errcode='P0002';
  end if;
  select pgmq.send('mesub_ai_jobs', jsonb_build_object(
    'runId',run_id,'tenantId',tenant_id,'traceId',trace_id,'schemaVersion',schema_version
  )) into message_id;
  return message_id;
end;
$$;

create function private.read_ai_run_jobs(visibility_timeout_seconds integer default 60, batch_size integer default 1)
returns table (message_id bigint, read_count integer, enqueued_at timestamptz, visibility_at timestamptz, message jsonb)
language sql security definer set search_path = '' as $$
  select msg_id, read_ct, enqueued_at, vt, message
  from pgmq.read('mesub_ai_jobs', greatest(1, least(visibility_timeout_seconds, 3600)), greatest(1, least(batch_size, 10)));
$$;

create function private.archive_ai_run_job(message_id bigint)
returns boolean language sql security definer set search_path = '' as $$
  select pgmq.archive('mesub_ai_jobs', message_id);
$$;

revoke all on schema pgmq from anon, authenticated;
revoke all on all tables in schema pgmq from anon, authenticated;
revoke all on all functions in schema pgmq from anon, authenticated;
revoke all on function private.enqueue_ai_run(uuid,uuid,uuid,integer) from public, anon, authenticated;
revoke all on function private.read_ai_run_jobs(integer,integer) from public, anon, authenticated;
revoke all on function private.archive_ai_run_job(bigint) from public, anon, authenticated;

comment on function private.enqueue_ai_run(uuid,uuid,uuid,integer) is
  'Server-only durable enqueue. Payload contains IDs and correlation metadata only.';

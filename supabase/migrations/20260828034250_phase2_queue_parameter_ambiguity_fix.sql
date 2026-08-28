create or replace function private.enqueue_ai_run(run_id uuid, tenant_id uuid, trace_id uuid, schema_version integer)
returns bigint language plpgsql security definer set search_path = '' as $$
declare message_id bigint;
begin
  if $1 is null or $2 is null or $3 is null or $4 < 1 then
    raise exception 'INVALID_QUEUE_MESSAGE' using errcode='22023';
  end if;
  if not exists (select 1 from public.ai_runs r where r.id=$1 and r.tenant_id=$2 and r.trace_id=$3) then
    raise exception 'AI_RUN_NOT_FOUND' using errcode='P0002';
  end if;
  select pgmq.send('mesub_ai_jobs', jsonb_build_object(
    'runId',$1,'tenantId',$2,'traceId',$3,'schemaVersion',$4
  )) into message_id;
  return message_id;
end;
$$;

revoke all on function private.enqueue_ai_run(uuid,uuid,uuid,integer) from public, anon, authenticated;

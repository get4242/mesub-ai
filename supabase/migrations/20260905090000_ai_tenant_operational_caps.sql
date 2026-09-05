create function public.admit_ai_run_server(
  target_tenant_id uuid,
  target_property_id uuid,
  target_requested_by_user_id uuid,
  target_idempotency_key uuid,
  target_input_snapshot jsonb,
  target_input_property_version integer,
  target_tasks public.ai_task_key[],
  target_model_profile_key public.ai_task_key,
  target_trace_id uuid,
  max_attempts integer,
  max_concurrent_runs_per_tenant integer,
  max_runs_per_tenant_per_day integer
)
returns table(status text, id uuid, trace_id uuid, created boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_run public.ai_runs%rowtype;
  created_run public.ai_runs%rowtype;
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  if max_attempts not between 1 and 5
    or max_concurrent_runs_per_tenant not between 1 and 10
    or max_runs_per_tenant_per_day not between 1 and 1000 then
    raise exception 'INVALID_AI_LIMITS' using errcode = '22023';
  end if;
  if not exists (
    select 1 from public.tenant_memberships membership
    where membership.tenant_id = target_tenant_id
      and membership.user_id = target_requested_by_user_id
      and membership.role = 'owner'
      and membership.status = 'active'
  ) or not exists (
    select 1 from public.properties property
    where property.id = target_property_id and property.tenant_id = target_tenant_id
  ) then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(target_tenant_id::text, 0));

  select * into existing_run
  from public.ai_runs run
  where run.tenant_id = target_tenant_id and run.idempotency_key = target_idempotency_key;
  if found then
    return query select 'existing', existing_run.id, existing_run.trace_id, false;
    return;
  end if;

  if (select count(*) from public.ai_runs run
      where run.tenant_id = target_tenant_id and run.state in ('queued','running')) >= max_concurrent_runs_per_tenant then
    return query select 'concurrency_limited', null::uuid, null::uuid, false;
    return;
  end if;

  -- Daily admission is a deterministic UTC calendar day [00:00, 24:00).
  if (select count(*) from public.ai_runs run
      where run.tenant_id = target_tenant_id
        and run.created_at >= date_trunc('day',now() at time zone 'UTC') at time zone 'UTC') >= max_runs_per_tenant_per_day then
    return query select 'daily_limited', null::uuid, null::uuid, false;
    return;
  end if;

  insert into public.ai_runs (
    tenant_id, property_id, requested_by_user_id, idempotency_key, input_snapshot,
    input_property_version, tasks, model_profile_key, trace_id, max_attempts
  ) values (
    target_tenant_id, target_property_id, target_requested_by_user_id, target_idempotency_key,
    target_input_snapshot, target_input_property_version, target_tasks, target_model_profile_key,
    target_trace_id, max_attempts
  ) returning * into created_run;

  perform private.enqueue_ai_run(created_run.id, created_run.tenant_id, created_run.trace_id, 1);
  return query select 'created', created_run.id, created_run.trace_id, true;
end;
$$;

revoke all on function public.admit_ai_run_server(uuid,uuid,uuid,uuid,jsonb,integer,public.ai_task_key[],public.ai_task_key,uuid,integer,integer,integer) from public, anon, authenticated;
grant execute on function public.admit_ai_run_server(uuid,uuid,uuid,uuid,jsonb,integer,public.ai_task_key[],public.ai_task_key,uuid,integer,integer,integer) to service_role;

comment on function public.admit_ai_run_server(uuid,uuid,uuid,uuid,jsonb,integer,public.ai_task_key[],public.ai_task_key,uuid,integer,integer,integer) is
  'Atomically admits and enqueues an idempotent tenant AI run with tenant locking and UTC-day operational caps.';

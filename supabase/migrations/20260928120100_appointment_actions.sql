create function public.create_appointment(target_property uuid,target_input jsonb,target_key text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare agent public.agent_profiles; item public.appointments; start_time timestamptz; end_time timestamptz; linked_lead uuid;
begin
  agent:=private.appointment_owner(target_property);
  perform pg_advisory_xact_lock(hashtextextended(agent.id::text,2));
  select * into item from public.appointments where tenant_id=agent.tenant_id and idempotency_key=target_key;
  if found then
    if item.property_id<>target_property then raise exception 'IDEMPOTENCY_CONFLICT'; end if;
    return to_jsonb(item);
  end if;
  start_time:=(target_input->>'startsAt')::timestamptz; end_time:=(target_input->>'endsAt')::timestamptz;
  if start_time<=now() or start_time>now()+interval '1 year' then raise exception 'APPOINTMENT_TIME_INVALID'; end if;
  linked_lead:=nullif(target_input->>'leadId','')::uuid;
  if linked_lead is not null and not exists(select 1 from public.leads where id=linked_lead and tenant_id=agent.tenant_id and property_id=target_property) then
    raise exception 'APPOINTMENT_FORBIDDEN' using errcode='42501';
  end if;
  if exists(select 1 from public.appointments where agent_id=agent.id and status<>'cancelled' and starts_at<end_time and ends_at>start_time) then
    raise exception 'APPOINTMENT_OVERLAP';
  end if;
  insert into public.appointments(tenant_id,agent_id,property_id,lead_id,customer_name,customer_phone,customer_email,starts_at,ends_at,notes,idempotency_key)
  values(agent.tenant_id,agent.id,target_property,linked_lead,trim(target_input->>'customerName'),nullif(trim(target_input->>'customerPhone'),''),
    nullif(trim(target_input->>'customerEmail'),''),start_time,end_time,coalesce(target_input->>'notes',''),target_key)
  returning * into item;
  return to_jsonb(item);
end $$;

create function public.change_appointment(target_id uuid,target_version integer,target_action text,target_start timestamptz default null,target_end timestamptz default null,target_notes text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare item public.appointments; agent public.agent_profiles;
begin
  select * into item from public.appointments where id=target_id;
  if not found then raise exception 'APPOINTMENT_NOT_FOUND'; end if;
  agent:=private.appointment_owner(item.property_id);
  perform pg_advisory_xact_lock(hashtextextended(agent.id::text,2));
  select * into item from public.appointments where id=target_id for update;
  if item.version<>target_version then raise exception 'APPOINTMENT_VERSION_CONFLICT'; end if;
  if item.status='cancelled' then raise exception 'APPOINTMENT_CANCELLED'; end if;
  if target_action not in ('reschedule','confirm','cancel') then raise exception 'APPOINTMENT_ACTION_INVALID'; end if;
  if target_action='reschedule' then
    if target_start is null or target_end is null or target_start<=now() or target_start>now()+interval '1 year' then raise exception 'APPOINTMENT_TIME_INVALID'; end if;
    if exists(select 1 from public.appointments a where a.agent_id=item.agent_id and a.id<>item.id and a.status<>'cancelled' and a.starts_at<target_end and a.ends_at>target_start) then raise exception 'APPOINTMENT_OVERLAP'; end if;
  end if;
  update public.appointments set
    starts_at=case when target_action='reschedule' then target_start else starts_at end,
    ends_at=case when target_action='reschedule' then target_end else ends_at end,
    status=case when target_action='cancel' then 'cancelled' when target_action='confirm' then 'confirmed' else 'requested' end,
    notes=coalesce(target_notes,notes),version=version+1,updated_at=now(),reminder_queued_version=null
  where id=target_id returning * into item;
  return to_jsonb(item);
end $$;
revoke all on function public.create_appointment(uuid,jsonb,text),public.change_appointment(uuid,integer,text,timestamptz,timestamptz,text) from public,anon;
grant execute on function public.create_appointment(uuid,jsonb,text),public.change_appointment(uuid,integer,text,timestamptz,timestamptz,text) to authenticated;

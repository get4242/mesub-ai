create function public.line_appointment_confirm_server(target_provider text,target_environment text,target_subject_hash text,target_token uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare proposal jsonb; item public.appointments; owner_user uuid; result jsonb; lead_result jsonb; lead_id uuid;
  old_claims text:=current_setting('request.jwt.claims',true); request_key text:='line-appointment:'||target_token::text;
begin
  if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select appointment_proposal into proposal from public.line_conversations
  where provider_id=target_provider and environment=target_environment and subject_hash=target_subject_hash for update;
  -- A retry of the same explicit confirmation returns its original appointment.
  select * into item from public.appointments where idempotency_key=request_key and requester_provider=target_provider
    and requester_environment=target_environment and requester_subject_hash=target_subject_hash;
  if found then return to_jsonb(item); end if;
  if proposal is null or proposal->>'token' is distinct from target_token::text or (proposal->>'expiresAt')::timestamptz<=now() then
    raise exception 'APPOINTMENT_PROPOSAL_EXPIRED';
  end if;
  select a.user_id into owner_user from public.properties p join public.agent_profiles a on a.id=p.owner_agent_id and a.tenant_id=p.tenant_id
    join public.tenant_memberships m on m.tenant_id=a.tenant_id and m.user_id=a.user_id and m.role='owner' and m.status='active'
    where p.id=(proposal->>'propertyId')::uuid and p.status='published';
  if owner_user is null then raise exception 'PROPERTY_UNAVAILABLE'; end if;
  lead_result:=public.capture_public_lead('property',(proposal->>'propertyId')::uuid,proposal->>'customerName',null,proposal->>'customerPhone',
    'ขอนัดชมทรัพย์ '||(proposal->>'startsAt'),'line-appointment-v1',request_key,target_subject_hash);
  if lead_result->>'outcome'<>'accepted' then raise exception 'APPOINTMENT_RATE_LIMIT'; end if;
  select id into lead_id from public.leads where kind='property' and idempotency_key=request_key;
  if lead_id is null then raise exception 'PROPERTY_UNAVAILABLE'; end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_user,'role','authenticated')::text,true);
  result:=public.create_appointment((proposal->>'propertyId')::uuid,proposal||jsonb_build_object('leadId',lead_id),request_key);
  perform set_config('request.jwt.claims',coalesce(old_claims,''),true);
  update public.appointments set requester_provider=target_provider,requester_environment=target_environment,requester_subject_hash=target_subject_hash
    where id=(result->>'id')::uuid;
  update public.line_conversations set appointment_proposal=null where provider_id=target_provider and environment=target_environment and subject_hash=target_subject_hash;
  return result;
end $$;
revoke all on function public.line_appointment_confirm_server(text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.line_appointment_confirm_server(text,text,text,uuid) to service_role;

alter table public.line_conversations add column appointment_proposal jsonb;

create function public.line_appointment_proposal_server(target_provider text,target_environment text,target_subject_hash text,target_proposal jsonb default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare proposal jsonb;
begin
  if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if target_proposal is not null then
    if jsonb_typeof(target_proposal)<>'object' or octet_length(target_proposal::text)>5000 then raise exception 'INVALID_PROPOSAL'; end if;
    if not exists(select 1 from public.public_properties where id=(target_proposal->>'propertyId')::uuid) then raise exception 'PROPERTY_UNAVAILABLE'; end if;
    proposal:=target_proposal||jsonb_build_object('token',gen_random_uuid(),'expiresAt',now()+interval '30 minutes');
    insert into public.line_conversations(provider_id,environment,subject_hash,appointment_proposal)
    values(target_provider,target_environment,target_subject_hash,proposal)
    on conflict(provider_id,environment,subject_hash) do update set appointment_proposal=excluded.appointment_proposal;
  else
    select appointment_proposal into proposal from public.line_conversations
    where provider_id=target_provider and environment=target_environment and subject_hash=target_subject_hash;
    if (proposal->>'expiresAt')::timestamptz<=now() then return null; end if;
  end if;
  return proposal;
end $$;
revoke all on function public.line_appointment_proposal_server(text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.line_appointment_proposal_server(text,text,text,jsonb) to service_role;

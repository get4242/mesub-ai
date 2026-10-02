create function public.line_appointment_change_server(target_provider text,target_environment text,target_subject_hash text,target_id uuid,target_action text,target_start timestamptz default null,target_end timestamptz default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare item public.appointments; actor jsonb; result jsonb; owner_user uuid;
  old_claims text:=current_setting('request.jwt.claims',true);
begin
  if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  actor:=public.line_context_server(target_provider,target_environment,target_subject_hash)->'actor';
  select * into item from public.appointments where id=target_id;
  if not found then raise exception 'APPOINTMENT_FORBIDDEN' using errcode='42501'; end if;
  if (actor->>'agentId')::uuid is distinct from item.agent_id then
    if target_action not in ('cancel','reschedule') or item.requester_provider is distinct from target_provider
      or item.requester_environment is distinct from target_environment or item.requester_subject_hash is distinct from target_subject_hash then
      raise exception 'APPOINTMENT_FORBIDDEN' using errcode='42501';
    end if;
  end if;
  if (target_action='cancel' and item.status='cancelled') or (target_action='confirm' and item.status='confirmed')
    or (target_action='reschedule' and item.status='requested' and item.starts_at=target_start and item.ends_at=target_end) then
    return to_jsonb(item);
  end if;
  select user_id into owner_user from public.agent_profiles where id=item.agent_id and tenant_id=item.tenant_id;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',owner_user,'role','authenticated')::text,true);
  result:=public.change_appointment(item.id,item.version,target_action,target_start,target_end,null);
  perform set_config('request.jwt.claims',coalesce(old_claims,''),true);
  return result;
end $$;
revoke all on function public.line_appointment_change_server(text,text,text,uuid,text,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.line_appointment_change_server(text,text,text,uuid,text,timestamptz,timestamptz) to service_role;

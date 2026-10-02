create function public.line_intake_decide_server(target_provider text,target_environment text,target_subject_hash text,target_session uuid,target_decision text,target_version integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare session public.line_intake_sessions; property public.properties; previous_claims text; outcome jsonb;
begin
  session:=private.line_intake_owned(target_provider,target_environment,target_subject_hash,target_session);
  if target_decision not in ('confirm','cancel') then raise exception 'INVALID_DECISION'; end if;
  if session.state in ('confirmed','cancelled') then return jsonb_build_object('outcome',session.state,'propertyId',session.property_id); end if;
  if target_decision='cancel' then
    update public.properties set status='archived' where id=session.property_id and tenant_id=session.tenant_id
      and owner_agent_id=session.agent_id and status in ('draft','pending_confirmation');
    update public.line_intake_sessions set state='cancelled' where id=session.id;
    return jsonb_build_object('outcome','cancelled');
  end if;
  if session.state<>'review' or session.review_property_version is distinct from target_version then raise exception 'INTAKE_CONFLICT'; end if;
  select * into property from public.properties where id=session.property_id and tenant_id=session.tenant_id and owner_agent_id=session.agent_id for update;
  if not found or property.version<>target_version then return jsonb_build_object('outcome','conflict'); end if;
  -- Derive the subject from the verified link, then reuse canonical confirmation and publication.
  previous_claims:=current_setting('request.jwt.claims',true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',session.user_id,'role','authenticated')::text,true);
  perform public.confirm_property_current_version(property.id,property.version,property.critical_version,null);
  outcome:=public.publish_property(property.id,property.version,'line-intake:'||session.id::text);
  perform set_config('request.jwt.claims',coalesce(previous_claims,''),true);
  if outcome->>'outcome' in ('published','already_published') then
    update public.line_intake_sessions set state='confirmed' where id=session.id;
  end if;
  return outcome;
end $$;
revoke all on function public.line_intake_decide_server(text,text,text,uuid,text,integer) from public,anon,authenticated;
grant execute on function public.line_intake_decide_server(text,text,text,uuid,text,integer) to service_role;

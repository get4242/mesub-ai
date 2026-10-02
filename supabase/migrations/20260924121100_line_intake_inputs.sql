create function public.line_intake_input_server(target_provider text,target_environment text,target_subject_hash text,target_session uuid,target_event text,target_text text default null,target_media jsonb default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare session public.line_intake_sessions;
begin
  session:=private.line_intake_owned(target_provider,target_environment,target_subject_hash,target_session);
  if target_event=any(session.source_events) then return to_jsonb(session); end if;
  if session.state<>'collecting' or session.extraction_event is not null then raise exception 'INTAKE_NOT_COLLECTING'; end if;
  if cardinality(session.source_events)>=100 then raise exception 'INTAKE_INPUT_LIMIT'; end if;
  if target_media is not null then
    if jsonb_array_length(session.media)>=10 then raise exception 'INTAKE_IMAGE_LIMIT'; end if;
    if target_media->>'object_path' not like session.tenant_id::text||'/'||session.property_id::text||'/'||(target_media->>'id')||'/%'
      or target_media->>'mime_type' not in ('image/jpeg','image/png','image/webp')
      or (target_media->>'byte_size')::bigint not between 1 and 10485760
      or (target_media->>'width')::integer not between 1 and 20000
      or (target_media->>'height')::integer not between 1 and 20000
      or (target_media->>'checksum_sha256') !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_INTAKE_MEDIA'; end if;
    if exists(select 1 from jsonb_array_elements(session.media) m where m->>'id'=target_media->>'id') then return to_jsonb(session); end if;
  end if;
  update public.line_intake_sessions set
    source_text=case when nullif(trim(target_text),'') is null then source_text else concat_ws(E'\n',nullif(source_text,''),trim(target_text)) end,
    media=case when target_media is null then media else media||jsonb_build_array(target_media) end,
    source_events=array_append(source_events,target_event),version=version+1
  where id=session.id returning * into session;
  return to_jsonb(session);
end $$;

create function public.line_intake_extract_claim_server(target_provider text,target_environment text,target_subject_hash text,target_session uuid,target_event text,target_daily_limit integer)
returns jsonb language plpgsql security definer set search_path='' as $$
declare session public.line_intake_sessions; used integer;
begin
  session:=private.line_intake_owned(target_provider,target_environment,target_subject_hash,target_session);
  if session.state='review' then return to_jsonb(session); end if;
  if session.state<>'collecting' then raise exception 'INTAKE_NOT_COLLECTING'; end if;
  perform pg_advisory_xact_lock(hashtextextended(session.tenant_id::text,0));
  if session.extraction_event=target_event then return to_jsonb(session); end if;
  if session.extraction_event is not null then raise exception 'INTAKE_EXTRACTION_RUNNING'; end if;
  select coalesce(sum(extraction_count),0) into used from public.line_intake_sessions
  where tenant_id=session.tenant_id and created_at>=date_trunc('day',now() at time zone 'UTC') at time zone 'UTC';
  if session.extraction_count>=3 or used>=least(greatest(target_daily_limit,1),1000) then raise exception 'AI_LIMIT_REACHED'; end if;
  update public.line_intake_sessions set extraction_count=extraction_count+1,extraction_event=target_event
  where id=session.id returning * into session;
  return to_jsonb(session);
end $$;
revoke all on function public.line_intake_input_server(text,text,text,uuid,text,text,jsonb), public.line_intake_extract_claim_server(text,text,text,uuid,text,integer) from public,anon,authenticated;
grant execute on function public.line_intake_input_server(text,text,text,uuid,text,text,jsonb), public.line_intake_extract_claim_server(text,text,text,uuid,text,integer) to service_role;

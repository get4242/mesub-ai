alter table public.line_intake_sessions add column review_property_version integer;
alter table public.line_intake_sessions add column review_critical_version integer;

create function public.line_intake_draft_server(target_provider text,target_environment text,target_subject_hash text,target_session uuid,target_event text,target_draft jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare session public.line_intake_sessions; property public.properties; item jsonb; position integer:=0;
begin
  session:=private.line_intake_owned(target_provider,target_environment,target_subject_hash,target_session);
  if session.state='review' then return to_jsonb(session); end if;
  if session.state<>'collecting' or session.extraction_event is distinct from target_event then raise exception 'INTAKE_CONFLICT'; end if;
  if target_draft is null then
    update public.line_intake_sessions set extraction_event=null where id=session.id returning * into session;
    return to_jsonb(session);
  end if;
  insert into public.properties(id,tenant_id,owner_agent_id,listing_type,property_type,title,description,province,district,subdistrict,price,currency,land_area_sqm,building_area_sqm,bedrooms,bathrooms,address_line,latitude,longitude,status)
  values(session.property_id,session.tenant_id,session.agent_id,
    (target_draft->>'listingType')::public.property_listing_type,(target_draft->>'propertyType')::public.property_type,
    target_draft->>'title',target_draft->>'description',target_draft->>'province',target_draft->>'district',nullif(target_draft->>'subdistrict',''),
    (target_draft->>'price')::numeric,'THB',(target_draft->>'landAreaSquareMetres')::numeric,(target_draft->>'buildingAreaSquareMetres')::numeric,
    (target_draft->>'bedrooms')::integer,(target_draft->>'bathrooms')::integer,
    target_draft->>'addressLine',(target_draft->>'latitude')::numeric,(target_draft->>'longitude')::numeric,'draft');
  for item in select value from jsonb_array_elements(session.media) loop
    insert into public.property_media(id,tenant_id,property_id,bucket_id,object_path,original_filename,mime_type,byte_size,width,height,checksum_sha256,position,status)
    values((item->>'id')::uuid,session.tenant_id,session.property_id,'property-published',item->>'object_path',item->>'original_filename',item->>'mime_type',
      (item->>'byte_size')::bigint,(item->>'width')::integer,(item->>'height')::integer,item->>'checksum_sha256',position,'ready');
    position:=position+1;
  end loop;
  select * into property from public.properties where id=session.property_id;
  update public.line_intake_sessions set state='review',extracted=target_draft,extraction_event=null,
    review_property_version=property.version,review_critical_version=property.critical_version
  where id=session.id returning * into session;
  return to_jsonb(session);
end $$;
revoke all on function public.line_intake_draft_server(text,text,text,uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.line_intake_draft_server(text,text,text,uuid,text,jsonb) to service_role;

-- Add conversation context to the existing LINE worker; no additional queue.
create table public.line_conversations (
  provider_id text not null,
  environment text not null check (environment in ('development','review','production')),
  subject_hash text not null check (length(subject_hash)=64),
  property_ids uuid[] not null default '{}',
  updated_at timestamptz not null default now(),
  primary key(provider_id, environment, subject_hash),
  check (cardinality(property_ids)<=10)
);
alter table public.line_conversations enable row level security;
revoke all on public.line_conversations from public,anon,authenticated;

create function public.line_context_server(target_provider text, target_environment text, target_subject_hash text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare actor jsonb; recent_ids uuid[];
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select jsonb_build_object('userId', a.user_id, 'tenantId', a.tenant_id, 'agentId', a.id, 'slug', a.slug)
  into actor from public.line_identity_links l
  join public.agent_profiles a on a.user_id=l.user_id
  join public.tenant_memberships m on m.user_id=a.user_id and m.tenant_id=a.tenant_id and m.role='owner' and m.status='active'
  join auth.users u on u.id=a.user_id and u.email_confirmed_at is not null
  where l.provider_id=target_provider and l.environment=target_environment
    and l.subject_hash=target_subject_hash and l.revoked_at is null;
  select property_ids into recent_ids from public.line_conversations
  where provider_id=target_provider and environment=target_environment and subject_hash=target_subject_hash
    and updated_at>now()-interval '24 hours';
  return jsonb_build_object('actor', actor, 'propertyIds', coalesce(recent_ids,'{}'::uuid[]));
end $$;

create function public.line_remember_properties_server(target_provider text, target_environment text, target_subject_hash text, target_property_ids uuid[])
returns void language plpgsql security definer set search_path='' as $$
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  insert into public.line_conversations(provider_id,environment,subject_hash,property_ids)
  values(target_provider,target_environment,target_subject_hash,target_property_ids)
  on conflict(provider_id,environment,subject_hash) do update
    set property_ids=excluded.property_ids,updated_at=now();
end $$;

create function public.line_public_properties_server(target_filters jsonb, target_property_id uuid default null)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare results jsonb;
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  select coalesce(jsonb_agg(to_jsonb(p) || jsonb_build_object('media_id', (
    select m.media_id from public.public_property_media m where m.property_id=p.id order by m.position limit 1
  ))), '[]'::jsonb) into results from (
    select r.* from public.search_public_properties(
      target_filters->>'query',target_filters->>'province',target_filters->>'district',
      (target_filters->>'listingType')::public.property_listing_type,
      (target_filters->>'propertyType')::public.property_type,null,
      (target_filters->>'maxPrice')::numeric,'newest',1,10
    ) r where target_property_id is null
    union all
    select r.* from public.public_properties r where target_property_id is not null and r.id=target_property_id
  ) p;
  return results;
end $$;

revoke all on function public.line_context_server(text,text,text), public.line_remember_properties_server(text,text,text,uuid[]), public.line_public_properties_server(jsonb,uuid) from public,anon,authenticated;
grant execute on function public.line_context_server(text,text,text), public.line_remember_properties_server(text,text,text,uuid[]), public.line_public_properties_server(jsonb,uuid) to service_role;

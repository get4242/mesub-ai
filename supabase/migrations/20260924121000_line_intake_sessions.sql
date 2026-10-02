create table public.line_intake_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id),
  agent_id uuid not null,
  user_id uuid not null references auth.users(id),
  provider_id text not null,
  environment text not null,
  subject_hash text not null check(length(subject_hash)=64),
  property_id uuid not null unique default gen_random_uuid(),
  state text not null default 'collecting' check(state in ('collecting','review','confirmed','cancelled')),
  source_text text not null default '' check(length(source_text)<=12000),
  source_events text[] not null default '{}',
  media jsonb not null default '[]' check(jsonb_typeof(media)='array' and jsonb_array_length(media)<=10),
  extracted jsonb,
  extraction_count integer not null default 0 check(extraction_count between 0 and 3),
  extraction_event text,
  version integer not null default 1,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now()+interval '30 days',
  foreign key(tenant_id,agent_id) references public.agent_profiles(tenant_id,id)
);
create unique index line_intake_active_identity on public.line_intake_sessions(provider_id,environment,subject_hash) where state in ('collecting','review');
alter table public.line_intake_sessions enable row level security;
revoke all on public.line_intake_sessions from public,anon,authenticated;

create function public.line_intake_session_server(target_provider text,target_environment text,target_subject_hash text,target_start boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor jsonb; session public.line_intake_sessions;
begin
  actor:=public.line_context_server(target_provider,target_environment,target_subject_hash)->'actor';
  if actor is null or actor='null'::jsonb then raise exception 'AGENT_LINK_REQUIRED' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(target_provider||target_environment||target_subject_hash,1));
  select * into session from public.line_intake_sessions
  where provider_id=target_provider and environment=target_environment and subject_hash=target_subject_hash
    and tenant_id=(actor->>'tenantId')::uuid and agent_id=(actor->>'agentId')::uuid and state in ('collecting','review')
  for update;
  if found and session.expires_at<=now() then
    update public.line_intake_sessions set state='cancelled' where id=session.id;
    session:=null;
  end if;
  if session.id is null and target_start then
    insert into public.line_intake_sessions(tenant_id,agent_id,user_id,provider_id,environment,subject_hash)
    values((actor->>'tenantId')::uuid,(actor->>'agentId')::uuid,(actor->>'userId')::uuid,target_provider,target_environment,target_subject_hash)
    returning * into session;
  end if;
  return case when session.id is null then null else to_jsonb(session) end;
end $$;

create function private.line_intake_owned(target_provider text,target_environment text,target_subject_hash text,target_session uuid)
returns public.line_intake_sessions language plpgsql security definer set search_path='' as $$
declare actor jsonb; session public.line_intake_sessions;
begin
  actor:=public.line_context_server(target_provider,target_environment,target_subject_hash)->'actor';
  select * into session from public.line_intake_sessions where id=target_session and provider_id=target_provider
    and environment=target_environment and subject_hash=target_subject_hash and expires_at>now()
    and tenant_id=(actor->>'tenantId')::uuid and agent_id=(actor->>'agentId')::uuid for update;
  if not found then raise exception 'INTAKE_NOT_FOUND' using errcode='42501'; end if;
  return session;
end $$;
revoke all on function private.line_intake_owned(text,text,text,uuid) from public,anon,authenticated;
revoke all on function public.line_intake_session_server(text,text,text,boolean) from public,anon,authenticated;
grant execute on function public.line_intake_session_server(text,text,text,boolean) to service_role;

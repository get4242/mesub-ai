create type public.ai_task_key as enum ('extraction', 'vision', 'content');
create type public.ai_run_state as enum ('queued', 'running', 'succeeded', 'failed', 'dead_letter', 'cancelled');
create type public.ai_source_kind as enum ('agent_text', 'property_field', 'media');
create type public.ai_measurement_status as enum ('measured', 'unknown');

alter table public.property_media
  add constraint property_media_tenant_id_id_key unique (tenant_id, id);

create table public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  requested_by_user_id uuid not null references auth.users (id) on delete restrict,
  idempotency_key uuid not null,
  input_snapshot jsonb not null check (jsonb_typeof(input_snapshot) = 'object'),
  input_property_version integer not null check (input_property_version > 0),
  tasks public.ai_task_key[] not null check (cardinality(tasks) between 1 and 3),
  prompt_version integer not null default 1 check (prompt_version > 0),
  schema_version integer not null default 1 check (schema_version > 0),
  model_profile_key public.ai_task_key not null,
  resolved_model_id text,
  state public.ai_run_state not null default 'queued',
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 3 check (max_attempts between 1 and 10),
  next_attempt_at timestamptz,
  retryable boolean not null default false,
  error_category text check (error_category is null or char_length(error_category) <= 80),
  trace_id uuid not null,
  provider_request_id text check (provider_request_id is null or char_length(provider_request_id) <= 200),
  queued_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, idempotency_key),
  unique (tenant_id, id),
  constraint ai_runs_tenant_property_fk foreign key (tenant_id, property_id)
    references public.properties (tenant_id, id) on delete cascade,
  constraint ai_runs_terminal_time check (
    (state in ('succeeded', 'failed', 'dead_letter', 'cancelled') and finished_at is not null)
    or (state in ('queued', 'running') and finished_at is null)
  )
);

create table public.ai_run_media (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  ai_run_id uuid not null,
  property_id uuid not null,
  media_id uuid not null,
  media_checksum_sha256 text not null check (media_checksum_sha256 ~ '^[a-f0-9]{64}$'),
  position integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  unique (ai_run_id, media_id),
  unique (ai_run_id, position),
  foreign key (tenant_id, ai_run_id) references public.ai_runs (tenant_id, id) on delete cascade,
  foreign key (tenant_id, property_id) references public.properties (tenant_id, id) on delete cascade,
  foreign key (tenant_id, media_id) references public.property_media (tenant_id, id) on delete restrict
);

create table public.ai_sources (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  ai_run_id uuid not null,
  kind public.ai_source_kind not null,
  media_id uuid,
  source_label text not null check (char_length(source_label) between 1 and 200),
  locator jsonb not null default '{}'::jsonb check (jsonb_typeof(locator) = 'object'),
  excerpt text check (excerpt is null or char_length(excerpt) <= 1000),
  created_at timestamptz not null default now(),
  unique (tenant_id, id),
  foreign key (tenant_id, ai_run_id) references public.ai_runs (tenant_id, id) on delete cascade,
  foreign key (tenant_id, media_id) references public.property_media (tenant_id, id) on delete restrict,
  check ((kind = 'media' and media_id is not null) or (kind <> 'media' and media_id is null))
);

create table public.ai_usage_events (
  id bigint generated always as identity primary key,
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  ai_run_id uuid not null,
  attempt integer not null check (attempt > 0),
  task_key public.ai_task_key not null,
  measurement_status public.ai_measurement_status not null,
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  image_count integer check (image_count is null or image_count >= 0),
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  outcome text not null check (char_length(outcome) between 1 and 80),
  provider_request_id text check (provider_request_id is null or char_length(provider_request_id) <= 200),
  pricing_version text,
  estimated_cost_minor numeric(16, 6) check (estimated_cost_minor is null or estimated_cost_minor >= 0),
  created_at timestamptz not null default now(),
  unique (tenant_id, ai_run_id, attempt, task_key),
  foreign key (tenant_id, ai_run_id) references public.ai_runs (tenant_id, id) on delete cascade,
  check (
    (measurement_status = 'unknown' and input_tokens is null and output_tokens is null)
    or measurement_status = 'measured'
  )
);

create index ai_runs_tenant_property_created_idx on public.ai_runs (tenant_id, property_id, created_at desc);
create index ai_runs_due_idx on public.ai_runs (next_attempt_at, created_at) where state = 'queued';
create index ai_run_media_tenant_run_idx on public.ai_run_media (tenant_id, ai_run_id);
create index ai_sources_tenant_run_idx on public.ai_sources (tenant_id, ai_run_id);
create index ai_usage_tenant_run_created_idx on public.ai_usage_events (tenant_id, ai_run_id, created_at desc);

create trigger ai_runs_set_updated_at before update on public.ai_runs
for each row execute function private.set_updated_at();

create function private.reject_immutable_ai_row_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  raise exception 'IMMUTABLE_AI_RECORD' using errcode = '55000';
end;
$$;

create trigger ai_run_media_immutable before update or delete on public.ai_run_media
for each row execute function private.reject_immutable_ai_row_update();
create trigger ai_sources_immutable before update or delete on public.ai_sources
for each row execute function private.reject_immutable_ai_row_update();
create trigger ai_usage_events_immutable before update or delete on public.ai_usage_events
for each row execute function private.reject_immutable_ai_row_update();

alter table public.ai_runs enable row level security;
alter table public.ai_run_media enable row level security;
alter table public.ai_sources enable row level security;
alter table public.ai_usage_events enable row level security;

create policy ai_runs_select_owner on public.ai_runs for select to authenticated using (
  exists (select 1 from public.tenant_memberships m where m.tenant_id = ai_runs.tenant_id
    and m.user_id = (select auth.uid()) and m.role = 'owner' and m.status = 'active')
);
create policy ai_run_media_select_owner on public.ai_run_media for select to authenticated using (
  exists (select 1 from public.tenant_memberships m where m.tenant_id = ai_run_media.tenant_id
    and m.user_id = (select auth.uid()) and m.role = 'owner' and m.status = 'active')
);
create policy ai_sources_select_owner on public.ai_sources for select to authenticated using (
  exists (select 1 from public.tenant_memberships m where m.tenant_id = ai_sources.tenant_id
    and m.user_id = (select auth.uid()) and m.role = 'owner' and m.status = 'active')
);
create policy ai_usage_select_owner on public.ai_usage_events for select to authenticated using (
  exists (select 1 from public.tenant_memberships m where m.tenant_id = ai_usage_events.tenant_id
    and m.user_id = (select auth.uid()) and m.role = 'owner' and m.status = 'active')
);

revoke all on public.ai_runs, public.ai_run_media, public.ai_sources, public.ai_usage_events from anon, authenticated;
grant select on public.ai_runs, public.ai_run_media, public.ai_sources, public.ai_usage_events to authenticated;
revoke all on function private.reject_immutable_ai_row_update() from public, anon, authenticated;

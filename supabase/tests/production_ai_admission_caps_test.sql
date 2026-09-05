begin;

create extension if not exists pgtap with schema extensions;

select plan(19);

create temporary table tap_diagnostics(result text not null) on commit drop;
grant insert, select on tap_diagnostics to service_role;

create temporary table ai_admission_fixture (
  ordinal integer primary key,
  tenant_id uuid not null,
  user_id uuid not null,
  agent_id uuid not null,
  property_id uuid not null
) on commit drop;

insert into ai_admission_fixture (ordinal, tenant_id, user_id, agent_id, property_id)
select ordinal, tenant_id, user_id, agent_id,
  case ordinal
    when 1 then 'f2800000-0000-4000-8000-000000000001'::uuid
    else 'f2800000-0000-4000-8000-000000000002'::uuid
  end
from (
  select row_number() over (order by membership.tenant_id)::integer as ordinal,
    membership.tenant_id,
    membership.user_id,
    agent.id as agent_id
  from public.tenant_memberships membership
  join public.agent_profiles agent
    on agent.tenant_id = membership.tenant_id
   and agent.user_id = membership.user_id
  where membership.role = 'owner' and membership.status = 'active'
  order by membership.tenant_id
  limit 2
) owners;

grant select on ai_admission_fixture to service_role;

insert into tap_diagnostics select is((select count(*) from ai_admission_fixture), 2::bigint, 'two existing owner tenants are available for isolated fixtures');

insert into public.properties (
  id, tenant_id, owner_agent_id, listing_type, property_type, title, description,
  province, district, price, land_area_sqm
)
select property_id, tenant_id, agent_id, 'sale', 'land',
  'Migration 28 verification', 'Rollback-only AI admission fixture',
  'กรุงเทพมหานคร', 'ทดสอบ', 1, 1
from ai_admission_fixture;

insert into tap_diagnostics select has_function(
  'public', 'admit_ai_run_server',
  array['uuid','uuid','uuid','uuid','jsonb','integer','ai_task_key[]','ai_task_key','uuid','integer','integer','integer'],
  'atomic AI admission RPC exists'
);
insert into tap_diagnostics select ok(not has_function_privilege('anon', 'public.admit_ai_run_server(uuid,uuid,uuid,uuid,jsonb,integer,public.ai_task_key[],public.ai_task_key,uuid,integer,integer,integer)', 'execute'), 'anonymous cannot invoke admission');
insert into tap_diagnostics select ok(not has_function_privilege('authenticated', 'public.admit_ai_run_server(uuid,uuid,uuid,uuid,jsonb,integer,public.ai_task_key[],public.ai_task_key,uuid,integer,integer,integer)', 'execute'), 'authenticated client cannot invoke admission');
insert into tap_diagnostics select ok(has_function_privilege('service_role', 'public.admit_ai_run_server(uuid,uuid,uuid,uuid,jsonb,integer,public.ai_task_key[],public.ai_task_key,uuid,integer,integer,integer)', 'execute'), 'service role can invoke admission');

set local role service_role;
set local "request.jwt.claims" = '{"role":"service_role"}';

insert into tap_diagnostics select is((select status from public.admit_ai_run_server(
  (select tenant_id from ai_admission_fixture where ordinal=1),
  (select property_id from ai_admission_fixture where ordinal=1),
  (select user_id from ai_admission_fixture where ordinal=1),
  'f2810000-0000-4000-8000-000000000001', '{}'::jsonb, 1,
  array['extraction']::public.ai_task_key[], 'extraction',
  'f2830000-0000-4000-8000-000000000001', 3, 1, 10
)), 'created', 'first tenant admission creates a run');

insert into tap_diagnostics select is((select status from public.admit_ai_run_server(
  (select tenant_id from ai_admission_fixture where ordinal=1),
  (select property_id from ai_admission_fixture where ordinal=1),
  (select user_id from ai_admission_fixture where ordinal=1),
  'f2810000-0000-4000-8000-000000000001', '{}'::jsonb, 1,
  array['extraction']::public.ai_task_key[], 'extraction',
  'f2830000-0000-4000-8000-000000000099', 3, 1, 10
)), 'existing', 'idempotent retry reuses the canonical run');

insert into tap_diagnostics select is((select count(*) from public.ai_runs where idempotency_key='f2810000-0000-4000-8000-000000000001'), 1::bigint, 'idempotent retry does not consume another run');

insert into tap_diagnostics select is((select status from public.admit_ai_run_server(
  (select tenant_id from ai_admission_fixture where ordinal=1),
  (select property_id from ai_admission_fixture where ordinal=1),
  (select user_id from ai_admission_fixture where ordinal=1),
  'f2810000-0000-4000-8000-000000000002', '{}'::jsonb, 1,
  array['extraction']::public.ai_task_key[], 'extraction',
  'f2830000-0000-4000-8000-000000000002', 3, 1, 10
)), 'concurrency_limited', 'second active run for the same tenant is rejected');

insert into tap_diagnostics select is((select status from public.admit_ai_run_server(
  (select tenant_id from ai_admission_fixture where ordinal=2),
  (select property_id from ai_admission_fixture where ordinal=2),
  (select user_id from ai_admission_fixture where ordinal=2),
  'f2810000-0000-4000-8000-000000000003', '{}'::jsonb, 1,
  array['extraction']::public.ai_task_key[], 'extraction',
  'f2830000-0000-4000-8000-000000000003', 3, 1, 10
)), 'created', 'a different tenant remains independent');

insert into tap_diagnostics select is((select count(*) from public.ai_runs where property_id in (select property_id from ai_admission_fixture)), 2::bigint, 'active-cap rejection leaves no partial canonical row');
reset role;
insert into tap_diagnostics select is((select queue_length from pgmq.metrics('mesub_ai_jobs')), 2::bigint, 'each admitted canonical run has exactly one atomic queue message');
set local role service_role;
set local "request.jwt.claims" = '{"role":"service_role"}';

update public.ai_runs set state='succeeded', finished_at=now()
where idempotency_key='f2810000-0000-4000-8000-000000000001';

create temporary table ai_daily_results(status text) on commit drop;
do $$
declare
  index integer;
  result record;
begin
  for index in 2..10 loop
    select * into result from public.admit_ai_run_server(
      (select tenant_id from ai_admission_fixture where ordinal=1),
      (select property_id from ai_admission_fixture where ordinal=1),
      (select user_id from ai_admission_fixture where ordinal=1),
      ('f2820000-0000-4000-8000-' || lpad(index::text,12,'0'))::uuid,
      '{}'::jsonb, 1, array['extraction']::public.ai_task_key[], 'extraction',
      ('f2840000-0000-4000-8000-' || lpad(index::text,12,'0'))::uuid,
      3, 1, 10
    );
    insert into ai_daily_results values (result.status);
    update public.ai_runs set state='succeeded', finished_at=now() where id=result.id;
  end loop;
end $$;

insert into tap_diagnostics select is((select count(*) from ai_daily_results where status='created'), 9::bigint, 'ten admissions in one UTC day are allowed');
insert into tap_diagnostics select is((select status from public.admit_ai_run_server(
  (select tenant_id from ai_admission_fixture where ordinal=1),
  (select property_id from ai_admission_fixture where ordinal=1),
  (select user_id from ai_admission_fixture where ordinal=1),
  'f2810000-0000-4000-8000-000000000011', '{}'::jsonb, 1,
  array['extraction']::public.ai_task_key[], 'extraction',
  'f2830000-0000-4000-8000-000000000011', 3, 1, 10
)), 'daily_limited', 'eleventh admission in the UTC day is rejected');
insert into tap_diagnostics select is((select count(*) from public.ai_runs where tenant_id=(select tenant_id from ai_admission_fixture where ordinal=1)), 10::bigint, 'daily-cap rejection leaves no partial canonical row');
reset role;
insert into tap_diagnostics select is((select queue_length from pgmq.metrics('mesub_ai_jobs')), 11::bigint, 'daily-cap rejection creates no queue message');
set local role service_role;
set local "request.jwt.claims" = '{"role":"service_role"}';

delete from public.ai_runs where tenant_id=(select tenant_id from ai_admission_fixture where ordinal=1);
insert into public.ai_runs (
  tenant_id, property_id, requested_by_user_id, idempotency_key, input_snapshot,
  input_property_version, tasks, model_profile_key, trace_id, state, finished_at, created_at
)
select fixture.tenant_id, fixture.property_id, fixture.user_id,
  ('f2850000-0000-4000-8000-' || lpad(series::text,12,'0'))::uuid,
  '{}'::jsonb, 1, array['extraction']::public.ai_task_key[], 'extraction',
  ('f2860000-0000-4000-8000-' || lpad(series::text,12,'0'))::uuid,
  'succeeded', now() - interval '1 day',
  date_trunc('day', now() at time zone 'UTC') at time zone 'UTC' - interval '1 microsecond'
from ai_admission_fixture fixture cross join generate_series(1,10) series
where fixture.ordinal=1;

insert into tap_diagnostics select is((select status from public.admit_ai_run_server(
  (select tenant_id from ai_admission_fixture where ordinal=1),
  (select property_id from ai_admission_fixture where ordinal=1),
  (select user_id from ai_admission_fixture where ordinal=1),
  'f2810000-0000-4000-8000-000000000012', '{}'::jsonb, 1,
  array['extraction']::public.ai_task_key[], 'extraction',
  'f2830000-0000-4000-8000-000000000012', 3, 1, 10
)), 'created', 'runs before 00:00:00Z do not consume the new UTC day quota');

reset role;
insert into tap_diagnostics select throws_ok($sql$
  select * from public.admit_ai_run_server(
    'f2800000-0000-4000-8000-000000000001',
    'f2800000-0000-4000-8000-000000000001',
    'f2800000-0000-4000-8000-000000000001',
    'f2800000-0000-4000-8000-000000000001', '{}'::jsonb, 1,
    array['extraction']::public.ai_task_key[], 'extraction',
    'f2800000-0000-4000-8000-000000000001', 3, 1, 10
  )
$sql$, '42501', 'FORBIDDEN', 'unauthorized invocation is rejected');

insert into tap_diagnostics select is((select count(*) from public.ai_runs where idempotency_key='f2810000-0000-4000-8000-000000000011'), 0::bigint, 'rejected admission remains absent after all checks');

do $$
declare
  failures text;
  diagnostics text;
begin
  select string_agg(result, E'\n') into diagnostics from tap_diagnostics;
  select string_agg(result, E'\n') into failures from finish() result;
  if failures is not null then
    raise exception 'pgTAP assertion results:%Summary:%', E'\n' || diagnostics || E'\n', E'\n' || failures;
  end if;
end $$;

rollback;

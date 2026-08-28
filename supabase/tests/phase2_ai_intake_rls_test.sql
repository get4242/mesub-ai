begin;

create extension if not exists pgtap with schema extensions;

select plan(32);

select has_table('public', 'ai_runs', 'ai runs table exists');
select has_table('public', 'ai_run_media', 'ai run media table exists');
select has_table('public', 'ai_sources', 'ai sources table exists');
select has_table('public', 'ai_usage_events', 'ai usage events table exists');
select has_table('public', 'ai_suggestions', 'ai suggestions table exists');
select has_table('public', 'property_confirmations', 'property confirmations table exists');
select has_function('private', 'enqueue_ai_run', array['uuid', 'uuid', 'uuid', 'integer'], 'private enqueue function exists');
select has_function('public', 'enqueue_ai_run_server', array['uuid', 'uuid', 'uuid', 'integer'], 'server queue bridge exists');
select has_function('public', 'archive_ai_run_job_server', array['bigint'], 'server queue archive bridge exists');
select has_function('public', 'accept_ai_suggestion', array['uuid', 'integer'], 'atomic accept function exists');
select has_function('public', 'reject_ai_suggestion', array['uuid'], 'atomic reject function exists');
select has_function('public', 'confirm_property_current_version', array['uuid', 'integer', 'integer', 'uuid'], 'atomic confirmation function exists');

select ok((select relrowsecurity from pg_class where oid = 'public.ai_runs'::regclass), 'ai runs has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.ai_run_media'::regclass), 'ai run media has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.ai_sources'::regclass), 'ai sources has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.ai_usage_events'::regclass), 'ai usage has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.ai_suggestions'::regclass), 'ai suggestions has RLS');
select ok((select relrowsecurity from pg_class where oid = 'public.property_confirmations'::regclass), 'confirmations has RLS');

select ok(not has_table_privilege('anon', 'public.ai_runs', 'select'), 'anonymous cannot read ai runs');
select ok(not has_table_privilege('anon', 'public.ai_sources', 'select'), 'anonymous cannot read ai sources');
select ok(not has_table_privilege('anon', 'public.ai_suggestions', 'select'), 'anonymous cannot read suggestions');
select ok(not has_table_privilege('anon', 'public.ai_usage_events', 'select'), 'anonymous cannot read usage');
select ok(not has_table_privilege('authenticated', 'public.ai_runs', 'insert'), 'authenticated cannot forge ai runs directly');
select ok(not has_table_privilege('authenticated', 'public.ai_usage_events', 'insert'), 'authenticated cannot forge usage');
select ok(not has_table_privilege('authenticated', 'public.ai_suggestions', 'update'), 'authenticated cannot bypass suggestion decision RPC');
select ok(not has_function_privilege('anon', 'public.accept_ai_suggestion(uuid,integer)', 'execute'), 'anonymous cannot accept suggestions');
select ok(not has_function_privilege('anon', 'public.confirm_property_current_version(uuid,integer,integer,uuid)', 'execute'), 'anonymous cannot confirm property');
select ok(not has_function_privilege('authenticated', 'private.enqueue_ai_run(uuid,uuid,uuid,integer)', 'execute'), 'client cannot enqueue queue payload directly');
select ok(not has_function_privilege('authenticated', 'public.enqueue_ai_run_server(uuid,uuid,uuid,integer)', 'execute'), 'authenticated client cannot call server queue bridge');
select ok(has_function_privilege('service_role', 'public.enqueue_ai_run_server(uuid,uuid,uuid,integer)', 'execute'), 'service role can call server queue bridge');
select ok(not has_function_privilege('authenticated', 'public.archive_ai_run_job_server(bigint)', 'execute'), 'authenticated client cannot archive queue jobs');
select ok(has_function_privilege('service_role', 'public.archive_ai_run_job_server(bigint)', 'execute'), 'service role can archive queue jobs');

do $$
declare
  test_failures text;
begin
  select string_agg(result, E'\n') into test_failures from finish() as result;
  if test_failures is not null then
    raise exception 'pgTAP failures:%', E'\n' || test_failures;
  end if;
end $$;

rollback;

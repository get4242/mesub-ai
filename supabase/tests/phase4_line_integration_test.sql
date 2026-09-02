begin;
create extension if not exists pgtap with schema extensions;
select plan(28);

select has_table('public','line_identity_links','LINE identity links exist');
select has_table('public','line_link_challenges','one-time link challenges exist');
select has_table('public','line_webhook_receipts','webhook receipts exist');
select has_table('public','line_notification_consents','notification consent exists');
select has_table('public','line_delivery_attempts','LINE delivery attempts exist');
select has_function('public','create_line_link_server',array['uuid','text','text','text','text','text'],'server-only link function exists');
select has_function('public','revoke_line_link_server',array['uuid','text'],'server-only unlink function exists');
select has_function('public','accept_line_webhook_server',array['text','text','text','bigint','jsonb','timestamp with time zone'],'idempotent webhook acceptance exists');
select has_function('public','read_line_jobs_server',array['integer','integer'],'LINE queue reader exists');
select has_function('public','archive_line_job_server',array['bigint'],'LINE queue archive exists');

select ok((select relrowsecurity from pg_class where oid='public.line_identity_links'::regclass),'identity links have RLS');
select ok((select relrowsecurity from pg_class where oid='public.line_link_challenges'::regclass),'link challenges have RLS');
select ok((select relrowsecurity from pg_class where oid='public.line_webhook_receipts'::regclass),'webhook receipts have RLS');
select ok((select relrowsecurity from pg_class where oid='public.line_notification_consents'::regclass),'notification consents have RLS');
select ok((select relrowsecurity from pg_class where oid='public.line_delivery_attempts'::regclass),'delivery attempts have RLS');

select ok(not has_table_privilege('anon','public.line_identity_links','select'),'anonymous cannot read LINE identities');
select ok(not has_table_privilege('anon','public.line_webhook_receipts','select'),'anonymous cannot read webhooks');
select ok(not has_table_privilege('authenticated','public.line_webhook_receipts','insert'),'Agent cannot forge webhook receipts');
select ok(not has_table_privilege('authenticated','public.line_link_challenges','insert'),'Agent cannot forge link challenges');
select ok(not has_table_privilege('authenticated','public.line_delivery_attempts','insert'),'Agent cannot forge delivery attempts');
select ok(not has_function_privilege('anon','public.create_line_link_server(uuid,text,text,text,text,text)','execute'),'anonymous cannot link');
select ok(not has_function_privilege('authenticated','public.create_line_link_server(uuid,text,text,text,text,text)','execute'),'Agent cannot call trusted link bridge');
select ok(has_function_privilege('service_role','public.create_line_link_server(uuid,text,text,text,text,text)','execute'),'service role can link after verification');
select ok(has_function_privilege('service_role','public.accept_line_webhook_server(text,text,text,bigint,jsonb,timestamptz)','execute'),'service role can accept verified webhook');
select col_is_pk('public','line_webhook_receipts','event_id','event ID is globally idempotent');
select col_is_unique('public','line_link_challenges','challenge_hash','challenge cannot replay');
select has_column('public','line_identity_links','subject_ciphertext','encrypted notification destination exists');
select col_type_is('public','line_identity_links','subject_ciphertext','text','encrypted destination is text');

select * from finish();
rollback;

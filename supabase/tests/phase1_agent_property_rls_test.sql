begin;

create extension if not exists pgtap with schema extensions;

select plan(35);

select has_table('public', 'agent_profiles', 'agent profiles table exists');
select has_table('public', 'audit_logs', 'audit logs table exists');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.agent_profiles'::regclass),
  'agent profiles has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.audit_logs'::regclass),
  'audit logs has RLS enabled'
);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values
  ('10000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'phase1-agent-a@example.com', '', now(), '{"display_name":"Phase 1 Agent A"}'),
  ('10000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'phase1-agent-b@example.com', '', now(), '{"display_name":"Phase 1 Agent B"}');

select is(
  (select count(*) from public.agent_profiles where user_id in (
    '10000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000002'
  )),
  2::bigint,
  'signup creates exactly one agent profile per user'
);

select is(
  (select count(*) from public.agent_profiles where tenant_id in (
    select id from public.tenants where created_by_user_id = '10000000-0000-4000-8000-000000000001'
  )),
  1::bigint,
  'signup creates exactly one agent profile for the personal tenant'
);

select ok(
  not has_table_privilege('anon', 'public.agent_profiles', 'select'),
  'anonymous has no canonical agent profile select privilege'
);
select ok(
  not has_table_privilege('anon', 'public.audit_logs', 'select'),
  'anonymous has no audit select privilege'
);

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}';

select is((select count(*) from public.agent_profiles), 1::bigint, 'agent sees only own tenant agent profile');
select throws_ok(
  $$select count(*) from public.audit_logs$$,
  '42501',
  null,
  'agent cannot read audit log rows'
);

update public.agent_profiles set bio = 'Agent A bio';
select is((select bio from public.agent_profiles), 'Agent A bio', 'agent can update allowlisted own profile fields');

select throws_ok(
  $$update public.agent_profiles set tenant_id = (
    select id from public.tenants where created_by_user_id = '10000000-0000-4000-8000-000000000002'
  )$$,
  '42501',
  null,
  'agent cannot reassign agent profile tenant ownership'
);

select throws_ok(
  $$insert into public.audit_logs (tenant_id, actor_user_id, action, entity_type, entity_id)
    values (
      (select tenant_id from public.agent_profiles limit 1),
      '10000000-0000-4000-8000-000000000001',
      'forged',
      'agent_profile',
      (select id from public.agent_profiles limit 1)
    )$$,
  '42501',
  null,
  'authenticated application role cannot append forged audit rows'
);

reset role;

select is(
  (select count(*) from public.agent_profiles where user_id = '10000000-0000-4000-8000-000000000002'),
  1::bigint,
  'cross-tenant update leaves the other agent profile intact'
);

select has_table('public', 'properties', 'properties table exists');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.properties'::regclass),
  'properties has RLS enabled'
);
select ok(not has_table_privilege('anon', 'public.properties', 'select'), 'anonymous has no canonical property select privilege');
select ok(not has_table_privilege('authenticated', 'public.properties', 'delete'), 'authenticated has no physical delete privilege');

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}';

insert into public.properties (
  tenant_id, owner_agent_id, listing_type, property_type, title, description,
  province, district, price, land_area_sqm
)
select tenant_id, id, 'sale', 'land', 'Agent A land', 'Private draft', 'เชียงใหม่', 'เมืองเชียงใหม่', 2500000, 400
from public.agent_profiles;

select is((select count(*) from public.properties), 1::bigint, 'agent can insert and read own property');
select is((select version from public.properties), 1, 'new property starts at version one');
select is((select critical_version from public.properties), 1, 'new property starts at critical version one');

reset role;

insert into public.properties (
  tenant_id, owner_agent_id, listing_type, property_type, title, description,
  province, district, price, land_area_sqm
)
select tenant_id, id, 'rent', 'land', 'Agent B land', 'Other private draft', 'ลำพูน', 'เมืองลำพูน', 12000, 200
from public.agent_profiles
where user_id = '10000000-0000-4000-8000-000000000002';

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}';

select is((select count(*) from public.properties), 1::bigint, 'property SELECT is tenant isolated');
select is((select count(*) from public.properties where title = 'Agent B land'), 0::bigint, 'cross-tenant property is invisible');

update public.properties set title = 'Forbidden cross tenant edit' where title = 'Agent B land';
select is((select count(*) from public.properties where title = 'Forbidden cross tenant edit'), 0::bigint, 'cross-tenant property update changes no row');

select throws_ok(
  $$update public.properties set tenant_id = '00000000-0000-0000-0000-000000000000'$$,
  '42501',
  null,
  'agent cannot reassign property tenant ownership'
);

select throws_ok(
  $$delete from public.properties$$,
  '42501',
  null,
  'agent cannot physically delete properties'
);

reset role;

select has_table('public', 'property_media', 'property media table exists');
select has_function('public', 'reorder_property_media', array['uuid', 'uuid[]'], 'atomic media reorder function exists');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.property_media'::regclass),
  'property media has RLS enabled'
);
select ok((select not public from storage.buckets where id = 'property-intake'), 'property intake bucket is private');
select ok((select not public from storage.buckets where id = 'property-published'), 'property published bucket is private in Phase 1');
select is((select file_size_limit from storage.buckets where id = 'property-intake'), 10485760::bigint, 'intake bucket has a 10 MiB file limit');
select ok(not has_table_privilege('anon', 'public.property_media', 'select'), 'anonymous has no property media select privilege');
select ok(not has_table_privilege('authenticated', 'public.property_media', 'delete'), 'authenticated has no physical media delete privilege');

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}';

insert into public.property_media (
  id, tenant_id, property_id, bucket_id, object_path, original_filename, mime_type,
  byte_size, width, height, checksum_sha256, position, status
)
select
  '20000000-0000-4000-8000-000000000001', tenant_id, id, 'property-intake', tenant_id || '/' || id || '/20000000-0000-4000-8000-000000000001/home.jpg',
  'home.jpg', 'image/jpeg', 1024, 1200, 800, repeat('a', 64), 0, 'ready'
from public.properties
where title = 'Agent A land';

select is((select count(*) from public.property_media), 1::bigint, 'agent can insert and read own tenant media metadata');

reset role;

do $$
declare
  test_failures text;
begin
  select string_agg(result, E'\n')
  into test_failures
  from finish() as result;

  if test_failures is not null then
    raise exception 'pgTAP failures:%', E'\n' || test_failures;
  end if;
end $$;

rollback;

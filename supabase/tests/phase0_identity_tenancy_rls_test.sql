begin;

create extension if not exists pgtap with schema extensions;

select plan(15);

select has_table('public', 'profiles', 'profiles table exists');
select has_table('public', 'tenants', 'tenants table exists');
select has_table('public', 'tenant_memberships', 'tenant memberships table exists');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'profiles has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.tenants'::regclass),
  'tenants has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.tenant_memberships'::regclass),
  'tenant memberships has RLS enabled'
);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at)
values
  ('00000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'agent-a@example.com', '', now()),
  ('00000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'agent-b@example.com', '', now());

select is((select count(*) from public.profiles), 2::bigint, 'signup creates a profile for each user');
select is((select count(*) from public.tenants), 2::bigint, 'signup creates one personal tenant for each user');
select is((select count(*) from public.tenant_memberships), 2::bigint, 'signup creates one owner membership for each user');

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}';

select is((select count(*) from public.profiles), 1::bigint, 'an agent sees only their own profile');
select is((select count(*) from public.tenants), 1::bigint, 'an agent sees only their own tenant');
select is((select count(*) from public.tenant_memberships), 1::bigint, 'an agent sees only their own membership');

update public.tenants set name = 'Agent A Workspace';
select is((select name from public.tenants), 'Agent A Workspace', 'tenant owner can update their own tenant');

reset role;
select is(
  (select name from public.tenants where created_by_user_id = '00000000-0000-4000-8000-000000000002'),
  'agent-b',
  'updating an owned tenant does not update another tenant'
);
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}';

select throws_ok(
  $$update public.tenant_memberships set user_id = '00000000-0000-4000-8000-000000000002'$$,
  '42501',
  null,
  'an agent cannot reassign membership ownership'
);

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

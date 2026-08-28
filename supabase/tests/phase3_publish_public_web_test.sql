begin;

create extension if not exists pgtap with schema extensions;

select plan(58);

select has_table('public', 'plans', 'plans table exists');
select has_table('public', 'plan_entitlements', 'plan entitlements table exists');
select has_table('public', 'tenant_subscriptions', 'tenant subscriptions table exists');
select has_table('public', 'usage_ledger', 'usage ledger table exists');
select has_function(
  'public',
  'get_effective_entitlement',
  array['uuid'],
  'effective entitlement resolver exists'
);
select has_table('public', 'notifications', 'tenant dashboard notifications exist');
select has_table('public', 'notification_deliveries', 'notification delivery attempts exist');
select has_function('private', 'enqueue_notification', array['uuid'], 'ID-only notification enqueue exists');
select has_function('public', 'read_notification_jobs_server', array['integer', 'integer'], 'service-role notification worker bridge exists');
select has_function('public', 'claim_notification_delivery_server', array['uuid'], 'service-role notification claim bridge exists');
select has_function('public', 'complete_notification_delivery_server', array['uuid', 'text', 'text'], 'service-role notification completion bridge exists');
select has_function('public', 'fail_notification_delivery_server', array['uuid', 'text'], 'service-role retry and dead-letter bridge exists');
select has_table('public', 'leads', 'minimal consented leads table exists');
select has_table('public', 'lead_routing_events', 'append-only lead routing history exists');
select has_table('public', 'platform_intake_queue', 'general leads use the Platform Intake Queue');
select ok(
  case when to_regclass('public.leads') is null then false
    else not has_table_privilege('anon', 'public.leads', 'select') end,
  'anonymous cannot read captured lead data'
);
select has_table('private', 'lead_rate_limits', 'provider-independent lead rate limits exist');
select has_function(
  'public',
  'capture_public_lead',
  array['public.lead_kind', 'uuid', 'text', 'text', 'text', 'text', 'text', 'text', 'text'],
  'idempotent canonical lead capture function exists'
);
select has_table('public', 'public_properties', 'maintained public property projection exists');
select has_table('public', 'public_property_media', 'public media allowlist exists');
select ok(
  case when to_regclass('public.public_properties') is null then false
    else has_table_privilege('anon', 'public.public_properties', 'select') end,
  'anonymous may read the public projection'
);
select ok(not has_table_privilege('anon', 'public.properties', 'select'), 'anonymous still cannot read canonical properties');
select has_function(
  'public',
  'search_public_properties',
  array['text', 'text', 'text', 'public.property_listing_type', 'public.property_type', 'numeric', 'numeric', 'text', 'integer', 'integer'],
  'deterministic PostgreSQL public search exists'
);
select has_table('public', 'property_publication_events', 'publication idempotency and audit table exists');
select has_function(
  'public',
  'publish_property',
  array['uuid', 'integer', 'text'],
  'atomic publication function exists'
);

select ok((select relrowsecurity from pg_class where oid = 'public.plans'::regclass), 'plans has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.plan_entitlements'::regclass), 'plan entitlements has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.tenant_subscriptions'::regclass), 'tenant subscriptions has RLS enabled');
select ok((select relrowsecurity from pg_class where oid = 'public.usage_ledger'::regclass), 'usage ledger has RLS enabled');
select ok(not has_table_privilege('anon', 'public.tenant_subscriptions', 'select'), 'anonymous cannot read subscriptions');
select ok(not has_table_privilege('authenticated', 'public.usage_ledger', 'insert'), 'agents cannot forge usage events');
select is((select integer_value from public.plan_entitlements where plan_code = 'free' and entitlement_key = 'active_property_limit'), 3, 'Free plan limit is three');
select is((select count(*) from public.tenants t where not exists (select 1 from public.tenant_subscriptions s where s.tenant_id = t.id and s.status = 'active')), 0::bigint, 'every existing tenant has an active subscription');
select is((select count(*) from public.tenant_subscriptions where status = 'active'), (select count(*) from public.tenants), 'exactly one active subscription exists per tenant');

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data)
values ('30000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'phase3-entitlement@example.com', '', now(), '{"display_name":"Phase 3 Entitlement"}');

select is((select count(*) from public.tenant_subscriptions s join public.tenants t on t.id = s.tenant_id where t.created_by_user_id = '30000000-0000-4000-8000-000000000001' and s.plan_code = 'free' and s.status = 'active'), 1::bigint, 'new tenant receives one Free subscription');
select is(private.provision_free_subscription((select id from public.tenants where created_by_user_id = '30000000-0000-4000-8000-000000000001')), private.provision_free_subscription((select id from public.tenants where created_by_user_id = '30000000-0000-4000-8000-000000000001')), 'Free provisioning is idempotent');

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"30000000-0000-4000-8000-000000000001","role":"authenticated"}';
select is((select count(*) from public.tenant_subscriptions), 1::bigint, 'agent sees only own tenant subscription');
reset role;

insert into public.properties (
  id, tenant_id, owner_agent_id, listing_type, property_type, title, description,
  province, district, price, land_area_sqm
)
select property_id, agent.tenant_id, agent.id, 'sale', 'land', title, 'Confirmed publication test',
  'เชียงใหม่', 'เมืองเชียงใหม่', 1000000, 100
from public.agent_profiles as agent
cross join (values
  ('31000000-0000-4000-8000-000000000001'::uuid, 'Publish one'),
  ('31000000-0000-4000-8000-000000000002'::uuid, 'Publish two'),
  ('31000000-0000-4000-8000-000000000003'::uuid, 'Publish three'),
  ('31000000-0000-4000-8000-000000000004'::uuid, 'Keep fourth draft')
) as fixture(property_id, title)
where agent.user_id = '30000000-0000-4000-8000-000000000001';

insert into public.property_confirmations (
  tenant_id, property_id, confirmed_by_user_id, property_version, critical_version
)
select property.tenant_id, property.id, '30000000-0000-4000-8000-000000000001', property.version, property.critical_version
from public.properties as property
where property.id::text like '31000000-0000-4000-8000-%';

set local role authenticated;
set local "request.jwt.claims" = '{"sub":"30000000-0000-4000-8000-000000000001","role":"authenticated"}';
select is(public.publish_property('31000000-0000-4000-8000-000000000001', 1, 'publish-property-one')->>'outcome', 'published', 'first property publishes');
select is(public.publish_property('31000000-0000-4000-8000-000000000002', 1, 'publish-property-two')->>'outcome', 'published', 'second property publishes');
select is(public.publish_property('31000000-0000-4000-8000-000000000003', 1, 'publish-property-three')->>'outcome', 'published', 'third property publishes');
select is(public.publish_property('31000000-0000-4000-8000-000000000004', 1, 'publish-property-four')->>'outcome', 'quota_exceeded', 'fourth property is blocked at Free quota');
select is(public.publish_property('31000000-0000-4000-8000-000000000001', 1, 'publish-property-one')->>'outcome', 'already_published', 'same idempotency key is duplicate safe');
select is((select status::text from public.properties where id = '31000000-0000-4000-8000-000000000004'), 'draft', 'blocked fourth property remains a draft');
select is((select count(*) from public.usage_ledger where event_type = 'property_published' and source_id::text like '31000000-0000-4000-8000-%'), 3::bigint, 'successful publications create exactly three usage events');
reset role;

select is(public.capture_public_lead('property', '31000000-0000-4000-8000-000000000001', 'Buyer', 'buyer@example.com', '', 'Interested', 'privacy-v1', 'lead-property-001', 'property-rate-key')->>'outcome', 'accepted', 'property lead is accepted without a client tenant destination');
select is((select lead.tenant_id from public.leads as lead where lead.idempotency_key = 'lead-property-001'), (select property.tenant_id from public.properties as property where property.id = '31000000-0000-4000-8000-000000000001'), 'property lead derives the canonical owning tenant');
select is((select route.target_tenant_id from public.lead_routing_events as route join public.leads as lead on lead.id = route.lead_id where lead.idempotency_key = 'lead-property-001'), (select property.tenant_id from public.properties as property where property.id = '31000000-0000-4000-8000-000000000001'), 'property routing event targets the canonical tenant');
select is((select count(*) from public.notifications as notification join public.leads as lead on lead.id = notification.lead_id where lead.idempotency_key = 'lead-property-001'), 1::bigint, 'property lead creates one dashboard notification');
select is((select count(*) from public.notification_deliveries as delivery join public.notifications as notification on notification.id = delivery.notification_id join public.leads as lead on lead.id = notification.lead_id where lead.idempotency_key = 'lead-property-001' and delivery.status = 'queued'), 1::bigint, 'property lead creates one queued email delivery');
select is(public.capture_public_lead('property', '31000000-0000-4000-8000-000000000001', 'Buyer', 'buyer@example.com', '', 'Interested', 'privacy-v1', 'lead-property-001', 'property-rate-key')->>'duplicate', 'true', 'duplicate property lead request is idempotent');
select is(public.capture_public_lead('general', null, 'General', '', '0800000000', 'Need help', 'privacy-v1', 'lead-general-001', 'general-rate-key')->>'outcome', 'accepted', 'general lead is accepted');
select is((select status::text from public.platform_intake_queue as intake join public.leads as lead on lead.id = intake.lead_id where lead.idempotency_key = 'lead-general-001' and lead.tenant_id is null), 'unassigned', 'general lead remains unassigned in Platform Intake Queue');
select public.capture_public_lead('general', null, 'Rate', '', '0800000000', 'Rate check', 'privacy-v1', 'rate-lead-' || value, 'shared-rate-key') from generate_series(1, 5) as value;
select is(public.capture_public_lead('general', null, 'Rate', '', '0800000000', 'Rate check', 'privacy-v1', 'rate-lead-6', 'shared-rate-key')->>'outcome', 'rate_limited', 'sixth request in one minute is rate limited');

set local role service_role;
set local "request.jwt.claims" = '{"role":"service_role"}';
select is((public.claim_notification_delivery_server((select notification.id from public.notifications notification join public.leads lead on lead.id = notification.lead_id where lead.idempotency_key = 'lead-property-001'))->>'attempt')::integer, 1, 'notification worker claims attempt one');
select is(public.fail_notification_delivery_server((select notification.id from public.notifications notification join public.leads lead on lead.id = notification.lead_id where lead.idempotency_key = 'lead-property-001'), 'DELIVERY_FAILED'), 'queued', 'first notification failure schedules retry');
select public.claim_notification_delivery_server((select notification.id from public.notifications notification join public.leads lead on lead.id = notification.lead_id where lead.idempotency_key = 'lead-property-001'));
select public.fail_notification_delivery_server((select notification.id from public.notifications notification join public.leads lead on lead.id = notification.lead_id where lead.idempotency_key = 'lead-property-001'), 'DELIVERY_FAILED');
select public.claim_notification_delivery_server((select notification.id from public.notifications notification join public.leads lead on lead.id = notification.lead_id where lead.idempotency_key = 'lead-property-001'));
select is(public.fail_notification_delivery_server((select notification.id from public.notifications notification join public.leads lead on lead.id = notification.lead_id where lead.idempotency_key = 'lead-property-001'), 'DELIVERY_FAILED'), 'dead_letter', 'third notification failure moves delivery to dead letter');
select is((select count(*) from public.usage_ledger where event_type = 'notification_failed' and source_id = (select notification.id from public.notifications notification join public.leads lead on lead.id = notification.lead_id where lead.idempotency_key = 'lead-property-001')), 3::bigint, 'each bounded notification failure creates one minimized usage event');
reset role;
select has_function(
  'private',
  'provision_free_subscription',
  array['uuid'],
  'idempotent Free subscription provisioner exists'
);

do $$
declare test_failures text;
begin
  select string_agg(result, E'\n') into test_failures from finish() as result;
  if test_failures is not null then raise exception 'pgTAP failures:%', E'\n' || test_failures; end if;
end $$;

rollback;

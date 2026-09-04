select jsonb_build_object(
  'auth_users_total', (select count(*) from auth.users),
  'test_auth_users', (select count(*) from auth.users where lower(coalesce(email, '')) ~ '(phase[0-9]|agent-[ab]|test|fixture|example\.com)'),
  'tenants_total', (select count(*) from public.tenants),
  'test_tenants', (select count(*) from public.tenants where lower(name) ~ '(phase[0-9]|test|fixture|tenant [ab])'),
  'properties_total', (select count(*) from public.properties),
  'leads_total', (select count(*) from public.leads),
  'ai_runs_total', (select count(*) from public.ai_runs),
  'line_webhooks_total', (select count(*) from public.line_webhook_receipts),
  'storage_objects_total', (select count(*) from storage.objects),
  'public_tables_without_rls', (
    select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity
  ),
  'storage_buckets', (
    select coalesce(jsonb_agg(jsonb_build_object('id', id, 'public', public) order by id), '[]'::jsonb)
    from storage.buckets
  ),
  'queue_metrics', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'queue_name', m.queue_name,
      'queue_length', m.queue_length,
      'visible_length', m.queue_visible_length
    ) order by m.queue_name), '[]'::jsonb)
    from pgmq.metrics_all() m
  )
);

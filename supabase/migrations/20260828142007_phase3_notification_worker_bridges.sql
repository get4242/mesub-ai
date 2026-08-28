create function public.claim_notification_delivery_server(target_notification_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare delivery public.notification_deliveries;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  update public.notification_deliveries
  set status = 'running', attempt_count = attempt_count + 1, updated_at = now()
  where notification_id = target_notification_id and channel = 'email' and status = 'queued' and attempt_count < 3
  returning * into delivery;
  if not found then return null; end if;
  return jsonb_build_object('notificationId', target_notification_id, 'attempt', delivery.attempt_count);
end;
$$;

create function public.complete_notification_delivery_server(target_notification_id uuid, delivery_provider text, delivery_receipt_id text)
returns void language plpgsql security definer set search_path = '' as $$
declare target_tenant_id uuid;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  update public.notification_deliveries as delivery
  set status = 'delivered', provider = delivery_provider, provider_receipt_id = delivery_receipt_id,
      delivered_at = now(), last_error_code = null, updated_at = now()
  where delivery.notification_id = target_notification_id and delivery.channel = 'email' and delivery.status = 'running';
  if not found then return; end if;
  select tenant_id into target_tenant_id from public.notifications where id = target_notification_id;
  insert into public.usage_ledger (tenant_id, event_type, source_type, source_id, idempotency_key)
  values (target_tenant_id, 'notification_delivered', 'notification', target_notification_id, 'notification-delivered:' || target_notification_id)
  on conflict (tenant_id, event_type, idempotency_key) do nothing;
end;
$$;

create function public.fail_notification_delivery_server(target_notification_id uuid, safe_error_code text)
returns text language plpgsql security definer set search_path = '' as $$
declare delivery public.notification_deliveries; target_tenant_id uuid; next_status text;
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then raise exception 'FORBIDDEN' using errcode = '42501'; end if;
  update public.notification_deliveries
  set status = case when attempt_count >= 3 then 'dead_letter'::public.notification_delivery_status else 'queued'::public.notification_delivery_status end,
      last_error_code = left(coalesce(safe_error_code, 'DELIVERY_FAILED'), 80), updated_at = now()
  where notification_id = target_notification_id and channel = 'email' and status = 'running'
  returning * into delivery;
  if not found then return 'unchanged'; end if;
  next_status := delivery.status::text;
  select tenant_id into target_tenant_id from public.notifications where id = target_notification_id;
  insert into public.usage_ledger (tenant_id, event_type, source_type, source_id, idempotency_key, metadata)
  values (target_tenant_id, 'notification_failed', 'notification', target_notification_id,
    'notification-failed:' || target_notification_id || ':' || delivery.attempt_count,
    jsonb_build_object('attempt', delivery.attempt_count, 'deadLetter', next_status = 'dead_letter'))
  on conflict (tenant_id, event_type, idempotency_key) do nothing;
  return next_status;
end;
$$;

revoke all on function public.claim_notification_delivery_server(uuid) from public, anon, authenticated;
revoke all on function public.complete_notification_delivery_server(uuid, text, text) from public, anon, authenticated;
revoke all on function public.fail_notification_delivery_server(uuid, text) from public, anon, authenticated;
grant execute on function public.claim_notification_delivery_server(uuid) to service_role;
grant execute on function public.complete_notification_delivery_server(uuid, text, text) to service_role;
grant execute on function public.fail_notification_delivery_server(uuid, text) to service_role;

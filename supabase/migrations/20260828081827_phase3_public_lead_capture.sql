create table private.lead_rate_limits (
  rate_key_hash char(64) not null,
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  primary key (rate_key_hash, window_started_at)
);

revoke all on private.lead_rate_limits from public, anon, authenticated;

create function public.capture_public_lead(
  requested_kind public.lead_kind,
  requested_property_id uuid,
  requester_name text,
  requester_email text,
  requester_phone text,
  requester_message text,
  requested_consent_version text,
  request_idempotency_key text,
  request_rate_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_tenant_id uuid;
  captured_lead_id uuid;
  rate_hash char(64);
  rate_window timestamptz := date_trunc('minute', now());
  current_count integer;
begin
  if char_length(trim(requester_name)) not between 1 and 120
    or char_length(trim(requester_message)) not between 1 and 2000
    or char_length(trim(requested_consent_version)) not between 1 and 40
    or char_length(trim(request_idempotency_key)) not between 8 and 200
    or char_length(trim(request_rate_key)) not between 8 and 200
    or (nullif(trim(requester_email), '') is null and nullif(trim(requester_phone), '') is null) then
    return jsonb_build_object('outcome', 'invalid');
  end if;

  rate_hash := encode(extensions.digest(trim(request_rate_key), 'sha256'), 'hex');
  insert into private.lead_rate_limits (rate_key_hash, window_started_at, request_count)
  values (rate_hash, rate_window, 1)
  on conflict (rate_key_hash, window_started_at) do update
    set request_count = private.lead_rate_limits.request_count + 1
  returning request_count into current_count;
  if current_count > 5 then
    return jsonb_build_object('outcome', 'rate_limited');
  end if;

  if requested_kind = 'property' then
    select property.tenant_id into target_tenant_id
    from public.properties as property
    where property.id = requested_property_id and property.status = 'published';
    if target_tenant_id is null then return jsonb_build_object('outcome', 'accepted'); end if;
  elsif requested_kind = 'general' then
    requested_property_id := null;
  else
    return jsonb_build_object('outcome', 'invalid');
  end if;

  insert into public.leads (
    kind, tenant_id, property_id, name, email, phone, message,
    consent_purpose, consent_version, consented_at, idempotency_key
  ) values (
    requested_kind, target_tenant_id, requested_property_id, trim(requester_name),
    nullif(trim(requester_email), ''), nullif(trim(requester_phone), ''), trim(requester_message),
    'property_enquiry', trim(requested_consent_version), now(), trim(request_idempotency_key)
  ) on conflict (kind, idempotency_key) do nothing
  returning id into captured_lead_id;

  if captured_lead_id is null then
    select id into captured_lead_id from public.leads
    where kind = requested_kind and idempotency_key = trim(request_idempotency_key);
    return jsonb_build_object('outcome', 'accepted', 'duplicate', true);
  end if;

  if requested_kind = 'property' then
    insert into public.lead_routing_events (lead_id, route_kind, target_tenant_id, idempotency_key)
    values (captured_lead_id, 'property_owner', target_tenant_id, 'route:' || trim(request_idempotency_key));
    insert into public.usage_ledger (tenant_id, event_type, source_type, source_id, idempotency_key)
    values (target_tenant_id, 'lead_accepted', 'lead', captured_lead_id, 'lead:' || trim(request_idempotency_key));
  else
    insert into public.lead_routing_events (lead_id, route_kind, target_tenant_id, idempotency_key)
    values (captured_lead_id, 'platform_intake', null, 'route:' || trim(request_idempotency_key));
    insert into public.platform_intake_queue (lead_id) values (captured_lead_id);
  end if;

  return jsonb_build_object('outcome', 'accepted', 'duplicate', false);
end;
$$;

revoke all on function public.capture_public_lead(public.lead_kind, uuid, text, text, text, text, text, text, text)
  from public, anon, authenticated;
grant execute on function public.capture_public_lead(public.lead_kind, uuid, text, text, text, text, text, text, text)
  to service_role;

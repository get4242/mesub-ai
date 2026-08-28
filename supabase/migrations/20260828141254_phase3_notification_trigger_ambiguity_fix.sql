create or replace function private.create_lead_notification()
returns trigger language plpgsql security definer set search_path = '' as $$
declare created_notification_id uuid;
begin
  if new.route_kind <> 'property_owner' then return new; end if;
  insert into public.notifications (tenant_id, lead_id) values (new.target_tenant_id, new.lead_id)
  on conflict (tenant_id, lead_id, kind) do update set tenant_id = excluded.tenant_id
  returning id into created_notification_id;
  insert into public.notification_deliveries (notification_id, channel)
  values (created_notification_id, 'email')
  on conflict (notification_id, channel) do nothing;
  perform private.enqueue_notification(created_notification_id);
  return new;
end;
$$;

revoke all on function private.create_lead_notification() from public, anon, authenticated;

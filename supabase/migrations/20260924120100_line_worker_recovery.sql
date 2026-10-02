alter table public.line_webhook_receipts add column processing_started_at timestamptz;
alter table public.line_webhook_receipts add column response_messages jsonb;

create or replace function public.claim_line_webhook_server(target_event_id text)
returns table(event_id text,event_type text,payload jsonb)
language plpgsql security definer set search_path='' as $$
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  return query with claimed as (
    update public.line_webhook_receipts r set status='running',processing_started_at=now()
    where r.event_id=target_event_id and r.retention_until>now()
      and (r.status='queued' or (r.status='running' and coalesce(r.processing_started_at,r.received_at)<now()-interval '2 minutes'))
    returning r.event_id,r.event_type,r.normalized_payload,r.response_messages
  ) select c.event_id,c.event_type,c.normalized_payload || jsonb_build_object('responseMessages',c.response_messages) from claimed c;
end $$;

create function public.line_cache_response_server(target_event_id text, target_messages jsonb)
returns void language plpgsql security definer set search_path='' as $$
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if jsonb_typeof(target_messages)<>'array' or jsonb_array_length(target_messages) not between 1 and 5 then
    raise exception 'INVALID_MESSAGES';
  end if;
  update public.line_webhook_receipts set response_messages=target_messages
  where event_id=target_event_id and status='running' and response_messages is null;
end $$;

create function public.line_event_terminal_server(target_event_id text)
returns boolean language plpgsql stable security definer set search_path='' as $$
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  return coalesce((select status in ('completed','ignored','dead_letter') or retention_until<=now()
    from public.line_webhook_receipts where event_id=target_event_id),true);
end $$;

revoke all on function public.line_cache_response_server(text,jsonb),public.line_event_terminal_server(text) from public,anon,authenticated;
grant execute on function public.line_cache_response_server(text,jsonb),public.line_event_terminal_server(text) to service_role;

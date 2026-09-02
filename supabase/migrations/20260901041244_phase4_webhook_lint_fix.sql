create or replace function public.accept_line_webhook_server(
  target_event_id text,
  target_environment text,
  target_event_type text,
  target_timestamp_ms bigint,
  target_payload jsonb,
  target_retention_until timestamptz
) returns boolean language plpgsql security definer set search_path='' as $$
declare affected integer;
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if target_environment not in ('development','review') then raise exception 'ENVIRONMENT_FORBIDDEN' using errcode='42501'; end if;
  insert into public.line_webhook_receipts(event_id,environment,event_type,event_timestamp_ms,normalized_payload,retention_until)
  values(target_event_id,target_environment,target_event_type,target_timestamp_ms,coalesce(target_payload,'{}'::jsonb),target_retention_until)
  on conflict(event_id) do nothing;
  get diagnostics affected = row_count;
  if affected = 0 then return false; end if;
  perform pgmq.send('mesub_line_jobs',jsonb_build_object('eventId',target_event_id,'schemaVersion',1));
  return true;
end $$;

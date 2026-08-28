create function public.enqueue_ai_run_server(run_id uuid, tenant_id uuid, trace_id uuid, schema_version integer)
returns bigint language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'FORBIDDEN' using errcode = '42501';
  end if;
  return private.enqueue_ai_run(run_id, tenant_id, trace_id, schema_version);
end;
$$;

revoke all on function public.enqueue_ai_run_server(uuid,uuid,uuid,integer) from public, anon, authenticated;
grant execute on function public.enqueue_ai_run_server(uuid,uuid,uuid,integer) to service_role;
comment on function public.enqueue_ai_run_server(uuid,uuid,uuid,integer) is
  'Service-role-only bridge to the private ID-only Supabase Queue dispatcher.';

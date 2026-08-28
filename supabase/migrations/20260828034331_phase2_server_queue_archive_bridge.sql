create function public.archive_ai_run_job_server(message_id bigint)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  return private.archive_ai_run_job(message_id);
end;
$$;
revoke all on function public.archive_ai_run_job_server(bigint) from public, anon, authenticated;
grant execute on function public.archive_ai_run_job_server(bigint) to service_role;

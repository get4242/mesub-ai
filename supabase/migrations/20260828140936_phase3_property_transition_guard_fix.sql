create function private.require_server_property_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status is distinct from old.status
    and new.status in ('published', 'sold', 'inactive')
    and coalesce(current_setting('app.property_transition_authorized', true), 'false') <> 'true' then
    raise exception 'PROPERTY_TRANSITION_REQUIRES_SERVER_ACTION' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger properties_00_require_server_transition
before update on public.properties
for each row execute function private.require_server_property_transition();

revoke all on function private.require_server_property_transition() from public, anon, authenticated;

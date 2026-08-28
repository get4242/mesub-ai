create or replace function private.reject_immutable_ai_row_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then return old; end if;
  raise exception 'IMMUTABLE_AI_RECORD' using errcode = '55000';
end;
$$;

revoke all on function private.reject_immutable_ai_row_update() from public, anon, authenticated;

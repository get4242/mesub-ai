alter table public.line_identity_links
  add column subject_ciphertext text check (subject_ciphertext is null or char_length(subject_ciphertext) between 40 and 1000);

drop function public.create_line_link_server(uuid,text,text,text,text);
create function public.create_line_link_server(
  target_user_id uuid,
  target_provider_id text,
  target_environment text,
  target_subject_hash text,
  target_subject_ciphertext text,
  target_challenge_hash text
) returns uuid language plpgsql security definer set search_path='' as $$
declare challenge public.line_link_challenges; link_id uuid;
begin
  if coalesce(auth.jwt()->>'role','') <> 'service_role' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if target_environment not in ('development','review') then raise exception 'ENVIRONMENT_FORBIDDEN' using errcode='42501'; end if;
  if char_length(coalesce(target_subject_ciphertext,'')) < 40 then raise exception 'DESTINATION_REQUIRED' using errcode='22023'; end if;
  select * into challenge from public.line_link_challenges
    where user_id=target_user_id and challenge_hash=target_challenge_hash and consumed_at is null and expires_at>now()
    for update;
  if not found then raise exception 'LINK_CHALLENGE_INVALID' using errcode='55000'; end if;
  update public.line_link_challenges set consumed_at=now() where id=challenge.id;
  insert into public.line_identity_links(user_id,provider_id,environment,subject_hash,subject_ciphertext,consent_version)
  values(target_user_id,trim(target_provider_id),target_environment,target_subject_hash,target_subject_ciphertext,'line-link-v1')
  returning id into link_id;
  insert into public.line_audit_events(user_id,event_type,line_link_id) values(target_user_id,'line_identity_linked',link_id);
  return link_id;
end $$;
revoke all on function public.create_line_link_server(uuid,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.create_line_link_server(uuid,text,text,text,text,text) to service_role;

create or replace function public.claim_line_delivery_server(target_delivery_id uuid,target_cap integer default 20)
returns table(notification_id text,destination text,message text,attempt integer)
language plpgsql security definer set search_path='' as $$
begin
  if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  return query with claimed as (
    update public.line_delivery_attempts d set status='running',attempt_count=attempt_count+1,updated_at=now()
    from public.line_identity_links l,public.line_notification_consents c,public.notifications n
    left join public.leads lead on lead.id=n.lead_id
    left join public.appointments a on a.id=n.appointment_id
    where d.id=target_delivery_id and d.attempt_count<3
      and (d.status='queued' or (d.status='running' and d.updated_at<now()-interval '2 minutes'))
      and d.line_link_id=l.id and l.revoked_at is null and c.user_id=l.user_id and c.enabled and d.notification_id=n.id
      and (n.kind='new_lead' or (a.status='confirmed' and a.version=n.appointment_version and a.starts_at>now() and l.environment=n.line_environment))
      and (select count(*) from public.line_delivery_attempts sent where sent.line_link_id=l.id and sent.status='delivered' and sent.delivered_at>=date_trunc('day',now()))<greatest(1,least(target_cap,100))
    returning d.id::text as notification_id,l.subject_ciphertext as destination,
      case when n.kind='appointment_reminder' then n.message else 'ลูกค้าใหม่สนใจทรัพย์: '||lead.name end as message,d.attempt_count as attempt
  ) select c.notification_id,c.destination,c.message,c.attempt from claimed c;
end $$;

create function public.line_delivery_terminal_server(target_delivery_id uuid)
returns boolean language plpgsql stable security definer set search_path='' as $$
begin
  if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  return coalesce((select d.status in ('delivered','dead_letter') or d.attempt_count>=3
    or l.revoked_at is not null or not coalesce(c.enabled,false)
    or (n.kind='appointment_reminder' and (a.status<>'confirmed' or a.version<>n.appointment_version or a.starts_at<=now()))
    from public.line_delivery_attempts d join public.line_identity_links l on l.id=d.line_link_id
    join public.notifications n on n.id=d.notification_id
    left join public.line_notification_consents c on c.user_id=l.user_id
    left join public.appointments a on a.id=n.appointment_id
    where d.id=target_delivery_id),true);
end $$;
revoke all on function public.line_delivery_terminal_server(uuid) from public,anon,authenticated;
grant execute on function public.line_delivery_terminal_server(uuid) to service_role;

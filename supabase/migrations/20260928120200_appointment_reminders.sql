alter table public.notifications alter column lead_id drop not null;
alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check(kind in ('new_lead','appointment_reminder'));
alter table public.notifications add column appointment_id uuid references public.appointments(id);
alter table public.notifications add column appointment_version integer;
alter table public.notifications add column line_environment text;
alter table public.notifications add column message text check(length(message)<=500);
alter table public.notifications add constraint notifications_subject_check check(
  (kind='new_lead' and lead_id is not null) or
  (kind='appointment_reminder' and appointment_id is not null and appointment_version is not null and line_environment in ('development','review','production'))
);
create unique index notifications_appointment_once on public.notifications(appointment_id,appointment_version,line_environment) where kind='appointment_reminder';

create or replace function private.enqueue_line_delivery()
returns trigger language plpgsql security definer set search_path='' as $$
declare link_id uuid; attempt_id uuid;
begin
  select l.id into link_id from public.line_identity_links l
  join public.line_notification_consents c on c.user_id=l.user_id and c.enabled
  join public.tenant_memberships m on m.user_id=l.user_id and m.tenant_id=new.tenant_id and m.status='active' and m.role='owner'
  where l.revoked_at is null and (new.line_environment is null or l.environment=new.line_environment)
  order by l.linked_at desc limit 1;
  if link_id is null then return new; end if;
  insert into public.line_delivery_attempts(notification_id,line_link_id,idempotency_key)
  values(new.id,link_id,'line-notification:'||new.id::text) on conflict(idempotency_key) do nothing returning id into attempt_id;
  if attempt_id is not null then perform pgmq.send('mesub_line_notification_jobs',jsonb_build_object('notificationId',attempt_id,'schemaVersion',1)); end if;
  return new;
end $$;

create function public.enqueue_due_appointment_reminders_server(target_environment text)
returns integer language plpgsql security definer set search_path='' as $$
declare item public.appointments; total integer:=0;
begin
  if coalesce(auth.jwt()->>'role','')<>'service_role' then raise exception 'FORBIDDEN' using errcode='42501'; end if;
  if target_environment not in ('development','review','production') then raise exception 'INVALID_ENVIRONMENT'; end if;
  for item in select * from public.appointments where status='confirmed' and starts_at>now()
    and starts_at-make_interval(mins=>reminder_minutes)<=now() and reminder_queued_version is distinct from version
    order by starts_at for update skip locked limit 50 loop
    insert into public.notifications(tenant_id,lead_id,kind,appointment_id,appointment_version,line_environment,message)
    values(item.tenant_id,item.lead_id,'appointment_reminder',item.id,item.version,target_environment,
      left('เตือนนัดชมทรัพย์: '||item.customer_name||' วันที่ '||to_char(item.starts_at at time zone 'Asia/Bangkok','DD/MM/YYYY HH24:MI')||' (เวลาไทย)',500))
    on conflict(appointment_id,appointment_version,line_environment) where kind='appointment_reminder' do nothing;
    update public.appointments set reminder_queued_version=item.version where id=item.id;
    total:=total+1;
  end loop;
  return total;
end $$;
revoke all on function public.enqueue_due_appointment_reminders_server(text) from public,anon,authenticated;
grant execute on function public.enqueue_due_appointment_reminders_server(text) to service_role;

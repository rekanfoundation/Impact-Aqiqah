-- ============================================================
-- ImpactAqiqah — 12 Reminders (SLA) untuk Automation/n8n
-- Acuan: docs/18_AUTOMATION_WORKFLOW, docs/12.
-- enqueue_due_reminders(): scan order lewat SLA -> insert ke outbox notifications.
-- Idempoten per window: tidak menggandakan kind yang sama dalam periode SLA.
-- ============================================================

create or replace function public.sla_hours(p_key text, p_default int)
returns int
language sql stable
as $$
  select coalesce((select (value ->> 'hours')::int from public.app_settings where key = p_key), p_default);
$$;

create or replace function public.enqueue_due_reminders()
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_count int := 0;
  v_doc_sla int := public.sla_hours('sla_documentation_hours', 24);
  v_dist_sla int := public.sla_hours('sla_distribution_hours', 24);
  v_rep_sla int := public.sla_hours('sla_report_hours', 48);
  r record;
begin
  -- 1) Dokumentasi tertunda: order di tahap distribution/documentation, belum lengkap, lewat SLA
  for r in
    select o.id, o.order_number
    from public.orders o
    where o.deleted_at is null
      and o.status in ('distribution','documentation')
      and o.updated_at < now() - make_interval(hours => v_doc_sla)
      and not exists (
        select 1 from public.documentations d
        where d.order_id = o.id and d.stage='distribution' and d.status='approved'
      )
  loop
    if not exists (
      select 1 from public.notifications n
      where n.order_id = r.id and n.payload->>'kind' = 'reminder_documentation'
        and n.created_at > now() - make_interval(hours => v_doc_sla)
    ) then
      insert into public.notifications(order_id, channel, payload, status)
      values (r.id, 'dashboard',
        jsonb_build_object('kind','reminder_documentation','order_number',r.order_number,
          'message','Dokumentasi belum lengkap melewati SLA'), 'queued');
      v_count := v_count + 1;
    end if;
  end loop;

  -- 2) Distribusi tertunda: ada hewan slaughtered tapi belum ada distribusi, lewat SLA
  for r in
    select o.id, o.order_number
    from public.orders o
    where o.deleted_at is null
      and o.status in ('slaughtering','distribution')
      and o.updated_at < now() - make_interval(hours => v_dist_sla)
      and exists (select 1 from public.animals a where a.order_id=o.id and a.status='slaughtered')
      and not exists (select 1 from public.distributions d where d.order_id=o.id)
  loop
    if not exists (
      select 1 from public.notifications n
      where n.order_id = r.id and n.payload->>'kind' = 'reminder_distribution'
        and n.created_at > now() - make_interval(hours => v_dist_sla)
    ) then
      insert into public.notifications(order_id, channel, payload, status)
      values (r.id, 'dashboard',
        jsonb_build_object('kind','reminder_distribution','order_number',r.order_number,
          'message','Distribusi belum dicatat melewati SLA'), 'queued');
      v_count := v_count + 1;
    end if;
  end loop;

  -- 3) Laporan tertunda: status reporting tanpa report, lewat SLA
  for r in
    select o.id, o.order_number
    from public.orders o
    where o.deleted_at is null
      and o.status = 'reporting'
      and o.updated_at < now() - make_interval(hours => v_rep_sla)
      and not exists (select 1 from public.reports rp where rp.order_id=o.id)
  loop
    if not exists (
      select 1 from public.notifications n
      where n.order_id = r.id and n.payload->>'kind' = 'reminder_report'
        and n.created_at > now() - make_interval(hours => v_rep_sla)
    ) then
      insert into public.notifications(order_id, channel, payload, status)
      values (r.id, 'dashboard',
        jsonb_build_object('kind','reminder_report','order_number',r.order_number,
          'message','Laporan belum dibuat melewati SLA'), 'queued');
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

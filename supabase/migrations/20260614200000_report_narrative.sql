-- ============================================================
-- ImpactAqiqah — 20 Report Narrative (AI Report Writer, docs/19 §4)
-- Tambah kolom narasi pada reports + ekspos di get_public_report.
-- Narasi = draf AI yang ditinjau manusia (human-in-the-loop) sebelum generate.
-- ============================================================

alter table public.reports
  add column if not exists narrative    text,
  add column if not exists narrative_ai boolean not null default false;

comment on column public.reports.narrative is 'Narasi laporan (AI Report Writer / hasil edit reviewer)';
comment on column public.reports.narrative_ai is 'true bila narasi berasal dari draf AI yang belum diedit';

-- get_public_report: sertakan narasi versi terbaru pada subobjek report.
create or replace function public.get_public_report(p_token text)
returns jsonb
language plpgsql
stable
security definer set search_path = public
as $$
declare
  v_order public.orders;
  v_result jsonb;
begin
  if p_token is null or length(p_token) < 16 then
    return null; -- anti-enumerasi: token pendek langsung null
  end if;

  select * into v_order from public.orders where public_token = p_token and deleted_at is null;
  if v_order.id is null then
    return null;
  end if;

  select jsonb_build_object(
    'order_number', v_order.order_number,
    'status', v_order.status,
    'created_at', v_order.created_at,
    'participant', (select name from public.participants where id = v_order.participant_id),
    'branch', (select name from public.branches where id = v_order.branch_id),
    'schedule', (
      select jsonb_build_object('date', s.scheduled_date, 'location', l.name)
      from public.schedules s left join public.locations l on l.id = s.location_id
      where s.order_id = v_order.id
    ),
    'items', (
      select coalesce(jsonb_agg(jsonb_build_object('name', sv.name, 'qty', oi.qty)), '[]'::jsonb)
      from public.order_items oi join public.services sv on sv.id = oi.service_id
      where oi.order_id = v_order.id
    ),
    'animals_total', (select count(*) from public.animals where order_id = v_order.id),
    'animals_distributed', (select count(*) from public.animals where order_id = v_order.id and status = 'distributed'),
    'distributions', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'recipient', d.recipient_name, 'area', d.recipient_area, 'packages', d.packages_count)), '[]'::jsonb)
      from public.distributions d where d.order_id = v_order.id
    ),
    -- hanya dokumentasi APPROVED yang tampil di laporan publik
    'media', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'type', dc.type, 'stage', dc.stage, 'caption', dc.caption, 'path', dc.storage_path)), '[]'::jsonb)
      from public.documentations dc
      where dc.order_id = v_order.id and dc.status = 'approved' and dc.storage_path is not null
    ),
    'report', (
      select jsonb_build_object(
        'pdf_path', r.pdf_path, 'version', r.version, 'generated_at', r.generated_at,
        'narrative', r.narrative)
      from public.reports r where r.order_id = v_order.id order by r.version desc limit 1
    )
  ) into v_result;

  return v_result;
end;
$$;

grant execute on function public.get_public_report(text) to anon, authenticated;

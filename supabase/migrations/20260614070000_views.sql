-- ============================================================
-- ImpactAqiqah — 07 KPI Views
-- Acuan: docs/05_DATABASE_DESIGN.md §7, docs/09_DASHBOARD_SPEC
-- security_invoker = true  -> view menghormati RLS tabel sumber per user (PG15+)
-- ============================================================

-- ------------------------------------------------------------
-- v_order_progress — agregat progres per order
-- ------------------------------------------------------------
create view public.v_order_progress
with (security_invoker = true) as
with animal_stats as (
  select
    a.order_id,
    count(*)                                                          as total_animals,
    count(*) filter (where a.status in ('slaughtered','distributed')) as slaughtered_animals,
    count(*) filter (where a.status = 'distributed')                 as distributed_animals
  from public.animals a
  group by a.order_id
),
doc_stats as (
  select
    d.order_id,
    count(*) filter (where d.status = 'approved')                    as approved_docs,
    count(*) filter (where d.stage = 'slaughter'   and d.status = 'approved') as approved_slaughter_docs,
    count(*) filter (where d.stage = 'distribution' and d.status = 'approved') as approved_distribution_docs
  from public.documentations d
  group by d.order_id
),
report_stats as (
  select r.order_id, count(*) as report_count
  from public.reports r
  group by r.order_id
),
dist_stats as (
  select ds.order_id, count(*) as distribution_count
  from public.distributions ds
  group by ds.order_id
)
select
  o.id            as order_id,
  o.order_number,
  o.branch_id,
  o.status,
  o.payment_status,
  coalesce(a.total_animals, 0)        as total_animals,
  coalesce(a.slaughtered_animals, 0)  as slaughtered_animals,
  coalesce(a.distributed_animals, 0)  as distributed_animals,
  coalesce(dc.approved_docs, 0)       as approved_docs,
  coalesce(rs.report_count, 0)        as report_count,
  -- progress potong (%)
  case when coalesce(a.total_animals,0) = 0 then 0
       else round(100.0 * a.slaughtered_animals / a.total_animals) end as progress_potong,
  -- progress distribusi (%)
  case when coalesce(a.total_animals,0) = 0 then 0
       else round(100.0 * a.distributed_animals / a.total_animals) end as progress_distribusi,
  -- dokumentasi lengkap (per ORDER: ada bukti potong + distribusi approved) -> docs/10
  (coalesce(dc.approved_slaughter_docs,0) > 0
   and coalesce(dc.approved_distribution_docs,0) > 0)                  as documentation_complete,
  -- laporan terbit
  (coalesce(rs.report_count,0) > 0)                                    as has_report
from public.orders o
left join animal_stats a  on a.order_id  = o.id
left join doc_stats   dc  on dc.order_id = o.id
left join report_stats rs on rs.order_id = o.id
left join dist_stats  ds  on ds.order_id = o.id
where o.deleted_at is null;

comment on view public.v_order_progress is 'Progres per order: potong/distribusi/dokumentasi/laporan (docs/09)';

-- ------------------------------------------------------------
-- v_branch_kpi — KPI agregat per cabang
-- ------------------------------------------------------------
create view public.v_branch_kpi
with (security_invoker = true) as
select
  b.id   as branch_id,
  b.name as branch_name,
  b.code as branch_code,
  count(p.order_id)                                                   as total_order,
  count(p.order_id) filter (where p.status not in ('completed','cancelled')) as open_order,
  coalesce(round(avg(p.progress_potong)), 0)                          as avg_progress_potong,
  coalesce(round(avg(p.progress_distribusi)), 0)                      as avg_progress_distribusi,
  -- % order dengan dokumentasi lengkap
  case when count(p.order_id) = 0 then 0
       else round(100.0 * count(*) filter (where p.documentation_complete) / count(p.order_id)) end as pct_documentation,
  -- % order dengan laporan
  case when count(p.order_id) = 0 then 0
       else round(100.0 * count(*) filter (where p.has_report) / count(p.order_id)) end as pct_report
from public.branches b
left join public.v_order_progress p on p.branch_id = b.id
where b.deleted_at is null
group by b.id, b.name, b.code;

comment on view public.v_branch_kpi is 'KPI per cabang untuk Executive/Cabang Dashboard (docs/09)';

-- ------------------------------------------------------------
-- v_open_orders — INTI LITMUS TEST
-- "order belum selesai + lokasi + PIC + kendala" (< 10 detik)
-- ------------------------------------------------------------
create view public.v_open_orders
with (security_invoker = true) as
select
  o.id            as order_id,
  o.order_number,
  o.status,
  o.payment_status,
  b.name          as branch_name,
  l.name          as location_name,
  pic.full_name   as pic_name,
  o.created_at,
  round(extract(epoch from (now() - o.created_at)) / 3600.0)          as age_hours,
  coalesce(i.open_issues, 0)                                          as open_issues,
  i.max_severity
from public.orders o
join public.branches b              on b.id = o.branch_id
left join public.schedules s        on s.order_id = o.id
left join public.locations l        on l.id = s.location_id
left join public.profiles pic       on pic.id = s.pic_user_id
left join (
  select
    order_id,
    count(*) filter (where status in ('open','in_progress')) as open_issues,
    max(severity::text)                                       as max_severity
  from public.issues
  group by order_id
) i on i.order_id = o.id
where o.deleted_at is null
  and o.status not in ('completed','cancelled')
order by open_issues desc, age_hours desc;

comment on view public.v_open_orders is 'Litmus test: order belum selesai + lokasi + PIC + kendala (docs/08 §8, docs/09)';

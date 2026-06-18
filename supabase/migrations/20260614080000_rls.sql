-- ============================================================
-- ImpactAqiqah — 08 Row Level Security (RLS)
-- Acuan: docs/05_DATABASE_DESIGN.md §8, docs/07_USER_ROLES, docs/20_SECURITY_CHECKLIST
-- Catatan: role `service_role` (server/n8n) melewati RLS secara default.
--          Akses publik laporan (peserta) via RPC SECURITY DEFINER dibangun di Tahap 6.
-- ============================================================

-- ------------------------------------------------------------
-- Helper akses order (SECURITY DEFINER agar tidak rekursif)
-- ------------------------------------------------------------
create or replace function public.can_read_order(p_order_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.orders o
    where o.id = p_order_id
      and (
        public.is_central()
        or o.branch_id = public.auth_branch()
        or public.is_pic_of(o.id)
      )
  );
$$;

-- Tulis pada child order: admin cabang (cabang sama) / manager / PIC
create or replace function public.can_write_order(p_order_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.orders o
    where o.id = p_order_id
      and (
        public.auth_role() = 'manager_program'
        or (public.auth_role() = 'admin_cabang' and o.branch_id = public.auth_branch())
        or public.is_pic_of(o.id)
      )
  );
$$;

-- ------------------------------------------------------------
-- Aktifkan RLS
-- ------------------------------------------------------------
alter table public.branches        enable row level security;
alter table public.profiles        enable row level security;
alter table public.locations       enable row level security;
alter table public.services        enable row level security;
alter table public.participants    enable row level security;
alter table public.app_settings    enable row level security;
alter table public.orders          enable row level security;
alter table public.order_items     enable row level security;
alter table public.animals         enable row level security;
alter table public.payments        enable row level security;
alter table public.schedules       enable row level security;
alter table public.slaughter_records enable row level security;
alter table public.distributions   enable row level security;
alter table public.documentations  enable row level security;
alter table public.reports         enable row level security;
alter table public.notifications   enable row level security;
alter table public.issues          enable row level security;
alter table public.audit_logs      enable row level security;

-- ============================================================
-- LOOKUP / MASTER
-- ============================================================

-- branches: semua user internal boleh baca; tulis manager
create policy branches_select on public.branches
  for select to authenticated using (true);
create policy branches_write on public.branches
  for all to authenticated
  using (public.auth_role() = 'manager_program')
  with check (public.auth_role() = 'manager_program');

-- locations: baca semua; tulis manager atau admin cabang (cabang sama)
create policy locations_select on public.locations
  for select to authenticated using (true);
create policy locations_write on public.locations
  for all to authenticated
  using (public.auth_role() = 'manager_program'
         or (public.auth_role() = 'admin_cabang' and branch_id = public.auth_branch()))
  with check (public.auth_role() = 'manager_program'
         or (public.auth_role() = 'admin_cabang' and branch_id = public.auth_branch()));

-- services: baca semua; tulis manager
create policy services_select on public.services
  for select to authenticated using (true);
create policy services_write on public.services
  for all to authenticated
  using (public.auth_role() = 'manager_program')
  with check (public.auth_role() = 'manager_program');

-- app_settings: baca semua; tulis manager
create policy settings_select on public.app_settings
  for select to authenticated using (true);
create policy settings_write on public.app_settings
  for all to authenticated
  using (public.auth_role() = 'manager_program')
  with check (public.auth_role() = 'manager_program');

-- ============================================================
-- PROFILES
-- ============================================================
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or public.is_central()
    or (public.auth_role() = 'admin_cabang' and branch_id = public.auth_branch())
  );
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.auth_role() = 'manager_program')
  with check (id = auth.uid() or public.auth_role() = 'manager_program');

-- ============================================================
-- PARTICIPANTS (scope via order terkait)
-- ============================================================
create policy participants_select on public.participants
  for select to authenticated
  using (
    public.is_central()
    or exists (
      select 1 from public.orders o
      where o.participant_id = participants.id
        and (o.branch_id = public.auth_branch() or public.is_pic_of(o.id))
    )
  );
create policy participants_write on public.participants
  for all to authenticated
  using (public.auth_role() in ('admin_cabang','manager_program'))
  with check (public.auth_role() in ('admin_cabang','manager_program'));

-- ============================================================
-- ORDERS
-- ============================================================
create policy orders_select on public.orders
  for select to authenticated
  using (
    public.is_central()
    or branch_id = public.auth_branch()
    or public.is_pic_of(id)
  );
create policy orders_insert on public.orders
  for insert to authenticated
  with check (public.auth_role() = 'admin_cabang' and branch_id = public.auth_branch());
create policy orders_update on public.orders
  for update to authenticated
  using (
    public.auth_role() = 'manager_program'
    or (public.auth_role() = 'admin_cabang' and branch_id = public.auth_branch())
    or public.is_pic_of(id)
  )
  with check (
    public.auth_role() = 'manager_program'
    or (public.auth_role() = 'admin_cabang' and branch_id = public.auth_branch())
    or public.is_pic_of(id)
  );

-- ============================================================
-- CHILD TABLES (scope via order)
-- ============================================================
-- order_items
create policy order_items_select on public.order_items
  for select to authenticated using (public.can_read_order(order_id));
create policy order_items_write on public.order_items
  for all to authenticated
  using (public.can_write_order(order_id))
  with check (public.can_write_order(order_id));

-- animals
create policy animals_select on public.animals
  for select to authenticated using (public.can_read_order(order_id));
create policy animals_write on public.animals
  for all to authenticated
  using (public.can_write_order(order_id))
  with check (public.can_write_order(order_id));

-- payments
create policy payments_select on public.payments
  for select to authenticated using (public.can_read_order(order_id));
create policy payments_write on public.payments
  for all to authenticated
  using (public.auth_role() in ('admin_cabang','manager_program') and public.can_read_order(order_id))
  with check (public.auth_role() in ('admin_cabang','manager_program') and public.can_read_order(order_id));

-- schedules
create policy schedules_select on public.schedules
  for select to authenticated using (public.can_read_order(order_id));
create policy schedules_write on public.schedules
  for all to authenticated
  using (public.auth_role() in ('admin_cabang','manager_program') and public.can_read_order(order_id))
  with check (public.auth_role() in ('admin_cabang','manager_program') and public.can_read_order(order_id));

-- slaughter_records (scope via animal -> order)
create policy slaughter_select on public.slaughter_records
  for select to authenticated
  using (exists (select 1 from public.animals a
                 where a.id = slaughter_records.animal_id and public.can_read_order(a.order_id)));
create policy slaughter_write on public.slaughter_records
  for all to authenticated
  using (exists (select 1 from public.animals a
                 where a.id = slaughter_records.animal_id and public.can_write_order(a.order_id)))
  with check (exists (select 1 from public.animals a
                 where a.id = slaughter_records.animal_id and public.can_write_order(a.order_id)));

-- distributions
create policy distributions_select on public.distributions
  for select to authenticated using (public.can_read_order(order_id));
create policy distributions_write on public.distributions
  for all to authenticated
  using (public.can_write_order(order_id))
  with check (public.can_write_order(order_id));

-- ============================================================
-- DOCUMENTATIONS (validasi 2 tingkat; Admin Pusat validasi akhir)
-- ============================================================
create policy documentations_select on public.documentations
  for select to authenticated using (public.can_read_order(order_id));
-- Insert: PIC/petugas atau admin cabang/manager pada order yang berhak
create policy documentations_insert on public.documentations
  for insert to authenticated
  with check (public.can_write_order(order_id));
-- Update (validasi): Supervisor (admin_cabang/manager) atau Admin Pusat (validasi akhir)
create policy documentations_update on public.documentations
  for update to authenticated
  using (
    public.auth_role() in ('admin_pusat','manager_program')
    or (public.auth_role() = 'admin_cabang' and public.can_read_order(order_id))
  )
  with check (
    public.auth_role() in ('admin_pusat','manager_program')
    or (public.auth_role() = 'admin_cabang' and public.can_read_order(order_id))
  );

-- ============================================================
-- REPORTS (baca internal; generate oleh manager/admin_pusat/service_role)
-- ============================================================
create policy reports_select on public.reports
  for select to authenticated using (public.can_read_order(order_id));
create policy reports_write on public.reports
  for all to authenticated
  using (public.auth_role() in ('manager_program','admin_pusat')
         or (public.auth_role() = 'admin_cabang' and public.can_read_order(order_id)))
  with check (public.auth_role() in ('manager_program','admin_pusat')
         or (public.auth_role() = 'admin_cabang' and public.can_read_order(order_id)));

-- ============================================================
-- NOTIFICATIONS (baca scope; tulis lewat service_role/n8n)
-- ============================================================
create policy notifications_select on public.notifications
  for select to authenticated
  using (public.is_central() or (order_id is not null and public.can_read_order(order_id)));

-- ============================================================
-- ISSUES
-- ============================================================
create policy issues_select on public.issues
  for select to authenticated using (public.can_read_order(order_id));
create policy issues_write on public.issues
  for all to authenticated
  using (public.can_write_order(order_id))
  with check (public.can_write_order(order_id));

-- ============================================================
-- AUDIT_LOGS (baca terbatas; tulis hanya via trigger SECURITY DEFINER / service_role)
-- ============================================================
create policy audit_select on public.audit_logs
  for select to authenticated
  using (public.is_central() or public.auth_role() = 'admin_cabang');

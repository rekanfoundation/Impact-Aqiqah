-- ============================================================
-- ImpactAqiqah — 06 Indexes
-- Acuan: docs/05_DATABASE_DESIGN.md §7
-- (unique constraints sudah otomatis terindeks: order_number, public_token, dll)
-- ============================================================

-- orders: filter dashboard & lookup
create index idx_orders_branch_status on public.orders (branch_id, status);
create index idx_orders_payment_status on public.orders (payment_status);
create index idx_orders_created_at on public.orders (created_at);
create index idx_orders_participant on public.orders (participant_id);

-- order_items
create index idx_order_items_order on public.order_items (order_id);
create index idx_order_items_service on public.order_items (service_id);

-- schedules: jadwal per petugas/lokasi/tanggal
create index idx_schedules_date on public.schedules (scheduled_date);
create index idx_schedules_pic on public.schedules (pic_user_id);
create index idx_schedules_location on public.schedules (location_id);

-- animals: progres per order
create index idx_animals_order_status on public.animals (order_id, status);

-- payments
create index idx_payments_order_status on public.payments (order_id, status);

-- slaughter_records
create index idx_slaughter_animal on public.slaughter_records (animal_id);

-- distributions: progres distribusi
create index idx_distributions_order on public.distributions (order_id);
create index idx_distributions_distributed_at on public.distributions (distributed_at);

-- documentations: antrian validasi
create index idx_docs_order_status on public.documentations (order_id, status);
create index idx_docs_status on public.documentations (status);
create index idx_docs_uploaded_by on public.documentations (uploaded_by);

-- reports
create index idx_reports_order on public.reports (order_id);

-- notifications: outbox worker
create index idx_notifications_status on public.notifications (status);
create index idx_notifications_channel on public.notifications (channel);

-- issues
create index idx_issues_order_status on public.issues (order_id, status);

-- audit_logs: penelusuran
create index idx_audit_entity on public.audit_logs (entity, entity_id);
create index idx_audit_created_at on public.audit_logs (created_at);

-- locations
create index idx_locations_branch on public.locations (branch_id);

-- profiles
create index idx_profiles_branch on public.profiles (branch_id);
create index idx_profiles_role on public.profiles (role);

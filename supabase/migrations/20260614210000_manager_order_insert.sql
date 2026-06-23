-- ============================================================
-- ImpactAqiqah — 21 Super Admin: manager_program boleh INSERT order
-- Sebelumnya orders_insert hanya untuk admin_cabang (intake cabang). Untuk
-- "super admin" (manager_program) yang harus bisa membuat order internal untuk
-- cabang mana pun, perluas policy. Anak order (order_items/animals) sudah
-- diizinkan via can_write_order yang mencakup manager_program.
-- Acuan: docs/07 (role), docs/20 (RLS).
-- ============================================================

drop policy if exists orders_insert on public.orders;
create policy orders_insert on public.orders
  for insert to authenticated
  with check (
    (public.auth_role() = 'admin_cabang' and branch_id = public.auth_branch())
    or public.auth_role() = 'manager_program'
  );

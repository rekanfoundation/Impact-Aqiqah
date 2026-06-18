-- ============================================================
-- ImpactAqiqah — Seed (master data + contoh non-prod)
-- Acuan: docs/05_DATABASE_DESIGN, docs/22_DEPLOYMENT_PLAN §6
-- Dijalankan otomatis oleh `supabase db reset` (sebagai superuser, bypass RLS).
-- CATATAN: profiles/users TIDAK di-seed di sini karena butuh auth.users
--          (dibuat saat signup; profil otomatis via trigger handle_new_user).
-- ============================================================

-- ------------------------------------------------------------
-- App settings (gate pembayaran & SLA)
-- ------------------------------------------------------------
insert into public.app_settings (key, value, description) values
  ('min_dp_ratio', '{"ratio": 0.5}', 'Minimal proporsi DP agar order bisa dijadwalkan (docs/06,08)'),
  ('sla_documentation_hours', '{"hours": 24}', 'SLA reminder dokumentasi (docs/18)'),
  ('sla_distribution_hours',  '{"hours": 24}', 'SLA reminder distribusi (docs/18)'),
  ('sla_report_hours',        '{"hours": 48}', 'SLA reminder laporan (docs/18)')
on conflict (key) do nothing;

-- ------------------------------------------------------------
-- Branches
-- ------------------------------------------------------------
insert into public.branches (id, name, code, address, phone) values
  ('11111111-1111-1111-1111-111111111111', 'Cabang Bandung', 'BDG', 'Jl. Soekarno Hatta, Bandung', '022-0000001'),
  ('22222222-2222-2222-2222-222222222222', 'Cabang Jakarta', 'JKT', 'Jl. Sudirman, Jakarta',       '021-0000002')
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- Locations
-- ------------------------------------------------------------
insert into public.locations (id, branch_id, name, address, lat, lng) values
  ('aaaaaaa1-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Masjid Al-Ikhlas', 'Cibiru, Bandung', -6.928900, 107.717800),
  ('aaaaaaa1-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Balai Warga Antapani', 'Antapani, Bandung', -6.917500, 107.657200),
  ('aaaaaaa2-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'Masjid Sunda Kelapa', 'Menteng, Jakarta', -6.198800, 106.831400)
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- Services tambahan (Qurban & Sedekah) — paket Aqiqah & Nasi Box berasal
-- dari migration 14 (katalog). Aqiqah lama dihapus, order contoh diarahkan
-- ke paket Favorit (b0000001-...-0002).
-- ------------------------------------------------------------
insert into public.services (id, type, name, description, price, meta) values
  ('5e111111-0000-0000-0000-000000000002', 'qurban',         'Qurban Kambing',  'Qurban 1 ekor kambing',    2500000, '{"min_dp_ratio": 1.0}'),
  ('5e111111-0000-0000-0000-000000000003', 'qurban',         'Qurban Sapi 1/7', 'Qurban patungan sapi 1/7', 3500000, '{"min_dp_ratio": 1.0}'),
  ('5e111111-0000-0000-0000-000000000004', 'sedekah_daging', 'Sedekah Daging',  'Paket sedekah daging',      150000, '{}')
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- Participants (contoh)
-- ------------------------------------------------------------
insert into public.participants (id, name, phone, email, address) values
  ('9a111111-0000-0000-0000-000000000001', 'Ahmad Fauzi',  '6281200000001', 'ahmad@example.id', 'Bandung'),
  ('9a111111-0000-0000-0000-000000000002', 'Siti Aminah',  '6281200000002', 'siti@example.id',  'Jakarta')
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- Orders contoh (order_number & public_token diisi otomatis)
-- created_by NULL (seed/system). Status bervariasi agar views berisi data.
-- ------------------------------------------------------------
insert into public.orders (id, participant_id, branch_id, status, payment_status, total_amount, notes) values
  ('0d111111-0000-0000-0000-000000000001', '9a111111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'new',           'unpaid',  2325000, 'Aqiqah atas nama anak pertama'),
  ('0d111111-0000-0000-0000-000000000002', '9a111111-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'documentation', 'paid',    4650000, 'Aqiqah 2 ekor'),
  ('0d111111-0000-0000-0000-000000000003', '9a111111-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'scheduled',     'partial', 2500000, 'Qurban kambing')
on conflict (id) do nothing;

-- order_items (Aqiqah -> Paket Favorit b...0002; Qurban -> 5e...0002)
insert into public.order_items (order_id, service_id, qty, unit_price, meta) values
  ('0d111111-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000002', 1, 2325000, '{"on_behalf_of": "Muhammad Ali"}'),
  ('0d111111-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000002', 2, 2325000, '{"on_behalf_of": "Fatimah & Hasan"}'),
  ('0d111111-0000-0000-0000-000000000003', '5e111111-0000-0000-0000-000000000002', 1, 2500000, '{}')
on conflict do nothing;

-- animals
insert into public.animals (id, order_id, tag_code, species, status, on_behalf_of) values
  ('a1111111-0000-0000-0000-000000000001', '0d111111-0000-0000-0000-000000000001', 'BDG-001', 'kambing', 'registered',  'Muhammad Ali'),
  ('a1111111-0000-0000-0000-000000000002', '0d111111-0000-0000-0000-000000000002', 'BDG-002', 'kambing', 'distributed', 'Fatimah'),
  ('a1111111-0000-0000-0000-000000000003', '0d111111-0000-0000-0000-000000000002', 'BDG-003', 'kambing', 'slaughtered', 'Hasan'),
  ('a1111111-0000-0000-0000-000000000004', '0d111111-0000-0000-0000-000000000003', 'JKT-001', 'kambing', 'prepared',    'Siti Aminah')
on conflict (id) do nothing;

-- schedule untuk order #3 (scheduled) — PIC NULL (akan diisi setelah ada user)
insert into public.schedules (order_id, location_id, pic_user_id, scheduled_date, status) values
  ('0d111111-0000-0000-0000-000000000003', 'aaaaaaa2-0000-0000-0000-000000000003', null, current_date + 3, 'planned')
on conflict (order_id) do nothing;

-- issue terbuka pada order #2 (muncul di v_open_orders / litmus test)
insert into public.issues (order_id, reported_by, severity, title, description, status) values
  ('0d111111-0000-0000-0000-000000000002', null, 'high', 'Dokumentasi distribusi belum lengkap', 'Foto penyerahan paket belum diunggah', 'open')
on conflict do nothing;

-- contoh dokumentasi (order #2): bukti potong approved, distribusi masih pending
insert into public.documentations (order_id, animal_id, type, stage, status, caption) values
  ('0d111111-0000-0000-0000-000000000002', 'a1111111-0000-0000-0000-000000000002', 'photo', 'slaughter',    'approved', 'Proses pemotongan BDG-002'),
  ('0d111111-0000-0000-0000-000000000002', 'a1111111-0000-0000-0000-000000000002', 'photo', 'distribution', 'pending',  'Penyerahan paket (menunggu validasi)')
on conflict do nothing;

-- ============================================================
-- Verifikasi cepat (jalankan manual):
--   select * from public.v_open_orders;     -- litmus test
--   select * from public.v_branch_kpi;      -- KPI cabang
--   select * from public.v_order_progress;  -- progres order
-- ============================================================

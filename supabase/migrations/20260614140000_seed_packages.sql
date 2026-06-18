-- ============================================================
-- ImpactAqiqah — 14 Katalog Paket (Kambing + Nasi Box)
-- Idempoten (on conflict do nothing) — edit via dashboard tidak tertimpa saat re-run.
-- UUID tetap agar konsisten lintas environment & dapat dirujuk seed.
-- ============================================================

-- ---------- Paket Kambing (type aqiqah) ----------
-- meta: { harga_kambing, biaya_masak, hasil:{sate_tusuk, olahan_porsi, semur_porsi, gulai_porsi}, cocok_untuk }
insert into public.services (id, type, name, description, price, meta, is_active) values
  (
    'b0000001-0000-0000-0000-000000000001', 'aqiqah', 'Paket Ekonomis — Kambing Betina Tipe B',
    'Aqiqah sederhana untuk keluarga kecil & budget terbatas.', 1840000,
    jsonb_build_object(
      'tier','ekonomis',
      'harga_kambing',1470000,
      'biaya_masak',370000,
      'hasil', jsonb_build_object('sate_tusuk',250,'olahan_porsi',60,'semur_porsi',30,'gulai_porsi',60),
      'cocok_untuk','Budget terbatas, aqiqah sederhana, keluarga kecil'
    ),
    true
  ),
  (
    'b0000001-0000-0000-0000-000000000002', 'aqiqah', 'Paket Favorit — Kambing Betina Super',
    'Paket paling seimbang antara harga dan hasil. Cocok 80–100 penerima.', 2325000,
    jsonb_build_object(
      'tier','favorit',
      'harga_kambing',1850000,
      'biaya_masak',475000,
      'hasil', jsonb_build_object('sate_tusuk',400,'olahan_porsi',90,'semur_porsi',45,'gulai_porsi',90),
      'cocok_untuk','80–100 penerima, paket paling seimbang harga & hasil'
    ),
    true
  ),
  (
    'b0000001-0000-0000-0000-000000000003', 'aqiqah', 'Paket Premium — Kambing Betina Istimewa',
    'Untuk acara besar & distribusi lebih luas dengan nilai premium.', 2975000,
    jsonb_build_object(
      'tier','premium',
      'harga_kambing',2450000,
      'biaya_masak',525000,
      'hasil', jsonb_build_object('sate_tusuk',600,'olahan_porsi',120,'semur_porsi',60,'gulai_porsi',120),
      'cocok_untuk','Acara besar, distribusi lebih luas, nilai premium'
    ),
    true
  )
on conflict (id) do nothing;

-- ---------- Paket Nasi Box (type nasi_box) ----------
-- meta: { items: [...] }
insert into public.services (id, type, name, description, price, meta, is_active) values
  (
    'c0000002-0000-0000-0000-000000000001', 'nasi_box', 'Paket A — Nasi Kuning Basic',
    'Entry level.', 17500,
    jsonb_build_object('kode','A','items', jsonb_build_array('Nasi kuning','Kerupuk udang','Buah')),
    true
  ),
  (
    'c0000002-0000-0000-0000-000000000002', 'nasi_box', 'Paket B — Nasi Kuning Plus',
    'Nasi kuning dengan lauk tambahan.', 22500,
    jsonb_build_object('kode','B','items', jsonb_build_array('Nasi kuning','Orek tempe','Kerupuk udang','Buah')),
    true
  ),
  (
    'c0000002-0000-0000-0000-000000000003', 'nasi_box', 'Paket C — Nasi Kebuli Ayam',
    'Nasi kebuli basmati dengan ayam.', 26500,
    jsonb_build_object('kode','C','items', jsonb_build_array(
      'Nasi kebuli basmati','Ayam goreng/bakar','Mix vegetable','Buah/puding','Kerupuk udang','Sambal geprek')),
    true
  ),
  (
    'c0000002-0000-0000-0000-000000000004', 'nasi_box', 'Paket D — Nasi Kebuli Kambing',
    'Nasi kebuli basmati dengan empal sapi/kambing.', 37000,
    jsonb_build_object('kode','D','items', jsonb_build_array(
      'Nasi kebuli basmati','Empal sapi/kambing','Mix vegetable','Buah/puding','Kerupuk udang','Sambal geprek')),
    true
  ),
  (
    'c0000002-0000-0000-0000-000000000005', 'nasi_box', 'Paket E — Nasi Box Premium',
    'Paket lengkap premium.', 58000,
    jsonb_build_object('kode','E','items', jsonb_build_array(
      'Nasi putih','Kentang/buncis ati','Sate 4 tusuk','Gulai/sop/tongseng','Ayam goreng/bakar',
      'Buah pisang/puding','Kerupuk udang/acar')),
    true
  )
on conflict (id) do nothing;

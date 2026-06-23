-- ============================================================
-- ImpactAqiqah — 26 Chatbot (AI Assistant publik + KB + logging)
-- Acuan: docs/26_CHAT_BOT. Floating widget utk semua pengunjung, jawab
-- berbasis Knowledge Base, handoff WhatsApp, dikelola Super Admin.
-- Pola RLS sama dgn 25_ai_analyses (is_central / auth_role / manager_program).
-- ============================================================

-- ---------- Knowledge Base ----------
create table if not exists public.chatbot_kb (
  id          uuid primary key default gen_random_uuid(),
  category    text not null default 'faq'
              check (category in ('product','business','sop','development','faq')),
  question    text,
  content     text not null,
  sort_order  int  not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.chatbot_kb is 'Knowledge Base chatbot (editable Super Admin). Dibaca server via service role.';
create index if not exists idx_chatbot_kb_active on public.chatbot_kb (is_active, category, sort_order);

alter table public.chatbot_kb enable row level security;
drop policy if exists chatbot_kb_select on public.chatbot_kb;
create policy chatbot_kb_select on public.chatbot_kb
  for select to authenticated using (public.auth_role() = 'manager_program');
drop policy if exists chatbot_kb_write on public.chatbot_kb;
create policy chatbot_kb_write on public.chatbot_kb
  for all to authenticated
  using (public.auth_role() = 'manager_program')
  with check (public.auth_role() = 'manager_program');

-- ---------- Chat Logs ----------
create table if not exists public.chat_logs (
  id          uuid primary key default gen_random_uuid(),
  session_id  text,
  question    text not null,
  answer      text,
  status      text not null default 'answered'
              check (status in ('answered','escalated','failed')),
  page        text,
  provider    text,
  created_at  timestamptz not null default now()
);
comment on table public.chat_logs is 'Riwayat percakapan chatbot. Insert via service role; baca role pusat.';
create index if not exists idx_chat_logs_created on public.chat_logs (created_at desc);

alter table public.chat_logs enable row level security;
-- Hanya role pusat yang boleh membaca riwayat. Insert dilakukan service role (bypass RLS).
drop policy if exists chat_logs_select on public.chat_logs;
create policy chat_logs_select on public.chat_logs
  for select to authenticated using (public.is_central());

-- ---------- Konfigurasi chatbot (app_settings) ----------
insert into public.app_settings (key, value, description)
values (
  'chatbot_config',
  jsonb_build_object(
    'enabled', true,
    'name', 'ImpactAqiqah AI Assistant',
    'welcome', 'Halo! Saya asisten ImpactAqiqah. Ada yang bisa saya bantu seputar aqiqah, paket, atau laporan?',
    'admin_wa', '',
    'system_prompt', 'Anda adalah ImpactAqiqah AI Assistant, asisten ramah untuk layanan Aqiqah/Qurban/Sedekah Daging dari Zakat Sukses (tagline: Tunaikan Ibadah, Tebarkan Manfaat). Jawab singkat, sopan, dan jelas dalam Bahasa Indonesia.',
    'quick_actions', jsonb_build_array(
      'Apa itu Aqiqah Berbagi?',
      'Bagaimana cara melihat laporan?',
      'Apa arti Progress Dokumentasi?',
      'Bagaimana alur Qurban?',
      'Hubungi Admin'
    )
  ),
  'Konfigurasi chatbot AI (docs/26): enable, nama, welcome, system prompt, nomor admin WA, quick actions.'
)
on conflict (key) do nothing;

-- ---------- Seed Knowledge Base awal (dari docs) ----------
insert into public.chatbot_kb (category, question, content, sort_order) values
  ('product', 'Apa itu Aqiqah Berbagi?',
   'Aqiqah Berbagi adalah layanan aqiqah ImpactAqiqah di mana hewan aqiqah disembelih secara syar''i, dimasak higienis, lalu didistribusikan sebagai berbagi manfaat kepada penerima yang membutuhkan. Anda menerima laporan & dokumentasi pelaksanaannya.', 1),
  ('product', 'Aqiqah anak laki-laki dan perempuan berapa ekor?',
   'Sesuai sunnah: anak laki-laki dianjurkan 2 ekor kambing, anak perempuan 1 ekor. Saat checkout, sistem otomatis merekomendasikan jumlah sesuai jenis kelamin anak.', 2),
  ('product', 'Apa beda Aqiqah Salur dan Aqiqah Kirim?',
   'Aqiqah Salur: olahan didistribusikan oleh tim kami kepada penerima manfaat. Aqiqah Kirim: olahan dikirim ke alamat yang Anda tentukan. Pilihan ini tersedia saat checkout.', 3),
  ('sop', 'Bagaimana cara melihat laporan?',
   'Setelah ibadah selesai, laporan & dokumentasi tersedia melalui tautan laporan yang kami kirim (via email/WhatsApp). Pelanggan terdaftar juga dapat melihatnya di menu Akun → Pesanan.', 4),
  ('sop', 'Apa arti Progress Dokumentasi?',
   'Progress Dokumentasi menunjukkan tahap pengumpulan bukti pelaksanaan (foto/dokumen) oleh petugas lapangan, yang lalu divalidasi tim pusat sebelum laporan final diterbitkan.', 5),
  ('business', 'Bagaimana alur Qurban?',
   'Alur Qurban: pesan paket → pembayaran → penjadwalan penyembelihan → pelaksanaan & dokumentasi → distribusi daging ke penerima manfaat → laporan pelaksanaan dikirim ke pemesan.', 6),
  ('business', 'Bagaimana cara memesan / checkout?',
   'Klik Order/Pesan di website, pilih paket, isi data (nama anak, jenis kelamin, jenis layanan Salur/Kirim, alamat & tanggal), lalu bayar. Anda tidak harus login dulu; akun & hak affiliate aktif otomatis setelah pembayaran berhasil.', 7),
  ('product', 'Apakah ada program affiliate?',
   'Ya. Setelah pembayaran berhasil Anda memperoleh kode affiliate. Komisi dihitung per ekor kambing dalam periode 365 hari: 2,5% untuk 10 ekor pertama dan 5% untuk di atas 10 ekor.', 8)
on conflict do nothing;

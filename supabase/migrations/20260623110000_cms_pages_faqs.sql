-- ============================================================
-- ImpactAqiqah — 27 CMS Pages + FAQ + Footer (docs/27)
-- Halaman footer dikelola Super Admin (judul/konten/SEO/slug/aktif/urutan),
-- slug dinamis (route app/(site)/[slug]), terindeks (SEO/JSON-LD/sitemap).
-- Pola RLS = landing_media: select authenticated, write manager_program,
-- RPC SECURITY DEFINER granted anon.
-- ============================================================

-- ---------- CMS Pages ----------
create table if not exists public.cms_pages (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text not null unique,
  title                text not null,
  page_type            text not null default 'content'
                       check (page_type in ('content','packages','gallery','faq')),
  content              text,                         -- markdown (null utk data-page murni)
  footer_group         text check (footer_group in ('layanan','bantuan')),
  nav_label            text,                         -- label di footer (default = title)
  sort_order           int not null default 0,
  is_active            boolean not null default true,-- publish/draft
  seo_title            text,
  seo_description      text,
  seo_keywords         text,
  og_image_url         text,
  og_image_path        text,
  featured_image_url   text,
  featured_image_path  text,
  video_url            text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
comment on table public.cms_pages is 'Halaman CMS footer (docs/27): konten markdown + SEO, slug dinamis.';
create index if not exists idx_cms_pages_active on public.cms_pages (is_active, footer_group, sort_order);

alter table public.cms_pages enable row level security;
drop policy if exists cms_pages_select on public.cms_pages;
create policy cms_pages_select on public.cms_pages
  for select to authenticated using (true);
drop policy if exists cms_pages_write on public.cms_pages;
create policy cms_pages_write on public.cms_pages
  for all to authenticated
  using (public.auth_role() = 'manager_program')
  with check (public.auth_role() = 'manager_program');

-- ---------- FAQ ----------
create table if not exists public.faqs (
  id          uuid primary key default gen_random_uuid(),
  category    text not null default 'Umum',
  question    text not null,
  answer      text not null,
  sort_order  int not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.faqs is 'FAQ publik (docs/27): dipakai /faq & landing.';
create index if not exists idx_faqs_active on public.faqs (is_active, category, sort_order);

alter table public.faqs enable row level security;
drop policy if exists faqs_select on public.faqs;
create policy faqs_select on public.faqs
  for select to authenticated using (true);
drop policy if exists faqs_write on public.faqs;
create policy faqs_write on public.faqs
  for all to authenticated
  using (public.auth_role() = 'manager_program')
  with check (public.auth_role() = 'manager_program');

-- ---------- RPC publik (anon) ----------
create or replace function public.get_cms_pages()
returns setof public.cms_pages
language sql stable security definer set search_path = public
as $$
  select * from public.cms_pages
  where is_active
  order by footer_group nulls last, sort_order, title;
$$;
grant execute on function public.get_cms_pages() to anon, authenticated;

create or replace function public.get_cms_page(p_slug text)
returns setof public.cms_pages
language sql stable security definer set search_path = public
as $$
  select * from public.cms_pages where slug = p_slug and is_active limit 1;
$$;
grant execute on function public.get_cms_page(text) to anon, authenticated;

create or replace function public.get_faqs()
returns setof public.faqs
language sql stable security definer set search_path = public
as $$
  select * from public.faqs where is_active order by category, sort_order, created_at;
$$;
grant execute on function public.get_faqs() to anon, authenticated;

-- ---------- Seed halaman default ----------
insert into public.cms_pages (slug, title, page_type, footer_group, nav_label, sort_order, content, seo_title, seo_description) values
  ('proses', 'Proses Layanan', 'content', 'layanan', 'Proses', 1,
   E'## Alur Layanan ImpactAqiqah\n\nKami menjaga setiap tahap agar amanah dan transparan.\n\n### Alur Aqiqah\n- Pilih paket & lengkapi data pemesanan\n- Pembayaran melalui sistem (checkout)\n- Penjadwalan & penyembelihan syar''i\n- Pengolahan higienis\n- Distribusi / pengiriman\n- Laporan & dokumentasi\n\n### Alur Qurban\n- Pesan paket qurban → pembayaran → penjadwalan → pelaksanaan & dokumentasi → distribusi daging → laporan.\n\n### Tahapan\n- **Pemesanan**: lewat website, tanpa wajib login.\n- **Pembayaran**: online via sistem pembayaran resmi (otomatis & aman).\n- **Produksi**: penyembelihan & pengolahan oleh tim ahli.\n- **Pengiriman**: Aqiqah Salur (distribusi tim) atau Aqiqah Kirim (ke alamat Anda).\n- **Pelaporan**: laporan pelaksanaan + dokumentasi dikirim ke pemesan.',
   'Proses & Alur Layanan Aqiqah — ImpactAqiqah',
   'Alur lengkap layanan aqiqah & qurban ImpactAqiqah: pemesanan, pembayaran, produksi, pengiriman, hingga pelaporan.'),
  ('paket', 'Paket & Harga', 'packages', 'layanan', 'Paket', 2,
   E'## Paket Aqiqah, Qurban & Sedekah Daging\n\nPilih paket sesuai kebutuhan. Harga sudah termasuk fasilitas & benefit ImpactAqiqah. Pemesanan dan pembayaran dilakukan melalui website (checkout).',
   'Paket & Harga Aqiqah — ImpactAqiqah',
   'Daftar paket dan harga layanan aqiqah, qurban, dan sedekah daging ImpactAqiqah beserta fasilitas dan benefitnya.'),
  ('galeri', 'Galeri Kegiatan', 'gallery', 'layanan', 'Galeri', 3,
   E'## Galeri Kegiatan\n\nDokumentasi kegiatan pemotongan, pengolahan, dan distribusi ImpactAqiqah.',
   'Galeri Dokumentasi — ImpactAqiqah',
   'Foto dan video dokumentasi kegiatan pemotongan, pengolahan, dan distribusi aqiqah ImpactAqiqah.'),
  ('faq', 'FAQ', 'faq', 'bantuan', 'FAQ', 1,
   E'## Pertanyaan yang Sering Ditanyakan\n\nTemukan jawaban cepat seputar layanan ImpactAqiqah. Tidak menemukan jawaban? Gunakan asisten chat atau hubungi kami.',
   'FAQ — Pertanyaan Umum ImpactAqiqah',
   'Jawaban atas pertanyaan umum seputar layanan aqiqah, qurban, pemesanan, pembayaran, dan pengiriman ImpactAqiqah.'),
  ('syarat-layanan', 'Syarat Layanan', 'content', 'bantuan', 'Syarat Layanan', 2,
   E'## Syarat & Ketentuan Layanan\n\nDengan menggunakan layanan ImpactAqiqah, Anda menyetujui ketentuan berikut.\n\n### Ketentuan Penggunaan\n- Layanan digunakan untuk tujuan ibadah aqiqah/qurban/sedekah daging yang sah.\n- Data yang Anda berikan harus benar dan akurat.\n\n### Kebijakan Order\n- Pemesanan dianggap sah setelah pembayaran terkonfirmasi oleh sistem.\n- Perubahan jadwal mengikuti ketersediaan dan ketentuan H-3.\n\n### Kebijakan Pembayaran\n- Pembayaran HANYA melalui sistem pembayaran resmi di website (checkout). Kami tidak menerima pembayaran melalui WhatsApp atau transfer manual.\n\n### Kebijakan Vendor\n- Vendor/mitra wajib memenuhi standar mutu, kebersihan, dan kesyariahan ImpactAqiqah.',
   'Syarat Layanan — ImpactAqiqah',
   'Syarat dan ketentuan penggunaan layanan ImpactAqiqah: ketentuan penggunaan, kebijakan order, pembayaran, dan vendor.'),
  ('kebijakan-privasi', 'Kebijakan Privasi', 'content', 'bantuan', 'Kebijakan Privasi', 3,
   E'## Kebijakan Privasi\n\nKami menghormati privasi Anda dan berkomitmen melindungi data pribadi.\n\n### Data yang Dikumpulkan\n- Nama, kontak, alamat pengiriman, dan detail pesanan untuk pelaksanaan layanan.\n\n### Penyimpanan Data\n- Data disimpan secara aman dan hanya digunakan untuk keperluan layanan & pelaporan.\n\n### Cookies\n- Kami menggunakan cookies untuk fungsi situs (mis. atribusi affiliate) dan peningkatan layanan.\n\n### Hak Pengguna\n- Anda berhak meminta akses, perbaikan, atau penghapusan data pribadi sesuai ketentuan yang berlaku.',
   'Kebijakan Privasi — ImpactAqiqah',
   'Kebijakan privasi ImpactAqiqah: data yang dikumpulkan, penyimpanan, cookies, dan hak pengguna.')
on conflict (slug) do nothing;

-- ---------- Seed FAQ awal ----------
insert into public.faqs (category, question, answer, sort_order) values
  ('Aqiqah', 'Apakah kambingnya sehat dan layak?', 'Ya. Seluruh kambing diperiksa kesehatannya, cukup umur, dan memenuhi syarat sah aqiqah sesuai syariat.', 1),
  ('Aqiqah', 'Bagaimana proses penyembelihannya?', 'Penyembelihan dilakukan oleh tim ahli yang memahami syariat Islam dan diawasi untuk memastikan keabsahannya.', 2),
  ('Aqiqah', 'Apakah ada dokumentasi prosesnya?', 'Ya, Anda menerima laporan dokumentasi (foto/video) dari proses penyembelihan hingga distribusi via link laporan.', 3),
  ('Pemesanan', 'Berapa lama waktu pemesanan?', 'Disarankan memesan minimal H-3 agar penjadwalan, penyembelihan, dan pengolahan berjalan optimal.', 1),
  ('Pemesanan', 'Apakah harus login untuk memesan?', 'Tidak. Anda bisa checkout sebagai tamu; akun & hak affiliate aktif otomatis setelah pembayaran berhasil.', 2),
  ('Pembayaran', 'Bagaimana cara pembayaran?', 'Pembayaran dilakukan online melalui sistem pembayaran resmi di website saat checkout. Kami tidak menerima pembayaran via WhatsApp/transfer manual.', 1),
  ('Pengiriman', 'Apa beda Aqiqah Salur dan Aqiqah Kirim?', 'Aqiqah Salur: olahan didistribusikan tim kami ke penerima manfaat. Aqiqah Kirim: olahan dikirim ke alamat yang Anda tentukan.', 1),
  ('Qurban', 'Bagaimana alur Qurban?', 'Pesan paket qurban, lakukan pembayaran, penjadwalan penyembelihan, pelaksanaan & dokumentasi, distribusi daging, lalu laporan dikirim ke pemesan.', 1)
on conflict do nothing;

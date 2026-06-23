-- ============================================================
-- ImpactAqiqah — 23 Landing Media CMS
-- Media landing dikelola Super Admin (manager_program). Frontend baca via RPC
-- get_landing_media (anon). Tanpa hardcode URL di frontend. Acuan: docs/14, docs/17.
-- ============================================================

create table if not exists public.landing_media (
  id           uuid primary key default gen_random_uuid(),
  section      text not null check (section in ('hero','gallery','kambing','olahan','nasi_box','sertifikat','partner')),
  url          text not null,
  storage_path text,                                  -- diisi bila di-upload ke bucket public-assets
  alt          text,
  caption      text,
  link_url     text,                                  -- website partner
  sort_order   int not null default 0,
  is_visible   boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (section, url)
);
comment on table public.landing_media is 'Aset gambar landing (hero/gallery/konten/partner) dikelola Super Admin';

create index if not exists idx_landing_media_section on public.landing_media (section, sort_order);

-- RLS: baca semua user internal (admin CMS); tulis hanya manager_program. Publik baca via RPC.
alter table public.landing_media enable row level security;

drop policy if exists landing_media_select on public.landing_media;
create policy landing_media_select on public.landing_media
  for select to authenticated using (true);

drop policy if exists landing_media_write on public.landing_media;
create policy landing_media_write on public.landing_media
  for all to authenticated
  using (public.auth_role() = 'manager_program')
  with check (public.auth_role() = 'manager_program');

-- RPC publik (anon): hanya yang is_visible, terurut.
create or replace function public.get_landing_media()
returns setof public.landing_media
language sql stable security definer set search_path = public
as $$
  select * from public.landing_media where is_visible order by section, sort_order;
$$;
grant execute on function public.get_landing_media() to anon, authenticated;

-- ------------------------------------------------------------
-- Seed awal (URL eksternal yang diberikan). Idempoten via unique(section,url).
-- ------------------------------------------------------------
insert into public.landing_media (section, url, alt, sort_order, link_url) values
  ('hero',       'https://zakatsukses.org/wp-content/uploads/2023/06/WhatsApp_Image_2023-06-12_at_12.54.29_PM_2-1024x683.jpeg', 'Aqiqah ImpactAqiqah', 0, null),

  ('gallery',    'https://zakatsukses.org/wp-content/uploads/2025/06/WhatsApp-Image-2025-06-17-at-09.41.08-2-1024x683.jpeg', 'Dokumentasi aqiqah 1', 1, null),
  ('gallery',    'https://zakatsukses.org/wp-content/uploads/2025/06/WhatsApp-Image-2025-06-17-at-11.59.48-2048x1366.jpeg', 'Dokumentasi aqiqah 2', 2, null),
  ('gallery',    'https://zakatsukses.org/wp-content/uploads/2025/06/WhatsApp-Image-2025-06-17-at-11.59.49-2048x1366.jpeg', 'Dokumentasi aqiqah 3', 3, null),
  ('gallery',    'https://zakatsukses.org/wp-content/uploads/2025/06/WhatsApp-Image-2025-06-17-at-09.41.08-2048x1366.jpeg', 'Dokumentasi aqiqah 4', 4, null),
  ('gallery',    'https://zakatsukses.org/wp-content/uploads/2025/06/WhatsApp-Image-2025-06-17-at-09.41.08-1-2048x1366.jpeg', 'Dokumentasi aqiqah 5', 5, null),
  ('gallery',    'https://zakatsukses.org/wp-content/uploads/2024/07/IMG_7388-1024x768.jpg', 'Dokumentasi aqiqah 6', 6, null),

  ('kambing',    'https://zakatsukses.org/wp-content/uploads/2025/06/WhatsApp-Image-2025-06-11-at-10.32.02-2-2048x1366.jpeg', 'Kambing aqiqah sehat & syar''i', 0, null),
  ('olahan',     'https://waladaqiqah.com/wp-content/uploads/2024/09/Olahan-Kambing-Untuk-Aqiqah.webp', 'Olahan kambing untuk aqiqah', 0, null),
  ('nasi_box',   'https://res.cloudinary.com/dyjxgprna/image/upload/q_auto/f_auto/v1782127273/Olahan_Aqiqah_nasi_box_awui8a.png', 'Paket nasi box aqiqah', 0, null),
  ('sertifikat', 'https://res.cloudinary.com/dyjxgprna/image/upload/q_auto/f_auto/v1782126850/SERTIFIKAT_AQIQAH_puntvm.png', 'Sertifikat aqiqah', 0, null),

  ('partner',    'https://zakatsukses.org/wp-content/uploads/2024/04/Logo-ZS-High-Res-768x620.png', 'Zakat Sukses', 1, 'https://zakatsukses.org'),
  ('partner',    'https://res.cloudinary.com/dyjxgprna/image/upload/q_auto/f_auto/v1782127349/logo_link_aja_fq4lfi.webp', 'LinkAja', 2, 'https://www.linkaja.id')
on conflict (section, url) do nothing;

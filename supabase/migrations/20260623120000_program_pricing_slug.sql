-- ============================================================
-- ImpactAqiqah — 28 Program: harga vendor/margin/jual + slug SEO + urutan (docs/28)
-- - Tambah kolom slug (unik), vendor_price, margin, sort_order.
-- - Backfill slug dari nama; update data harga sesuai docs/28.
-- - get_public_packages sertakan slug (TANPA vendor_price/margin — internal).
-- ============================================================

alter table public.services
  add column if not exists slug         text,
  add column if not exists vendor_price numeric(14,2) not null default 0,
  add column if not exists margin       numeric(14,2) not null default 0,
  add column if not exists sort_order   int not null default 0;

-- Backfill slug dari nama (slugify) bila kosong: lowercase, non-alnum → '-', rapikan.
update public.services
set slug = trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'))
where slug is null or slug = '';

-- Backfill urutan per type berdasarkan harga (stabil).
with ranked as (
  select id, row_number() over (partition by type order by price, created_at) as rn
  from public.services where deleted_at is null
)
update public.services s set sort_order = r.rn
from ranked r where r.id = s.id and s.sort_order = 0;

-- Slug unik (abaikan baris terhapus).
create unique index if not exists uq_services_slug
  on public.services (slug) where deleted_at is null;

-- ---------- Update data harga & slug (docs/28) ----------
-- Aqiqah (margin = harga_jual - harga_vendor).
update public.services set vendor_price = 1840000, price = 2300000, margin = 460000, slug = 'aqiqah-ekonomi', sort_order = 1
  where id = 'b0000001-0000-0000-0000-000000000001';
update public.services set vendor_price = 2325000, price = 2800000, margin = 475000, slug = 'aqiqah-favorit', sort_order = 2
  where id = 'b0000001-0000-0000-0000-000000000002';
update public.services set vendor_price = 2975000, price = 3600000, margin = 625000, slug = 'aqiqah-premium', sort_order = 3
  where id = 'b0000001-0000-0000-0000-000000000003';

-- Nasi Box A–E (margin = jual - vendor).
update public.services set vendor_price = 17500, price = 21000, margin = 3500,  slug = 'paket-a',          sort_order = 1
  where id = 'c0000002-0000-0000-0000-000000000001';
update public.services set vendor_price = 22500, price = 27000, margin = 4500,  slug = 'paket-b',          sort_order = 2
  where id = 'c0000002-0000-0000-0000-000000000002';
update public.services set vendor_price = 26500, price = 32000, margin = 5500,  slug = 'paket-c-favorit',  sort_order = 3
  where id = 'c0000002-0000-0000-0000-000000000003';
update public.services set vendor_price = 37000, price = 45000, margin = 8000,  slug = 'paket-d',          sort_order = 4
  where id = 'c0000002-0000-0000-0000-000000000004';
update public.services set vendor_price = 58000, price = 70000, margin = 12000, slug = 'paket-e-premium',  sort_order = 5
  where id = 'c0000002-0000-0000-0000-000000000005';

-- ---------- RPC publik: sertakan slug (TANPA vendor_price/margin) ----------
create or replace function public.get_public_packages()
returns jsonb
language sql
stable
security definer set search_path = public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', s.id,
        'slug', s.slug,
        'type', s.type,
        'name', s.name,
        'description', s.description,
        'price', s.price,
        'meta', s.meta
      )
      order by
        case s.type when 'aqiqah' then 1 when 'nasi_box' then 2 when 'qurban' then 3 else 4 end,
        s.sort_order, s.price
    ),
    '[]'::jsonb
  )
  from public.services s
  where s.is_active = true and s.deleted_at is null;
$$;
grant execute on function public.get_public_packages() to anon, authenticated;

-- RPC detail satu program publik by slug (untuk halaman /{slug}).
create or replace function public.get_public_package(p_slug text)
returns jsonb
language sql
stable
security definer set search_path = public
as $$
  select jsonb_build_object(
    'id', s.id,
    'slug', s.slug,
    'type', s.type,
    'name', s.name,
    'description', s.description,
    'price', s.price,
    'meta', s.meta
  )
  from public.services s
  where s.slug = p_slug and s.is_active = true and s.deleted_at is null
  limit 1;
$$;
grant execute on function public.get_public_package(text) to anon, authenticated;

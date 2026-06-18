-- ============================================================
-- ImpactAqiqah — 13 Services Pricing & Nasi Box
-- Acuan: katalog paket (kambing + nasi box) editable di dashboard.
-- CATATAN: ADD VALUE pada enum tidak boleh dipakai di transaksi yang sama;
--          pengisian paket ada di migration 14 (transaksi terpisah).
-- ============================================================

-- Jenis layanan baru: nasi box (layanan mandiri, bisa segabung dalam 1 order)
alter type public.service_type add value if not exists 'nasi_box';

-- Harga jual total per paket (rincian harga_kambing/biaya_masak disimpan di services.meta)
alter table public.services
  add column if not exists price numeric(14,2) not null default 0;

comment on column public.services.price is 'Harga jual total paket (Rp). Rincian di meta (docs/05).';

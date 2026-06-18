-- ============================================================
-- ImpactAqiqah — 19 Payments Gateway (iPaymu)
-- Kolom provider untuk pembayaran online + anti-duplikat callback.
-- Trigger recompute payment_status sudah ada (migration 09).
-- ============================================================

alter table public.payments
  add column if not exists provider text,
  add column if not exists provider_ref text,
  add column if not exists raw jsonb;

-- Anti-duplikat: callback iPaymu yang sama (trx_id) tidak menggandakan payment
create unique index if not exists uq_payments_provider_ref
  on public.payments (provider, provider_ref)
  where provider_ref is not null;

comment on column public.payments.provider is 'Penyedia pembayaran, mis. ipaymu';
comment on column public.payments.provider_ref is 'ID transaksi penyedia (iPaymu trx_id)';

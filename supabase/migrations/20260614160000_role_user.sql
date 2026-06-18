-- ============================================================
-- ImpactAqiqah — 16 Role 'user' (customer)
-- Terpisah dari pemakaian (migration 17) karena enum value baru tak bisa
-- dipakai dalam transaksi yang sama dengan ADD VALUE.
-- ============================================================
alter type public.user_role add value if not exists 'user';

-- ============================================================
-- ImpactAqiqah — 02 Core / Master Tables
-- Acuan: docs/05_DATABASE_DESIGN.md §4.1–4.5
-- Konvensi: id uuid PK, created_at/updated_at timestamptz, soft-delete deleted_at
-- ============================================================

-- ------------------------------------------------------------
-- branches (cabang)
-- ------------------------------------------------------------
create table public.branches (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  code        text not null unique,
  address     text,
  phone       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
comment on table public.branches is 'Cabang Zakat Sukses (docs/05 §4.2)';

-- ------------------------------------------------------------
-- profiles (extend auth.users) — pengguna internal
-- ------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  email       text unique,
  phone       text,
  role        public.user_role not null default 'petugas_lapangan',
  branch_id   uuid references public.branches (id) on delete set null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.profiles is 'Profil pengguna internal, 1:1 dengan auth.users (docs/05 §4.1, docs/07)';
comment on column public.profiles.branch_id is 'NULL untuk role pusat (direktur/manager_program/admin_pusat)';

-- ------------------------------------------------------------
-- locations (lokasi/titik pemotongan)
-- ------------------------------------------------------------
create table public.locations (
  id          uuid primary key default gen_random_uuid(),
  branch_id   uuid not null references public.branches (id) on delete cascade,
  name        text not null,
  address     text,
  lat         numeric(9,6),
  lng         numeric(9,6),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
comment on table public.locations is 'Lokasi dengan koordinat Google Maps (docs/05 §4.3)';

-- ------------------------------------------------------------
-- services (master jenis layanan)
-- ------------------------------------------------------------
create table public.services (
  id          uuid primary key default gen_random_uuid(),
  type        public.service_type not null,
  name        text not null,
  description text,
  -- meta dapat memuat override kebijakan, mis. {"min_dp_ratio": 1.0} untuk wajib lunas
  meta        jsonb not null default '{}'::jsonb,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
comment on table public.services is 'Master layanan Aqiqah/Qurban/Sedekah Daging (docs/05 §4.4)';

-- ------------------------------------------------------------
-- participants (peserta/donatur)
-- ------------------------------------------------------------
create table public.participants (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text,
  email       text,
  address     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);
comment on table public.participants is 'Peserta/donatur — kontak untuk WA.me & email laporan (docs/05 §4.5)';

-- ------------------------------------------------------------
-- app_settings (konfigurasi global, mis. min_dp_ratio)
-- ------------------------------------------------------------
create table public.app_settings (
  key         text primary key,
  value       jsonb not null,
  description text,
  updated_at  timestamptz not null default now()
);
comment on table public.app_settings is 'Konfigurasi aplikasi: gate pembayaran (min_dp_ratio), SLA, dll';

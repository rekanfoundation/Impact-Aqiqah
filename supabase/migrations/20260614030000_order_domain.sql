-- ============================================================
-- ImpactAqiqah — 03 Order Domain
-- Acuan: docs/05_DATABASE_DESIGN.md §4.6–4.12, docs/08_WORKFLOW_MAP
-- ============================================================

-- ------------------------------------------------------------
-- orders (inti operasional, state machine)
-- ------------------------------------------------------------
create table public.orders (
  id              uuid primary key default gen_random_uuid(),
  order_number    text not null unique,                 -- diisi trigger: IA-YYYYMM-####
  participant_id  uuid not null references public.participants (id) on delete restrict,
  branch_id       uuid not null references public.branches (id) on delete restrict,
  created_by      uuid references public.profiles (id) on delete set null, -- nullable: system/seed
  status          public.order_status not null default 'new',
  payment_status  public.payment_status not null default 'unpaid',
  total_amount    numeric(14,2) not null default 0,
  notes           text,
  public_token    text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
comment on table public.orders is 'Order inti — Aqiqah/Qurban/Sedekah Daging (docs/05 §4.6)';
comment on column public.orders.public_token is 'Token laporan publik (docs/11). Acak & tak tertebak.';

-- ------------------------------------------------------------
-- order_items (rincian layanan per order)
-- ------------------------------------------------------------
create table public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete cascade,
  service_id  uuid not null references public.services (id) on delete restrict,
  qty         integer not null default 1 check (qty >= 1),
  unit_price  numeric(14,2) not null default 0,
  meta        jsonb not null default '{}'::jsonb,        -- preferensi: atas nama, dll
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.order_items is 'Rincian layanan/hewan per order (docs/05 §4.7)';

-- ------------------------------------------------------------
-- animals (hewan per order)
-- ------------------------------------------------------------
create table public.animals (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders (id) on delete cascade,
  tag_code      text,
  species       public.animal_species not null,
  weight_kg     numeric(6,2),
  status        public.animal_status not null default 'registered',
  on_behalf_of  text,                                    -- atas nama (aqiqah/qurban)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
comment on table public.animals is 'Hewan per order — satu order banyak hewan (docs/05 §4.8)';

-- ------------------------------------------------------------
-- payments (pembayaran & verifikasi)
-- ------------------------------------------------------------
create table public.payments (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders (id) on delete cascade,
  amount       numeric(14,2) not null check (amount >= 0),
  method       text,                                     -- transfer/tunai
  proof_path   text,                                     -- path Storage bukti
  status       public.payment_status not null default 'partial',
  verified_by  uuid references public.profiles (id) on delete set null,
  verified_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
comment on table public.payments is 'Pembayaran per order; DP/Partial diizinkan (docs/05 §4.9, docs/06)';

-- ------------------------------------------------------------
-- schedules (penjadwalan pemotongan) — 1 order : 1 jadwal
-- ------------------------------------------------------------
create table public.schedules (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null unique references public.orders (id) on delete cascade,
  location_id     uuid references public.locations (id) on delete set null,
  pic_user_id     uuid references public.profiles (id) on delete set null,
  scheduled_date  date,
  scheduled_time  time,
  status          public.schedule_status not null default 'planned',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table public.schedules is 'Jadwal + lokasi + PIC per order (docs/05 §4.10)';

-- ------------------------------------------------------------
-- slaughter_records (catatan pemotongan per hewan)
-- ------------------------------------------------------------
create table public.slaughter_records (
  id            uuid primary key default gen_random_uuid(),
  animal_id     uuid not null references public.animals (id) on delete cascade,
  performed_by  uuid references public.profiles (id) on delete set null,
  performed_at  timestamptz not null default now(),
  notes         text,
  created_at    timestamptz not null default now()
);
comment on table public.slaughter_records is 'Catatan pemotongan per hewan (docs/05 §4.11)';

-- ------------------------------------------------------------
-- distributions (distribusi daging)
-- ------------------------------------------------------------
create table public.distributions (
  id                   uuid primary key default gen_random_uuid(),
  order_id             uuid not null references public.orders (id) on delete cascade,
  slaughter_record_id  uuid references public.slaughter_records (id) on delete set null,
  recipient_name       text,
  recipient_area       text,
  packages_count       integer not null default 0 check (packages_count >= 0),
  distributed_by       uuid references public.profiles (id) on delete set null,
  distributed_at       timestamptz not null default now(),
  lat                  numeric(9,6),
  lng                  numeric(9,6),
  created_at           timestamptz not null default now()
);
comment on table public.distributions is 'Catatan distribusi daging ke titik/penerima (docs/05 §4.12)';

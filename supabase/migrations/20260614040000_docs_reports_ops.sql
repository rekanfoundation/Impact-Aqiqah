-- ============================================================
-- ImpactAqiqah — 04 Documentation / Reports / Ops
-- Acuan: docs/05_DATABASE_DESIGN.md §4.13–4.17
-- ============================================================

-- ------------------------------------------------------------
-- documentations (foto/video/catatan + validasi 2 tingkat)
-- ------------------------------------------------------------
create table public.documentations (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders (id) on delete cascade,
  animal_id     uuid references public.animals (id) on delete set null,
  type          public.doc_type not null,
  storage_path  text,                                    -- path Supabase Storage (NULL untuk type=note)
  caption       text,
  stage         public.doc_stage not null default 'general',
  status        public.doc_status not null default 'pending',
  uploaded_by   uuid references public.profiles (id) on delete set null,
  reviewed_by   uuid references public.profiles (id) on delete set null,
  review_note   text,                                    -- alasan reject (wajib saat rejected)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
comment on table public.documentations is 'Dokumentasi + status validasi pending->approved_supervisor->approved/rejected (docs/05 §4.13, docs/10)';

-- ------------------------------------------------------------
-- reports (laporan peserta — PDF + token publik)
-- ------------------------------------------------------------
create table public.reports (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders (id) on delete cascade,
  pdf_path      text,                                    -- path Storage PDF
  public_token  text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  generated_by  text,                                    -- 'n8n' / user id
  generated_at  timestamptz not null default now(),
  version       integer not null default 1,
  created_at    timestamptz not null default now()
);
comment on table public.reports is 'Laporan peserta; akses publik via public_token (docs/05 §4.14, docs/11)';

-- ------------------------------------------------------------
-- notifications (outbox: whatsapp/email/dashboard)
-- ------------------------------------------------------------
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid references public.orders (id) on delete cascade,
  channel     public.notif_channel not null,
  target      text,                                      -- nomor/email/user id
  payload     jsonb not null default '{}'::jsonb,
  status      public.notif_status not null default 'queued',
  sent_at     timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.notifications is 'Outbox notifikasi diproses n8n (docs/05 §4.15, docs/12, docs/18)';

-- ------------------------------------------------------------
-- issues (kendala pada order)
-- ------------------------------------------------------------
create table public.issues (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders (id) on delete cascade,
  reported_by  uuid references public.profiles (id) on delete set null,
  severity     public.issue_severity not null default 'low',
  title        text not null,
  description  text,
  status       public.issue_status not null default 'open',
  resolved_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
comment on table public.issues is 'Kendala/issue — bagian jawaban "apa kendalanya" pada litmus test (docs/05 §4.16)';

-- ------------------------------------------------------------
-- audit_logs (jejak audit)
-- ------------------------------------------------------------
create table public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.profiles (id) on delete set null, -- NULL = system
  entity      text not null,
  entity_id   uuid,
  action      text not null,                             -- create/update/status_change/delete
  before      jsonb,
  after       jsonb,
  created_at  timestamptz not null default now()
);
comment on table public.audit_logs is 'Audit trail perubahan penting (docs/05 §4.17, docs/20)';

-- ============================================================
-- ImpactAqiqah — 01 Extensions & Enums
-- Acuan: docs/05_DATABASE_DESIGN.md §1, §5
-- ============================================================

-- Ekstensi: pgcrypto menyediakan gen_random_uuid() & gen_random_bytes()
create extension if not exists pgcrypto with schema extensions;

-- ------------------------------------------------------------
-- Enum types (state machines & klasifikasi)
-- ------------------------------------------------------------

-- Peran pengguna internal (Peserta = anon tanpa akun, lihat docs/07)
create type public.user_role as enum (
  'direktur',
  'manager_program',
  'admin_pusat',
  'admin_cabang',
  'petugas_lapangan'
);

-- Jenis layanan
create type public.service_type as enum (
  'aqiqah',
  'qurban',
  'sedekah_daging'
);

-- Status order (docs/08_WORKFLOW_MAP)
create type public.order_status as enum (
  'new',
  'paid',
  'scheduled',
  'preparation',
  'slaughtering',
  'distribution',
  'documentation',
  'reporting',
  'completed',
  'on_hold',
  'cancelled'
);

-- Status pembayaran (gate: paid ATAU partial >= min_dp)
create type public.payment_status as enum (
  'unpaid',
  'partial',
  'paid'
);

-- Hewan
create type public.animal_species as enum (
  'kambing',
  'domba',
  'sapi'
);

create type public.animal_status as enum (
  'registered',
  'prepared',
  'slaughtered',
  'distributed'
);

-- Jadwal
create type public.schedule_status as enum (
  'planned',
  'ongoing',
  'done'
);

-- Dokumentasi (validasi 2 tingkat: Supervisor -> Admin Pusat)
create type public.doc_type as enum (
  'photo',
  'video',
  'note'
);

create type public.doc_stage as enum (
  'slaughter',
  'distribution',
  'general'
);

create type public.doc_status as enum (
  'pending',
  'approved_supervisor',
  'approved',
  'rejected'
);

-- Notifikasi (outbox)
create type public.notif_channel as enum (
  'whatsapp',
  'email',
  'dashboard'
);

create type public.notif_status as enum (
  'queued',
  'sent',
  'failed'
);

-- Issue / kendala
create type public.issue_severity as enum (
  'low',
  'medium',
  'high'
);

create type public.issue_status as enum (
  'open',
  'in_progress',
  'resolved'
);

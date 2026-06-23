-- ============================================================
-- ImpactAqiqah — 25 AI Analyses (simpan hasil analisis AI oleh admin)
-- Role pusat (is_central) bisa baca/simpan/hapus. Acuan: docs/19.
-- ============================================================

create table if not exists public.ai_analyses (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null default 'summary',
  title       text,
  content     text not null,
  meta        jsonb not null default '{}'::jsonb,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
comment on table public.ai_analyses is 'Hasil analisis AI yang disimpan admin (executive summary, dll)';

create index if not exists idx_ai_analyses_created on public.ai_analyses (created_at desc);

alter table public.ai_analyses enable row level security;

drop policy if exists ai_analyses_select on public.ai_analyses;
create policy ai_analyses_select on public.ai_analyses
  for select to authenticated using (public.is_central());

drop policy if exists ai_analyses_write on public.ai_analyses;
create policy ai_analyses_write on public.ai_analyses
  for all to authenticated
  using (public.is_central())
  with check (public.is_central());

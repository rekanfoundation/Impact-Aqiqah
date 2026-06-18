-- ============================================================
-- ImpactAqiqah — 10 Storage Buckets & Policies
-- Acuan: docs/17_STORAGE_STRATEGY, docs/20.
-- Guarded: hanya jalan bila schema `storage` ada (Supabase). Di Postgres polos (uji
-- Docker) blok ini dilewati sehingga migrasi tetap sukses.
-- ============================================================

do $$
begin
  if to_regclass('storage.buckets') is null then
    raise notice 'storage schema tidak ada — lewati (lingkungan non-Supabase)';
    return;
  end if;

  -- Buckets (semua private kecuali public-assets)
  insert into storage.buckets (id, name, public)
  values
    ('documentation',  'documentation',  false),
    ('payment-proofs', 'payment-proofs', false),
    ('reports',        'reports',        false),
    ('public-assets',  'public-assets',  true)
  on conflict (id) do nothing;

  -- Policies pada storage.objects untuk bucket privat:
  -- pengguna terautentikasi boleh baca & tulis; akses publik via signed URL (docs/11/17).
  if not exists (select 1 from pg_policies where schemaname='storage' and policyname='ia_docs_read') then
    execute $p$
      create policy ia_docs_read on storage.objects for select to authenticated
      using (bucket_id in ('documentation','payment-proofs','reports'))
    $p$;
  end if;

  if not exists (select 1 from pg_policies where schemaname='storage' and policyname='ia_docs_write') then
    execute $p$
      create policy ia_docs_write on storage.objects for insert to authenticated
      with check (bucket_id in ('documentation','payment-proofs'))
    $p$;
  end if;

  if not exists (select 1 from pg_policies where schemaname='storage' and policyname='ia_public_assets_read') then
    execute $p$
      create policy ia_public_assets_read on storage.objects for select to anon
      using (bucket_id = 'public-assets')
    $p$;
  end if;
end
$$;

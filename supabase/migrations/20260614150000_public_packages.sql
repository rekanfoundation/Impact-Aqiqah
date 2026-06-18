-- ============================================================
-- ImpactAqiqah — 15 Public Packages (untuk landing page, tanpa login)
-- Anon hanya bisa membaca paket AKTIF dengan field marketing (docs/11/20 pola token).
-- ============================================================

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
        'type', s.type,
        'name', s.name,
        'description', s.description,
        'price', s.price,
        'meta', s.meta
      )
      order by
        case s.type when 'aqiqah' then 1 when 'nasi_box' then 2 when 'qurban' then 3 else 4 end,
        s.price
    ),
    '[]'::jsonb
  )
  from public.services s
  where s.is_active = true and s.deleted_at is null;
$$;

grant execute on function public.get_public_packages() to anon, authenticated;

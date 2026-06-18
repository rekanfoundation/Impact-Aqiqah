-- ============================================================
-- ImpactAqiqah — 18 Affiliate (link + atribusi + komisi)
-- User dapat kode/link unik; order yang masuk via link tercatat (orders.referral_code).
-- Komisi = ratio × nilai order teratribusi (payout aktual manual).
-- ============================================================

alter table public.profiles
  add column if not exists affiliate_code text unique,
  add column if not exists referred_by uuid references public.profiles (id) on delete set null;

-- Setting rasio komisi (default 5%)
insert into public.app_settings (key, value, description) values
  ('affiliate_commission_ratio', '{"ratio": 0.05}', 'Rasio komisi affiliate atas nilai order teratribusi')
on conflict (key) do nothing;

-- Generator kode affiliate (8 char hex dari random)
create or replace function public.gen_affiliate_code()
returns text
language sql
as $$
  select upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 8));
$$;

-- Trigger: set affiliate_code saat profil dibuat bila kosong
create or replace function public.set_affiliate_code()
returns trigger
language plpgsql
as $$
begin
  if new.affiliate_code is null then
    new.affiliate_code := public.gen_affiliate_code();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_profiles_affiliate_code on public.profiles;
create trigger trg_profiles_affiliate_code
  before insert on public.profiles
  for each row execute function public.set_affiliate_code();

-- handle_new_user: set referred_by dari metadata 'ref' (kode affiliate perujuk)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_ref_id uuid;
begin
  v_ref_id := (
    select id from public.profiles
    where affiliate_code = nullif(new.raw_user_meta_data ->> 'ref', '')
    limit 1
  );

  insert into public.profiles (id, email, full_name, role, referred_by)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'user'),
    v_ref_id
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ------------------------------------------------------------
-- get_my_affiliate() — ringkasan affiliate untuk user yang login.
-- Lazy-generate kode bila belum ada. SECURITY DEFINER (hanya data sendiri).
-- ------------------------------------------------------------
create or replace function public.get_my_affiliate()
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
  v_ratio numeric;
  v_orders int;
  v_gross numeric;
  v_referred int;
begin
  if v_uid is null then
    return null;
  end if;

  select affiliate_code into v_code from public.profiles where id = v_uid;
  if v_code is null then
    v_code := public.gen_affiliate_code();
    update public.profiles set affiliate_code = v_code where id = v_uid;
  end if;

  v_ratio := coalesce(
    (select (value ->> 'ratio')::numeric from public.app_settings where key = 'affiliate_commission_ratio'),
    0.05
  );

  select count(*), coalesce(sum(total_amount), 0)
    into v_orders, v_gross
  from public.orders
  where referral_code = v_code
    and status <> 'cancelled' and deleted_at is null;

  select count(*) into v_referred from public.profiles where referred_by = v_uid;

  return jsonb_build_object(
    'code', v_code,
    'commission_ratio', v_ratio,
    'referred_users', v_referred,
    'attributed_orders', v_orders,
    'gross', v_gross,
    'commission_estimate', round(v_gross * v_ratio)
  );
end;
$$;

grant execute on function public.get_my_affiliate() to authenticated;

create index if not exists idx_orders_referral on public.orders (referral_code);

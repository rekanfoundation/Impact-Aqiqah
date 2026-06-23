-- ============================================================
-- ImpactAqiqah — 24 Affiliate Tiers (komisi per ekor kambing, reset 365 hari)
-- Aturan: jumlah ekor kambing teratribusi dalam jendela 365 hari (per-anniversary sejak
-- transaksi pertama). 0–10 ekor pertama = 2,5%; >10 ekor = 5% (tiered/blended).
-- Ekor kambing = sum(order_items.qty) untuk layanan type='aqiqah'.
-- ============================================================

insert into public.app_settings (key, value, description) values
  ('affiliate_tiers',
   '{"threshold": 10, "rate_low": 0.025, "rate_high": 0.05, "period_days": 365}',
   'Tier komisi affiliate per ekor kambing dalam jendela period_days')
on conflict (key) do nothing;

create or replace function public.get_my_affiliate()
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
  v_referred int;
  v_threshold int;
  v_low numeric;
  v_high numeric;
  v_period int;
  v_orders int;
  v_gross numeric;
  v_first timestamptz;
  v_commission numeric := 0;
  v_widx_now int := 0;
  v_period_start timestamptz;
  v_goats_period int := 0;
  v_gross_period numeric := 0;
begin
  if v_uid is null then return null; end if;

  select affiliate_code into v_code from public.profiles where id = v_uid;
  if v_code is null then
    v_code := public.gen_affiliate_code();
    update public.profiles set affiliate_code = v_code where id = v_uid;
  end if;

  select count(*) into v_referred from public.profiles where referred_by = v_uid;

  -- konfigurasi tier (fallback bila baris hilang)
  select coalesce((value ->> 'threshold')::int, 10),
         coalesce((value ->> 'rate_low')::numeric, 0.025),
         coalesce((value ->> 'rate_high')::numeric, 0.05),
         coalesce((value ->> 'period_days')::int, 365)
    into v_threshold, v_low, v_high, v_period
  from public.app_settings where key = 'affiliate_tiers';
  v_threshold := coalesce(v_threshold, 10);
  v_low := coalesce(v_low, 0.025);
  v_high := coalesce(v_high, 0.05);
  v_period := coalesce(v_period, 365);

  -- lifetime
  select count(*), coalesce(sum(total_amount), 0)
    into v_orders, v_gross
  from public.orders
  where referral_code = v_code and status <> 'cancelled' and deleted_at is null;

  if v_orders = 0 then
    return jsonb_build_object(
      'code', v_code, 'referred_users', v_referred, 'attributed_orders', 0, 'gross', 0,
      'commission_estimate', 0, 'goats_period', 0, 'gross_period', 0, 'threshold', v_threshold,
      'rate_low', v_low, 'rate_high', v_high, 'current_rate', v_low,
      'period_start', null, 'period_end', null);
  end if;

  -- transaksi pertama → tentukan jendela
  select min(created_at) into v_first
  from public.orders where referral_code = v_code and status <> 'cancelled' and deleted_at is null;
  v_widx_now := floor(extract(epoch from (now() - v_first)) / (v_period * 86400))::int;
  v_period_start := v_first + (v_widx_now * v_period || ' days')::interval;

  -- komisi total lintas jendela (tiap jendela: 10 ekor pertama rate_low, sisanya rate_high)
  with attributed as (
    select o.id, o.created_at, o.total_amount,
      coalesce((
        select sum(oi.qty) from public.order_items oi
        join public.services s on s.id = oi.service_id
        where oi.order_id = o.id and s.type = 'aqiqah'
      ), 0)::int as goats
    from public.orders o
    where o.referral_code = v_code and o.status <> 'cancelled' and o.deleted_at is null
  ),
  win as (
    select a.*, floor(extract(epoch from (a.created_at - v_first)) / (v_period * 86400))::int as widx
    from attributed a
  ),
  alloc as (
    select w.*,
      coalesce(sum(goats) over (
        partition by widx order by created_at, id
        rows between unbounded preceding and 1 preceding), 0) as cum_before
    from win w
  )
  select coalesce(sum(
    case when goats > 0 then
      (total_amount / goats) * (
        least(goats, greatest(0, v_threshold - cum_before)) * v_low
        + (goats - least(goats, greatest(0, v_threshold - cum_before))) * v_high
      )
    else 0 end), 0)
  into v_commission
  from alloc;

  -- ringkasan jendela berjalan (untuk tampilan tier)
  with attributed as (
    select o.id, o.created_at, o.total_amount,
      coalesce((
        select sum(oi.qty) from public.order_items oi
        join public.services s on s.id = oi.service_id
        where oi.order_id = o.id and s.type = 'aqiqah'
      ), 0)::int as goats
    from public.orders o
    where o.referral_code = v_code and o.status <> 'cancelled' and o.deleted_at is null
  )
  select coalesce(sum(goats), 0), coalesce(sum(total_amount), 0)
    into v_goats_period, v_gross_period
  from attributed
  where floor(extract(epoch from (created_at - v_first)) / (v_period * 86400))::int = v_widx_now;

  return jsonb_build_object(
    'code', v_code,
    'referred_users', v_referred,
    'attributed_orders', v_orders,
    'gross', v_gross,
    'commission_estimate', round(v_commission),
    'goats_period', v_goats_period,
    'gross_period', v_gross_period,
    'threshold', v_threshold,
    'rate_low', v_low,
    'rate_high', v_high,
    'current_rate', case when v_goats_period > v_threshold then v_high else v_low end,
    'period_start', v_period_start,
    'period_end', v_period_start + (v_period || ' days')::interval
  );
end;
$$;

grant execute on function public.get_my_affiliate() to authenticated;

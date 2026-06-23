-- ============================================================
-- ImpactAqiqah — 22 Checkout Guest (Aqiqah Salur/Kirim, tanpa login)
-- Kolom checkout pada orders + RPC create_guest_order (SECURITY DEFINER, anon boleh).
-- Harga selalu dari services.price (anti-tamper). Acuan: docs/06, docs/08.
-- ============================================================

alter table public.orders
  add column if not exists aqiqah_type      text check (aqiqah_type in ('salur','kirim')),
  add column if not exists child_name       text,
  add column if not exists child_bin_binti  text,
  add column if not exists child_gender     text check (child_gender in ('L','P')),
  add column if not exists delivery_date    date,
  add column if not exists delivery_time    time,
  add column if not exists delivery_address jsonb not null default '{}'::jsonb;

comment on column public.orders.aqiqah_type is 'salur = disalurkan ImpactAqiqah; kirim = diantar ke alamat pemesan';
comment on column public.orders.delivery_address is 'Alamat terstruktur: alamat, provinsi, kota, kecamatan, kelurahan, patokan';

-- ------------------------------------------------------------
-- create_guest_order(payload) -> jsonb {order_id, public_token, total}
-- payload: {
--   items:[{service_id, qty}], aqiqah_type, child_name, child_bin_binti, child_gender,
--   pemesan:{name, phone, email}, delivery:{date, time},
--   address:{alamat, provinsi, kota, kecamatan, kelurahan, patokan},
--   notes, referral_code
-- }
-- ------------------------------------------------------------
create or replace function public.create_guest_order(payload jsonb)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_type       text := payload ->> 'aqiqah_type';
  v_email      text := nullif(payload -> 'pemesan' ->> 'email', '');
  v_name       text := coalesce(nullif(payload -> 'pemesan' ->> 'name',''), 'Pemesan');
  v_phone      text := nullif(payload -> 'pemesan' ->> 'phone', '');
  v_ddate      date := nullif(payload -> 'delivery' ->> 'date','')::date;
  v_dtime      time := nullif(payload -> 'delivery' ->> 'time','')::time;
  v_addr_text  text;
  v_participant uuid;
  v_order      uuid;
  v_token      text;
  v_total      numeric(14,2) := 0;
  v_item       jsonb;
  v_count      int;
begin
  -- validasi item
  select count(*) into v_count
  from jsonb_array_elements(coalesce(payload->'items','[]'::jsonb));
  if v_count = 0 then raise exception 'Keranjang kosong'; end if;

  if v_type not in ('salur','kirim') then
    raise exception 'Tipe aqiqah harus salur atau kirim';
  end if;
  if v_email is null then raise exception 'Email wajib diisi'; end if;

  -- validasi pengiriman (kirim wajib alamat + tanggal minimal H-3)
  if v_type = 'kirim' then
    if nullif(payload -> 'address' ->> 'alamat','') is null then
      raise exception 'Alamat wajib diisi untuk Aqiqah Kirim';
    end if;
    if v_ddate is null or v_ddate < current_date + 3 then
      raise exception 'Tanggal pengantaran minimal H-3 dari hari ini';
    end if;
  end if;

  -- total dari harga tepercaya (services.price)
  select coalesce(sum( (i->>'qty')::int * s.price ), 0) into v_total
  from jsonb_array_elements(coalesce(payload->'items','[]'::jsonb)) i
  join public.services s on s.id = (i->>'service_id')::uuid and s.is_active and s.deleted_at is null;
  if v_total <= 0 then raise exception 'Paket tidak valid'; end if;

  -- alamat gabungan untuk participants.address (display)
  v_addr_text := nullif(concat_ws(', ',
    nullif(payload -> 'address' ->> 'alamat',''),
    nullif(payload -> 'address' ->> 'kelurahan',''),
    nullif(payload -> 'address' ->> 'kecamatan',''),
    nullif(payload -> 'address' ->> 'kota',''),
    nullif(payload -> 'address' ->> 'provinsi','')
  ), '');

  insert into public.participants (name, phone, email, address)
  values (v_name, v_phone, v_email, v_addr_text)
  returning id into v_participant;

  insert into public.orders (
    participant_id, customer_id, branch_id, created_by, status, payment_status, total_amount,
    notes, referral_code,
    aqiqah_type, child_name, child_bin_binti, child_gender,
    delivery_date, delivery_time, delivery_address
  ) values (
    v_participant, null, null, null, 'new', 'unpaid', v_total,
    nullif(payload->>'notes',''), nullif(payload->>'referral_code',''),
    v_type,
    nullif(payload->>'child_name',''),
    nullif(payload->>'child_bin_binti',''),
    nullif(payload->>'child_gender',''),
    v_ddate, v_dtime,
    coalesce(payload->'address','{}'::jsonb)
  )
  returning id, public_token into v_order, v_token;

  for v_item in select * from jsonb_array_elements(coalesce(payload->'items','[]'::jsonb)) loop
    insert into public.order_items (order_id, service_id, qty, unit_price)
    select v_order, (v_item->>'service_id')::uuid, greatest(1, coalesce((v_item->>'qty')::int,1)), s.price
    from public.services s where s.id = (v_item->>'service_id')::uuid;
  end loop;

  return jsonb_build_object('order_id', v_order, 'public_token', v_token, 'total', v_total);
end;
$$;

grant execute on function public.create_guest_order(jsonb) to anon, authenticated;

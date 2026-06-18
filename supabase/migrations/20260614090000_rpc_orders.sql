-- ============================================================
-- ImpactAqiqah — 09 RPC Order Management
-- Acuan: docs/08_WORKFLOW_MAP (state machine), docs/06 (gate DP), docs/16
-- Semua SECURITY INVOKER -> RLS tetap berlaku (docs/20).
-- ============================================================

-- ------------------------------------------------------------
-- Rasio DP efektif untuk sebuah order:
--   max(global min_dp_ratio, override per-service di order_items.meta/services.meta)
-- ------------------------------------------------------------
create or replace function public.effective_min_dp_ratio(p_order_id uuid)
returns numeric
language sql stable
as $$
  select greatest(
    public.min_dp_ratio(),
    coalesce((
      select max( coalesce((s.meta ->> 'min_dp_ratio')::numeric, 0) )
      from public.order_items oi
      join public.services s on s.id = oi.service_id
      where oi.order_id = p_order_id
    ), 0)
  );
$$;

-- Total pembayaran terverifikasi pada order
create or replace function public.order_paid_amount(p_order_id uuid)
returns numeric
language sql stable
as $$
  select coalesce(sum(amount), 0)
  from public.payments
  where order_id = p_order_id and verified_at is not null;
$$;

-- ------------------------------------------------------------
-- create_order(payload jsonb) -> uuid
-- payload: {
--   participant: {id?, name, phone, email, address},
--   branch_id, notes,
--   items: [{service_id, qty, unit_price, meta}],
--   animals: [{species, on_behalf_of, tag_code}]
-- }
-- ------------------------------------------------------------
create or replace function public.create_order(payload jsonb)
returns uuid
language plpgsql
security invoker set search_path = public
as $$
declare
  v_participant_id uuid;
  v_order_id uuid;
  v_total numeric(14,2) := 0;
  v_item jsonb;
  v_animal jsonb;
begin
  -- participant: pakai id bila ada, atau buat baru
  v_participant_id := nullif(payload -> 'participant' ->> 'id', '')::uuid;
  if v_participant_id is null then
    insert into public.participants (name, phone, email, address)
    values (
      payload -> 'participant' ->> 'name',
      payload -> 'participant' ->> 'phone',
      payload -> 'participant' ->> 'email',
      payload -> 'participant' ->> 'address'
    )
    returning id into v_participant_id;
  end if;

  -- total dari items
  select coalesce(sum( (i ->> 'qty')::int * (i ->> 'unit_price')::numeric ), 0)
    into v_total
  from jsonb_array_elements(coalesce(payload -> 'items', '[]'::jsonb)) i;

  insert into public.orders (participant_id, branch_id, created_by, status, payment_status, total_amount, notes)
  values (
    v_participant_id,
    (payload ->> 'branch_id')::uuid,
    auth.uid(),
    'new',
    'unpaid',
    v_total,
    payload ->> 'notes'
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(coalesce(payload -> 'items', '[]'::jsonb)) loop
    insert into public.order_items (order_id, service_id, qty, unit_price, meta)
    values (
      v_order_id,
      (v_item ->> 'service_id')::uuid,
      coalesce((v_item ->> 'qty')::int, 1),
      coalesce((v_item ->> 'unit_price')::numeric, 0),
      coalesce(v_item -> 'meta', '{}'::jsonb)
    );
  end loop;

  for v_animal in select * from jsonb_array_elements(coalesce(payload -> 'animals', '[]'::jsonb)) loop
    insert into public.animals (order_id, species, on_behalf_of, tag_code)
    values (
      v_order_id,
      (v_animal ->> 'species')::public.animal_species,
      v_animal ->> 'on_behalf_of',
      v_animal ->> 'tag_code'
    );
  end loop;

  return v_order_id;
end;
$$;

-- ------------------------------------------------------------
-- transition_order_status(order, to) -> void
-- Validasi transisi + precondition gate (docs/08).
-- ------------------------------------------------------------
create or replace function public.transition_order_status(
  p_order_id uuid,
  p_to public.order_status
)
returns void
language plpgsql
security invoker set search_path = public
as $$
declare
  v_from public.order_status;
  v_total numeric(14,2);
  v_paid numeric(14,2);
  v_ratio numeric;
  v_has_schedule boolean;
  v_doc_complete boolean;
  v_has_report boolean;
  -- transisi valid (selaras lib/status.ts ORDER_TRANSITIONS)
  v_allowed boolean := false;
begin
  select status, total_amount into v_from, v_total
  from public.orders where id = p_order_id;

  if v_from is null then
    raise exception 'Order tidak ditemukan';
  end if;

  -- cek transisi diizinkan
  v_allowed := case v_from
    when 'new'           then p_to in ('paid','cancelled','on_hold')
    when 'paid'          then p_to in ('scheduled','cancelled','on_hold')
    when 'scheduled'     then p_to in ('preparation','on_hold')
    when 'preparation'   then p_to in ('slaughtering','on_hold')
    when 'slaughtering'  then p_to in ('distribution','on_hold')
    when 'distribution'  then p_to in ('documentation','on_hold')
    when 'documentation' then p_to in ('reporting','on_hold')
    when 'reporting'     then p_to in ('completed','on_hold')
    when 'on_hold'       then p_to in ('scheduled','paid','new','cancelled')
    else false
  end;

  if not v_allowed then
    raise exception 'Transisi % -> % tidak valid', v_from, p_to;
  end if;

  -- gate pembayaran: new -> paid butuh paid_amount >= total * ratio (DP/Partial diizinkan)
  if p_to = 'paid' then
    v_ratio := public.effective_min_dp_ratio(p_order_id);
    v_paid := public.order_paid_amount(p_order_id);
    if v_paid < (v_total * v_ratio) then
      raise exception 'Gate pembayaran belum terpenuhi: terbayar % dari minimal % (rasio %)',
        v_paid, round(v_total * v_ratio), v_ratio;
    end if;
    update public.orders
      set payment_status = (case when v_paid >= v_total then 'paid' else 'partial' end)::public.payment_status
      where id = p_order_id;
  end if;

  -- gate jadwal: paid -> scheduled butuh schedule lengkap
  if p_to = 'scheduled' then
    select exists (
      select 1 from public.schedules s
      where s.order_id = p_order_id
        and s.location_id is not null
        and s.pic_user_id is not null
        and s.scheduled_date is not null
    ) into v_has_schedule;
    if not v_has_schedule then
      raise exception 'Jadwal belum lengkap (lokasi, PIC, tanggal wajib)';
    end if;
  end if;

  -- gate dokumentasi: documentation -> reporting butuh bukti potong + distribusi approved (per order)
  if p_to = 'reporting' then
    select (
      exists (select 1 from public.documentations d
              where d.order_id = p_order_id and d.stage='slaughter' and d.status='approved')
      and exists (select 1 from public.documentations d
              where d.order_id = p_order_id and d.stage='distribution' and d.status='approved')
    ) into v_doc_complete;
    if not v_doc_complete then
      raise exception 'Dokumentasi belum lengkap & tervalidasi (butuh bukti potong + distribusi approved)';
    end if;
  end if;

  -- gate selesai: reporting -> completed butuh pelunasan penuh + laporan terbit
  if p_to = 'completed' then
    v_paid := public.order_paid_amount(p_order_id);
    if v_paid < v_total then
      raise exception 'Pelunasan penuh diperlukan sebelum order selesai (terbayar % dari %)', v_paid, v_total;
    end if;
    select exists (select 1 from public.reports where order_id = p_order_id) into v_has_report;
    if not v_has_report then
      raise exception 'Laporan belum terbit';
    end if;
  end if;

  update public.orders set status = p_to where id = p_order_id;
end;
$$;

-- ------------------------------------------------------------
-- Trigger: recompute orders.payment_status dari agregat pembayaran terverifikasi
-- ------------------------------------------------------------
create or replace function public.recompute_payment_status()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_order_id uuid := coalesce(new.order_id, old.order_id);
  v_total numeric(14,2);
  v_paid numeric(14,2);
begin
  select total_amount into v_total from public.orders where id = v_order_id;
  v_paid := public.order_paid_amount(v_order_id);
  update public.orders
    set payment_status = (
      case when v_paid <= 0 then 'unpaid'
           when v_paid >= v_total then 'paid'
           else 'partial' end
    )::public.payment_status
    where id = v_order_id;
  return null;
end;
$$;

create trigger trg_payments_recompute
  after insert or update or delete on public.payments
  for each row execute function public.recompute_payment_status();

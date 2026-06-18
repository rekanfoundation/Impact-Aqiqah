-- ============================================================
-- ImpactAqiqah — 17 Customer Foundation
-- Customer (role 'user') bisa membuat order untuk dirinya & melacaknya.
-- Acuan: docs/07 (role baru), docs/08 (tracking status).
-- ============================================================

-- Kolom baru pada orders
alter table public.orders
  add column if not exists customer_id uuid references public.profiles (id) on delete set null,
  add column if not exists referral_code text;

-- branch_id boleh kosong (admin assign setelah order customer masuk)
alter table public.orders alter column branch_id drop not null;

create index if not exists idx_orders_customer on public.orders (customer_id);

-- Signup publik default role 'user' (internal di-set eksplisit lewat metadata/promosi)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'user')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Perluas akses baca order: tambahkan pemilik (customer)
create or replace function public.can_read_order(p_order_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.orders o
    where o.id = p_order_id
      and (
        public.is_central()
        or o.branch_id = public.auth_branch()
        or public.is_pic_of(o.id)
        or o.customer_id = auth.uid()
      )
  );
$$;

-- ------------------------------------------------------------
-- create_customer_order(payload) -> uuid  (SECURITY DEFINER)
-- payload: { items:[{service_id, qty}], notes, referral_code }
-- Harga diambil dari services.price (tepercaya, bukan dari klien).
-- ------------------------------------------------------------
create or replace function public.create_customer_order(payload jsonb)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_participant uuid;
  v_order uuid;
  v_total numeric(14,2) := 0;
  v_item jsonb;
begin
  if v_uid is null then
    raise exception 'Harus login sebagai user';
  end if;

  -- participant dari profil customer
  insert into public.participants (name, phone, email)
  select coalesce(p.full_name, p.email, 'Customer'), p.phone, p.email
  from public.profiles p where p.id = v_uid
  returning id into v_participant;

  -- total dari harga paket
  select coalesce(sum( (i->>'qty')::int * s.price ), 0) into v_total
  from jsonb_array_elements(coalesce(payload->'items','[]'::jsonb)) i
  join public.services s on s.id = (i->>'service_id')::uuid;

  insert into public.orders
    (participant_id, customer_id, branch_id, created_by, status, payment_status, total_amount, notes, referral_code)
  values
    (v_participant, v_uid, null, v_uid, 'new', 'unpaid', v_total, payload->>'notes',
     nullif(payload->>'referral_code',''))
  returning id into v_order;

  for v_item in select * from jsonb_array_elements(coalesce(payload->'items','[]'::jsonb)) loop
    insert into public.order_items (order_id, service_id, qty, unit_price)
    select v_order, (v_item->>'service_id')::uuid, coalesce((v_item->>'qty')::int, 1), s.price
    from public.services s where s.id = (v_item->>'service_id')::uuid;
  end loop;

  return v_order;
end;
$$;

grant execute on function public.create_customer_order(jsonb) to authenticated;

-- ------------------------------------------------------------
-- RLS: customer membaca order & data terkait miliknya
-- (policy permissive baru — OR dengan policy existing)
-- ------------------------------------------------------------
create policy orders_select_customer on public.orders
  for select to authenticated
  using (customer_id = auth.uid());

create policy participants_select_customer on public.participants
  for select to authenticated
  using (exists (
    select 1 from public.orders o
    where o.participant_id = participants.id and o.customer_id = auth.uid()
  ));

-- order_items/animals/distributions/documentations/reports memakai can_read_order
-- yang kini sudah mencakup customer (lihat di atas).

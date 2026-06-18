-- ============================================================
-- ImpactAqiqah — 05 Functions & Triggers
-- Acuan: docs/05_DATABASE_DESIGN.md §1, §5; docs/07; docs/20
-- ============================================================

-- ------------------------------------------------------------
-- updated_at otomatis
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare
  t text;
  tables text[] := array[
    'branches','profiles','locations','services','participants',
    'orders','order_items','animals','payments','schedules',
    'documentations','notifications','issues'
  ];
begin
  foreach t in array tables loop
    execute format(
      'create trigger trg_%1$s_updated_at before update on public.%1$I
         for each row execute function public.set_updated_at();', t
    );
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- order_number: IA-YYYYMM-#### (reset per bulan)
-- ------------------------------------------------------------
create table public.order_counters (
  period   text primary key,   -- 'YYYYMM'
  last_seq integer not null default 0
);

create or replace function public.gen_order_number()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_period text := to_char(now(), 'YYYYMM');
  v_seq    integer;
begin
  if new.order_number is not null and new.order_number <> '' then
    return new;
  end if;

  insert into public.order_counters (period, last_seq)
    values (v_period, 1)
  on conflict (period)
    do update set last_seq = public.order_counters.last_seq + 1
  returning last_seq into v_seq;

  new.order_number := 'IA-' || v_period || '-' || lpad(v_seq::text, 4, '0');
  return new;
end;
$$;

create trigger trg_orders_order_number
  before insert on public.orders
  for each row execute function public.gen_order_number();

-- ------------------------------------------------------------
-- Audit: catat perubahan status (orders) & validasi (documentations)
-- ------------------------------------------------------------
create or replace function public.audit_status_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if (tg_op = 'UPDATE' and new.status is distinct from old.status) then
    insert into public.audit_logs (actor_id, entity, entity_id, action, before, after)
    values (
      auth.uid(),
      tg_table_name,
      new.id,
      'status_change',
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status)
    );
  end if;
  return new;
end;
$$;

create trigger trg_orders_audit_status
  after update on public.orders
  for each row execute function public.audit_status_change();

create trigger trg_documentations_audit_status
  after update on public.documentations
  for each row execute function public.audit_status_change();

-- ------------------------------------------------------------
-- Auto-create profile saat user baru daftar di auth.users
-- ------------------------------------------------------------
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
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'petugas_lapangan')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger trg_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- Helper RBAC untuk RLS (SECURITY DEFINER agar tidak rekursif ke profiles)
-- ------------------------------------------------------------
create or replace function public.auth_role()
returns public.user_role
language sql stable security definer set search_path = public
as $$ select role from public.profiles where id = auth.uid(); $$;

create or replace function public.auth_branch()
returns uuid
language sql stable security definer set search_path = public
as $$ select branch_id from public.profiles where id = auth.uid(); $$;

-- Role pusat dengan akses baca seluruh cabang
create or replace function public.is_central()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select role in ('direktur','manager_program','admin_pusat')
       from public.profiles where id = auth.uid()),
    false
  );
$$;

-- Apakah user adalah PIC (petugas) untuk order tertentu
create or replace function public.is_pic_of(p_order_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.schedules s
    where s.order_id = p_order_id and s.pic_user_id = auth.uid()
  );
$$;

-- Helper baca min_dp_ratio dari app_settings (default 0.5)
create or replace function public.min_dp_ratio()
returns numeric
language sql stable security definer set search_path = public
as $$
  select coalesce((select (value ->> 'ratio')::numeric
                     from public.app_settings where key = 'min_dp_ratio'), 0.5);
$$;

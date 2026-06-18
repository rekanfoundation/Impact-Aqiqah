import { createClient } from "@/lib/supabase/server";
import type {
  Branch,
  Location,
  Service,
  Order,
  Participant,
} from "@/types/db";
import type { Profile } from "@/types/auth";

// Query helpers (read). RLS membatasi hasil sesuai role/cabang (docs/05 §8).

export async function getBranches(): Promise<Branch[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("branches")
    .select("id, name, code, address, phone")
    .is("deleted_at", null)
    .order("name");
  return (data ?? []) as Branch[];
}

const SERVICE_COLS = "id, type, name, description, price, meta, is_active";

export async function getServices(): Promise<Service[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("services")
    .select(SERVICE_COLS)
    .eq("is_active", true)
    .is("deleted_at", null)
    .order("type")
    .order("price");
  return (data ?? []) as Service[];
}

/** Semua paket termasuk nonaktif — untuk editor. */
export async function getAllServices(): Promise<Service[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("services")
    .select(SERVICE_COLS)
    .is("deleted_at", null)
    .order("type")
    .order("price");
  return (data ?? []) as Service[];
}

export async function getServiceById(id: string): Promise<Service | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("services")
    .select(SERVICE_COLS)
    .eq("id", id)
    .single();
  return (data as Service) ?? null;
}

export async function getLocations(branchId?: string): Promise<Location[]> {
  const supabase = await createClient();
  let q = supabase
    .from("locations")
    .select("id, branch_id, name, address, lat, lng")
    .is("deleted_at", null)
    .order("name");
  if (branchId) q = q.eq("branch_id", branchId);
  const { data } = await q;
  return (data ?? []) as Location[];
}

export async function getPetugas(branchId?: string): Promise<Profile[]> {
  const supabase = await createClient();
  let q = supabase
    .from("profiles")
    .select("id, full_name, email, phone, role, branch_id, is_active")
    .eq("role", "petugas_lapangan")
    .eq("is_active", true)
    .order("full_name");
  if (branchId) q = q.eq("branch_id", branchId);
  const { data } = await q;
  return (data ?? []) as Profile[];
}

export interface OrderListRow extends Order {
  participant: Pick<Participant, "id" | "name" | "phone"> | null;
  branch: Pick<Branch, "id" | "name" | "code"> | null;
}

export interface OrderFilters {
  status?: string;
  branch_id?: string;
  payment_status?: string;
  q?: string;
}

export async function listOrders(filters: OrderFilters = {}): Promise<OrderListRow[]> {
  const supabase = await createClient();
  let q = supabase
    .from("orders")
    .select(
      "*, participant:participants(id,name,phone), branch:branches(id,name,code)",
    )
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);

  if (filters.status) q = q.eq("status", filters.status);
  if (filters.payment_status) q = q.eq("payment_status", filters.payment_status);
  if (filters.branch_id) q = q.eq("branch_id", filters.branch_id);
  if (filters.q) q = q.ilike("order_number", `%${filters.q}%`);

  const { data } = await q;
  return (data ?? []) as unknown as OrderListRow[];
}

export async function getOrderDetail(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select(
      `*,
       participant:participants(*),
       branch:branches(*),
       items:order_items(*, service:services(id,name,type)),
       animals:animals(*),
       payments:payments(*),
       schedule:schedules(*, location:locations(*), pic:profiles(id,full_name)),
       distributions:distributions(*),
       documentations:documentations(*),
       issues:issues(*)`,
    )
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error || !data) return null;
  return data as Record<string, unknown>;
}

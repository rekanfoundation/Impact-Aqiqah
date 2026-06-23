import { createClient } from "@/lib/supabase/server";
import { getSlaSettings } from "@/server/db/dashboard";
import type { OpenOrderRow } from "@/types/db";
import type { OrderStatus } from "@/lib/status";

// Advanced Monitoring (docs/09, Phase 2). Dihitung di query layer dari view/tabel
// ber-RLS (security_invoker) sehingga otomatis ter-scope per role/cabang — tanpa view baru.
// Semua fungsi resilient: error → kembalikan nilai kosong agar dashboard tak ikut gagal.

// ---------- SLA breaches ----------
export interface OverdueOrder {
  order_id: string;
  order_number: string;
  status: OrderStatus;
  branch_name: string | null;
  age_hours: number;
  bucket: "documentation" | "distribution" | "report";
}

export interface SlaBreaches {
  counts: { documentation: number; distribution: number; report: number };
  total: number;
  orders: OverdueOrder[]; // diurutkan umur desc, dibatasi
}

const SLA_BUCKET: Partial<Record<OrderStatus, OverdueOrder["bucket"]>> = {
  documentation: "documentation",
  distribution: "distribution",
  reporting: "report",
};

export async function getSlaBreaches(branchId?: string): Promise<SlaBreaches> {
  const empty: SlaBreaches = { counts: { documentation: 0, distribution: 0, report: 0 }, total: 0, orders: [] };
  try {
    const supabase = await createClient();
    const sla = await getSlaSettings();
    let q = supabase
      .from("orders")
      .select("id, order_number, status, updated_at, branch:branches(name)")
      .not("status", "in", "(completed,cancelled)")
      .limit(1000);
    if (branchId) q = q.eq("branch_id", branchId);
    const { data } = await q;

    const rows = (data ?? []) as unknown as Array<{
      id: string;
      order_number: string;
      status: OrderStatus;
      updated_at: string;
      branch: { name: string } | { name: string }[] | null;
    }>;

    const now = Date.now();
    const threshold = (b: OverdueOrder["bucket"]) =>
      b === "documentation" ? sla.documentation : b === "distribution" ? sla.distribution : sla.report;

    const orders: OverdueOrder[] = [];
    for (const r of rows) {
      const bucket = SLA_BUCKET[r.status];
      if (!bucket) continue;
      const age = Math.round((now - new Date(r.updated_at).getTime()) / 3_600_000);
      if (age > threshold(bucket)) {
        const branch = Array.isArray(r.branch) ? (r.branch[0]?.name ?? null) : (r.branch?.name ?? null);
        orders.push({ order_id: r.id, order_number: r.order_number, status: r.status, branch_name: branch, age_hours: age, bucket });
      }
    }
    orders.sort((a, b) => b.age_hours - a.age_hours);
    const counts = {
      documentation: orders.filter((o) => o.bucket === "documentation").length,
      distribution: orders.filter((o) => o.bucket === "distribution").length,
      report: orders.filter((o) => o.bucket === "report").length,
    };
    return { counts, total: orders.length, orders: orders.slice(0, 8) };
  } catch {
    return empty;
  }
}

// ---------- Officer (PIC) load ----------
export interface OfficerLoad {
  pic_name: string;
  open_orders: number;
  with_issues: number;
  max_age_hours: number;
}

export async function getOfficerLoad(): Promise<OfficerLoad[]> {
  try {
    const supabase = await createClient();
    // v_open_orders sudah ter-RLS (admin_cabang otomatis ke cabangnya).
    const { data } = await supabase.from("v_open_orders").select("*").limit(1000);
    const rows = (data ?? []) as OpenOrderRow[];

    const map = new Map<string, OfficerLoad>();
    for (const r of rows) {
      const name = r.pic_name ?? "(Belum ada PIC)";
      const cur = map.get(name) ?? { pic_name: name, open_orders: 0, with_issues: 0, max_age_hours: 0 };
      cur.open_orders += 1;
      if (r.open_issues > 0) cur.with_issues += 1;
      cur.max_age_hours = Math.max(cur.max_age_hours, r.age_hours);
      map.set(name, cur);
    }
    return [...map.values()].sort((a, b) => b.open_orders - a.open_orders).slice(0, 8);
  } catch {
    return [];
  }
}

// ---------- Trends (orders dibuat vs selesai per hari) ----------
export interface TrendDay {
  day: string; // YYYY-MM-DD (UTC)
  created: number;
  completed: number;
}

export async function getTrends(days = 14, branchId?: string): Promise<TrendDay[]> {
  // kerangka hari (UTC) agar selalu terisi walau 0
  const frame: TrendDay[] = [];
  const dayKeys: string[] = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
    const key = d.toISOString().slice(0, 10);
    dayKeys.push(key);
    frame.push({ day: key, created: 0, completed: 0 });
  }
  const idx = new Map(dayKeys.map((k, i) => [k, i]));
  const sinceISO = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - (days - 1))).toISOString();

  try {
    const supabase = await createClient();
    const createdQ = supabase.from("orders").select("created_at").gte("created_at", sinceISO).limit(5000);
    const completedQ = supabase
      .from("orders")
      .select("updated_at")
      .eq("status", "completed")
      .gte("updated_at", sinceISO)
      .limit(5000);
    const [cQ, dQ] = branchId
      ? [createdQ.eq("branch_id", branchId), completedQ.eq("branch_id", branchId)]
      : [createdQ, completedQ];
    const [{ data: created }, { data: completed }] = await Promise.all([cQ, dQ]);

    for (const r of (created ?? []) as Array<{ created_at: string }>) {
      const i = idx.get(r.created_at.slice(0, 10));
      if (i != null) frame[i].created += 1;
    }
    for (const r of (completed ?? []) as Array<{ updated_at: string }>) {
      const i = idx.get(r.updated_at.slice(0, 10));
      if (i != null) frame[i].completed += 1;
    }
  } catch {
    /* kembalikan frame kosong */
  }
  return frame;
}

// ---------- Alert feed (kendala terbuka) ----------
export interface AlertItem {
  id: string;
  title: string;
  severity: "low" | "medium" | "high";
  order_number: string | null;
  order_id: string | null;
  created_at: string;
}

export async function getAlertFeed(limit = 12): Promise<AlertItem[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("issues")
      .select("id, title, severity, created_at, order:orders(id, order_number)")
      .in("status", ["open", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(limit);

    const rows = (data ?? []) as unknown as Array<{
      id: string;
      title: string;
      severity: AlertItem["severity"];
      created_at: string;
      order: { id: string; order_number: string } | { id: string; order_number: string }[] | null;
    }>;

    return rows.map((r) => {
      const ord = Array.isArray(r.order) ? r.order[0] : r.order;
      return {
        id: r.id,
        title: r.title,
        severity: r.severity,
        order_number: ord?.order_number ?? null,
        order_id: ord?.id ?? null,
        created_at: r.created_at,
      };
    });
  } catch {
    return [];
  }
}

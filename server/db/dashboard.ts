import { createClient } from "@/lib/supabase/server";
import type { BranchKpiRow, OpenOrderRow } from "@/types/db";
import { DEFAULT_SLA, type SlaSettings } from "@/server/ai";

// Sumber data dashboard: views KPI (docs/05 §7, docs/09).

/**
 * Baca ambang SLA (jam) dari app_settings. Fallback ke DEFAULT_SLA bila baris hilang.
 * Dipakai Risk Detector untuk menandai order yang lewat SLA.
 */
export async function getSlaSettings(): Promise<SlaSettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("app_settings")
    .select("key, value")
    .in("key", ["sla_documentation_hours", "sla_distribution_hours", "sla_report_hours"]);

  const rows = (data ?? []) as Array<{ key: string; value: { hours?: number } | null }>;
  const hours = (key: string, fallback: number) =>
    rows.find((r) => r.key === key)?.value?.hours ?? fallback;

  return {
    documentation: hours("sla_documentation_hours", DEFAULT_SLA.documentation),
    distribution: hours("sla_distribution_hours", DEFAULT_SLA.distribution),
    report: hours("sla_report_hours", DEFAULT_SLA.report),
  };
}

export async function getBranchKpi(branchId?: string): Promise<BranchKpiRow[]> {
  const supabase = await createClient();
  let q = supabase.from("v_branch_kpi").select("*").order("branch_name");
  if (branchId) q = q.eq("branch_id", branchId);
  const { data } = await q;
  return (data ?? []) as BranchKpiRow[];
}

export async function getOpenOrders(limit = 50): Promise<OpenOrderRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("v_open_orders")
    .select("*")
    .limit(limit);
  return (data ?? []) as OpenOrderRow[];
}

export interface DashboardSummary {
  total_order: number;
  open_order: number;
  avg_progress_potong: number;
  avg_progress_distribusi: number;
  pct_documentation: number;
  pct_report: number;
}

export function summarize(rows: BranchKpiRow[]): DashboardSummary {
  if (rows.length === 0) {
    return {
      total_order: 0,
      open_order: 0,
      avg_progress_potong: 0,
      avg_progress_distribusi: 0,
      pct_documentation: 0,
      pct_report: 0,
    };
  }
  const total = rows.reduce((s, r) => s + r.total_order, 0);
  const open = rows.reduce((s, r) => s + r.open_order, 0);
  const avg = (sel: (r: BranchKpiRow) => number) =>
    Math.round(rows.reduce((s, r) => s + sel(r), 0) / rows.length);
  return {
    total_order: total,
    open_order: open,
    avg_progress_potong: avg((r) => r.avg_progress_potong),
    avg_progress_distribusi: avg((r) => r.avg_progress_distribusi),
    pct_documentation: avg((r) => r.pct_documentation),
    pct_report: avg((r) => r.pct_report),
  };
}

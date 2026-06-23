import type { BranchKpiRow, OpenOrderRow } from "@/types/db";
import type { DashboardSummary } from "@/server/db/dashboard";
import { ask, aiEnabled } from "@/server/ai/provider";

// AI Layer (docs/19) — 3 use case bernilai bisnis. Human-in-the-loop, data minimal
// (agregat/non-PII). Multi-provider fallback (Gemini→OpenRouter→Anthropic, lihat provider.ts).
// FALLBACK aman: tanpa key apa pun, kembalikan ringkasan template/heuristik, fitur inti tetap jalan.

export { aiEnabled };

// Instruksi format umum: rapi, paragraf + poin, tanpa tebal markdown.
const FORMAT = "Format jawaban rapi: paragraf ringkas; gunakan poin diawali tanda '-' bila perlu. JANGAN gunakan markdown tebal (tanda bintang ganda **).";

// ---------- SLA ----------
export interface SlaSettings {
  documentation: number; // jam
  distribution: number;
  report: number;
}

export const DEFAULT_SLA: SlaSettings = { documentation: 24, distribution: 24, report: 48 };

// ---------- 1) AI Executive Summary ----------
export async function executiveSummary(
  sum: DashboardSummary,
  branches: BranchKpiRow[],
  opts?: { highRiskCount?: number },
): Promise<{ text: string; ai: boolean }> {
  const laggard = [...branches].sort((a, b) => a.pct_documentation - b.pct_documentation)[0];
  const highRisk = opts?.highRiskCount ?? 0;

  const fallback =
    `Total ${sum.total_order} order, ${sum.open_order} belum selesai. ` +
    `Progres: potong ${sum.avg_progress_potong}%, distribusi ${sum.avg_progress_distribusi}%, ` +
    `dokumentasi ${sum.pct_documentation}%, laporan ${sum.pct_report}%.` +
    (laggard ? ` Cabang ${laggard.branch_name} paling tertinggal pada dokumentasi (${laggard.pct_documentation}%).` : "") +
    (highRisk > 0 ? ` ${highRisk} order berisiko tinggi perlu prioritas.` : "");

  const ai = await ask(
    "Anda analis operasional Zakat Sukses. Tulis analisis ringkas dalam Bahasa Indonesia: " +
      "satu paragraf kondisi umum, lalu 2-3 poin rekomendasi prioritas (gunakan tanda '-'). " +
      "Soroti cabang tertinggal, jumlah order belum selesai, dan order berisiko tinggi bila ada. " +
      "Hanya gunakan angka yang diberikan. " + FORMAT,
    JSON.stringify({ ringkasan: sum, cabang: branches, order_berisiko_tinggi: highRisk }),
    700,
  );

  return { text: ai ?? fallback, ai: !!ai };
}

// ---------- 2) AI Risk Detector ----------
export interface RiskItem {
  order_number: string;
  order_id: string;
  level: "low" | "medium" | "high";
  reason: string;
  overdue: boolean;
}

function slaThresholdFor(status: string, sla: SlaSettings): number | null {
  if (status === "documentation") return sla.documentation;
  if (status === "distribution") return sla.distribution;
  if (status === "reporting") return sla.report;
  return null;
}

export function detectRisks(open: OpenOrderRow[], sla: SlaSettings = DEFAULT_SLA): RiskItem[] {
  const rank = { high: 0, medium: 1, low: 2 } as const;
  return open
    .map((o) => {
      let score = 0;
      if (o.age_hours > 72) score += 2;
      else if (o.age_hours > 48) score += 1;
      if (o.open_issues > 0) score += o.max_severity === "high" ? 2 : 1;
      if (["documentation", "reporting"].includes(o.status)) score += 1;

      // sinyal SLA: bandingkan umur dengan ambang SLA sesuai status
      const threshold = slaThresholdFor(o.status, sla);
      const overdue = threshold != null && o.age_hours > threshold;
      if (overdue) score += 2;

      const level: RiskItem["level"] = score >= 3 ? "high" : score >= 2 ? "medium" : "low";
      const reasons: string[] = [];
      if (overdue && threshold != null) reasons.push(`lewat SLA (${o.age_hours}j > ${threshold}j)`);
      else if (o.age_hours > 48) reasons.push(`umur ${o.age_hours} jam`);
      if (o.open_issues > 0) reasons.push(`${o.open_issues} kendala`);
      reasons.push(`status ${o.status}`);

      return {
        order_number: o.order_number,
        order_id: o.order_id,
        level,
        reason: reasons.join(", "),
        overdue,
      };
    })
    .filter((r) => r.level !== "low")
    .sort((a, b) => rank[a.level] - rank[b.level]);
}

// Briefing prioritas (1 panggilan AI, agregat non-PII) di atas daftar risiko.
export async function riskBriefing(risks: RiskItem[]): Promise<{ text: string; ai: boolean }> {
  const high = risks.filter((r) => r.level === "high").length;
  const med = risks.filter((r) => r.level === "medium").length;

  if (risks.length === 0) {
    return { text: "Tidak ada order berisiko menonjol saat ini.", ai: false };
  }

  const fallback =
    `${high} order risiko tinggi & ${med} sedang. ` +
    `Prioritaskan order risiko tinggi (kendala terbuka & SLA terlewat) lebih dulu.`;

  const ai = await ask(
    "Anda supervisor operasional. Dari daftar order berisiko (angka & status, bukan data pribadi), " +
      "tulis 1-2 kalimat Bahasa Indonesia berisi prioritas tindakan konkret. Singkat & actionable. " + FORMAT,
    JSON.stringify(
      risks.slice(0, 15).map((r) => ({ order: r.order_number, level: r.level, reason: r.reason })),
    ),
    300,
  );

  return { text: ai ?? fallback, ai: !!ai };
}

// ---------- 3) AI Report Writer ----------
export async function reportNarrative(input: {
  participant: string | null;
  service: string;
  branch: string | null;
  animals_distributed: number;
  animals_total: number;
}): Promise<{ text: string; ai: boolean }> {
  const fallback =
    `Alhamdulillah, ibadah ${input.service} atas nama ${input.participant ?? "peserta"} ` +
    `telah dilaksanakan di ${input.branch ?? "lokasi yang ditentukan"}. ` +
    `Sebanyak ${input.animals_distributed} dari ${input.animals_total} hewan telah didistribusikan ` +
    `kepada penerima manfaat. Terima kasih atas kepercayaan Anda.`;

  const ai = await ask(
    "Tulis 2-3 kalimat narasi laporan ibadah yang hangat & sopan dalam Bahasa Indonesia. " +
      "Jangan mengklaim hal di luar data. Output siap dipakai (akan direview manusia). " + FORMAT,
    JSON.stringify(input),
  );

  return { text: ai ?? fallback, ai: !!ai };
}

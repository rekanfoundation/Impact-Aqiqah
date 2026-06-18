import Anthropic from "@anthropic-ai/sdk";
import type { BranchKpiRow, OpenOrderRow } from "@/types/db";
import type { DashboardSummary } from "@/server/db/dashboard";

// AI Layer (docs/19) — 3 use case bernilai bisnis. Human-in-the-loop, data minimal
// (agregat/non-PII). FALLBACK aman: tanpa API key, kembalikan ringkasan template/heuristik,
// fitur inti tetap jalan.

const KEY = process.env.ANTHROPIC_API_KEY;
const AI_ENABLED = !!KEY && !KEY.startsWith("PLACEHOLDER");
// Sonnet 4.6: keseimbangan biaya/kualitas untuk ringkasan rutin (docs/19 §6).
const MODEL = "claude-sonnet-4-6";

export function aiEnabled(): boolean {
  return AI_ENABLED;
}

async function ask(system: string, user: string): Promise<string | null> {
  if (!AI_ENABLED) return null;
  try {
    const client = new Anthropic({ apiKey: KEY });
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 500,
      system,
      messages: [{ role: "user", content: user }],
    });
    const block = msg.content.find((b) => b.type === "text");
    return block && "text" in block ? block.text : null;
  } catch {
    return null; // gagal AI tidak boleh menggagalkan fitur
  }
}

// ---------- 1) AI Executive Summary ----------
export async function executiveSummary(
  sum: DashboardSummary,
  branches: BranchKpiRow[],
): Promise<{ text: string; ai: boolean }> {
  const laggard = [...branches].sort((a, b) => a.pct_documentation - b.pct_documentation)[0];

  const fallback =
    `Total ${sum.total_order} order, ${sum.open_order} belum selesai. ` +
    `Progres: potong ${sum.avg_progress_potong}%, distribusi ${sum.avg_progress_distribusi}%, ` +
    `dokumentasi ${sum.pct_documentation}%, laporan ${sum.pct_report}%.` +
    (laggard ? ` Cabang ${laggard.branch_name} paling tertinggal pada dokumentasi (${laggard.pct_documentation}%).` : "");

  const ai = await ask(
    "Anda analis operasional Zakat Sukses. Ringkas KPI dalam 2-3 kalimat Bahasa Indonesia, " +
      "soroti cabang tertinggal & rekomendasi prioritas. Hanya gunakan angka yang diberikan.",
    JSON.stringify({ ringkasan: sum, cabang: branches }),
  );

  return { text: ai ?? fallback, ai: !!ai };
}

// ---------- 2) AI Risk Detector ----------
export interface RiskItem {
  order_number: string;
  order_id: string;
  level: "low" | "medium" | "high";
  reason: string;
}

export function detectRisks(open: OpenOrderRow[]): RiskItem[] {
  // Heuristik deterministik (tanpa AI): umur, kendala, status.
  return open
    .map((o) => {
      let score = 0;
      if (o.age_hours > 72) score += 2;
      else if (o.age_hours > 48) score += 1;
      if (o.open_issues > 0) score += o.max_severity === "high" ? 2 : 1;
      if (["documentation", "reporting"].includes(o.status)) score += 1;
      const level: RiskItem["level"] = score >= 3 ? "high" : score >= 2 ? "medium" : "low";
      const reasons: string[] = [];
      if (o.age_hours > 48) reasons.push(`umur ${o.age_hours} jam`);
      if (o.open_issues > 0) reasons.push(`${o.open_issues} kendala`);
      reasons.push(`status ${o.status}`);
      return {
        order_number: o.order_number,
        order_id: o.order_id,
        level,
        reason: reasons.join(", "),
      };
    })
    .filter((r) => r.level !== "low")
    .sort((a, b) => (a.level === "high" ? -1 : 1) - (b.level === "high" ? -1 : 1));
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
      "Jangan mengklaim hal di luar data. Output siap dipakai (akan direview manusia).",
    JSON.stringify(input),
  );

  return { text: ai ?? fallback, ai: !!ai };
}

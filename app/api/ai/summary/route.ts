import { NextResponse } from "next/server";
import { requireProfile } from "@/server/auth/session";
import { getBranchKpi, getOpenOrders, getSlaSettings, summarize } from "@/server/db/dashboard";
import { executiveSummary, detectRisks, riskBriefing, aiEnabled } from "@/server/ai";
import { isCentralRole } from "@/types/auth";

export const runtime = "nodejs";

/**
 * GET /api/ai/summary — AI Executive Summary + Risk Detector (docs/19).
 * Hanya role pusat. Data agregat (non-PII). Fallback aman bila AI nonaktif.
 */
export async function GET() {
  const profile = await requireProfile();
  if (!isCentralRole(profile.role)) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Khusus role pusat" } },
      { status: 403 },
    );
  }

  const [kpi, open, sla] = await Promise.all([getBranchKpi(), getOpenOrders(50), getSlaSettings()]);
  const risks = detectRisks(open, sla);
  const highRiskCount = risks.filter((r) => r.level === "high").length;
  const [summary, briefing] = await Promise.all([
    executiveSummary(summarize(kpi), kpi, { highRiskCount }),
    riskBriefing(risks),
  ]);

  return NextResponse.json({
    data: {
      summary: summary.text,
      ai: summary.ai,
      aiEnabled: aiEnabled(),
      risks,
      briefing: briefing.text,
      briefingAi: briefing.ai,
    },
  });
}

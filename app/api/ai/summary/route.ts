import { NextResponse } from "next/server";
import { requireProfile } from "@/server/auth/session";
import { getBranchKpi, getOpenOrders, summarize } from "@/server/db/dashboard";
import { executiveSummary, detectRisks, aiEnabled } from "@/server/ai";
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

  const [kpi, open] = await Promise.all([getBranchKpi(), getOpenOrders(50)]);
  const summary = await executiveSummary(summarize(kpi), kpi);
  const risks = detectRisks(open);

  return NextResponse.json({
    data: { summary: summary.text, ai: summary.ai, aiEnabled: aiEnabled(), risks },
  });
}

import { NextResponse } from "next/server";
import { draftReportNarrative } from "@/server/services/report/generate";
import { requireProfile } from "@/server/auth/session";

export const runtime = "nodejs";

/**
 * POST /api/orders/{id}/report/narrative — draf narasi laporan (AI Report Writer, docs/19 §4).
 * Tidak menghasilkan PDF; hasilnya ditinjau/diedit manusia sebelum generate laporan final.
 * Akses: manager_program / admin_pusat / admin_cabang.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const profile = await requireProfile();
  if (!["manager_program", "admin_pusat", "admin_cabang"].includes(profile.role)) {
    return NextResponse.json(
      { error: { code: "FORBIDDEN", message: "Tidak berwenang" } },
      { status: 403 },
    );
  }

  const { id } = await params;
  const result = await draftReportNarrative(id);
  if (!result.ok) {
    return NextResponse.json(
      { error: { code: "DRAFT_FAILED", message: result.error } },
      { status: 422 },
    );
  }
  return NextResponse.json({ data: { text: result.text, ai: result.ai } });
}

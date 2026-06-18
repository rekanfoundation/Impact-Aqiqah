import { NextResponse } from "next/server";
import { generateReport } from "@/server/services/report/generate";
import { requireProfile } from "@/server/auth/session";

export const runtime = "nodejs";

/**
 * POST /api/orders/{id}/report — generate PDF laporan (docs/16 §8).
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
  const result = await generateReport(id);
  if (!result.ok) {
    return NextResponse.json(
      { error: { code: "REPORT_FAILED", message: result.error } },
      { status: 422 },
    );
  }
  return NextResponse.json({ data: { token: result.token } });
}

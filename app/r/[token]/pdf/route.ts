import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET } from "@/lib/storage";

export const runtime = "nodejs";

/**
 * GET /r/{token}/pdf — redirect ke signed URL PDF laporan terbaru (docs/11).
 * Akses publik bertoken; PDF di bucket privat, hanya path tervalidasi yang ditandatangani.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const supabase = await createClient();
  const { data } = await supabase.rpc("get_public_report", { p_token: token });
  const pdfPath = (data as { report?: { pdf_path?: string } } | null)?.report?.pdf_path;

  if (!pdfPath) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Laporan belum tersedia" } },
      { status: 404 },
    );
  }

  const admin = createAdminClient();
  const { data: signed, error } = await admin.storage
    .from(BUCKET.reports)
    .createSignedUrl(pdfPath, 300);

  if (error || !signed) {
    return NextResponse.json(
      { error: { code: "SIGN_FAILED", message: "Gagal membuat tautan unduh" } },
      { status: 500 },
    );
  }

  return NextResponse.redirect(signed.signedUrl);
}

import { NextResponse } from "next/server";
import { getProfile } from "@/server/auth/session";

/**
 * GET /api/me — profil + role pengguna saat ini (docs/16 §2).
 * Exit criteria Tahap 2: mengembalikan profil+role untuk sesi valid.
 */
export async function GET() {
  const profile = await getProfile();

  if (!profile) {
    return NextResponse.json(
      { error: { code: "UNAUTHENTICATED", message: "Tidak ada sesi aktif." } },
      { status: 401 },
    );
  }

  return NextResponse.json({ data: profile });
}

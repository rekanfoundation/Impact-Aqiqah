import { createClient } from "@supabase/supabase-js";

/**
 * Supabase admin client (service role) — HANYA server-side.
 * Melewati RLS, jadi pemakaian wajib ter-scope ketat:
 *  - menandatangani signed URL media yang sudah disaring via RPC bertoken (docs/11),
 *  - mengunggah PDF laporan ke bucket privat,
 *  - dipanggil otomatisasi internal (n8n) bila perlu.
 * JANGAN pernah diekspos ke klien.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

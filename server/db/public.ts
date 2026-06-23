import { createClient } from "@/lib/supabase/server";
import type { Service } from "@/types/db";

/**
 * Paket untuk landing page (publik, tanpa login) via RPC SECURITY DEFINER.
 * Hanya paket aktif & field marketing.
 */
export async function getPublicPackages(): Promise<Service[]> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_public_packages");
  return ((data as Service[] | null) ?? []) as Service[];
}

/** Satu paket publik by slug (untuk halaman /{slug}). Null bila tak ada/nonaktif. */
export async function getServiceBySlug(slug: string): Promise<Service | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.rpc("get_public_package", { p_slug: slug });
    return (data as Service | null) ?? null;
  } catch {
    return null;
  }
}

export function splitPackages(all: Service[]) {
  return {
    kambing: all.filter((s) => s.type === "aqiqah"),
    nasiBox: all.filter((s) => s.type === "nasi_box"),
  };
}

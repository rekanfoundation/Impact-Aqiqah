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

export function splitPackages(all: Service[]) {
  return {
    kambing: all.filter((s) => s.type === "aqiqah"),
    nasiBox: all.filter((s) => s.type === "nasi_box"),
  };
}

import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_LANDING_MEDIA,
  groupLandingMedia,
  type LandingMedia,
  type LandingMediaItem,
} from "@/lib/landing-media-defaults";

/**
 * Media landing untuk frontend (publik). Baca via RPC get_landing_media (anon, SECURITY DEFINER).
 * Resilient: bila tabel/RPC belum ada (migrasi 23 belum di-apply) atau kosong → pakai DEFAULT
 * (URL yang diberikan) sehingga landing tetap tampil benar.
 */
export async function getLandingMedia(): Promise<LandingMedia> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_landing_media");
    const rows = (data ?? []) as LandingMediaItem[];
    if (error || rows.length === 0) return DEFAULT_LANDING_MEDIA;
    return groupLandingMedia(rows);
  } catch {
    return DEFAULT_LANDING_MEDIA;
  }
}

/** Semua media (termasuk tersembunyi) untuk CMS admin. RLS membatasi ke manager_program. */
export async function getAllLandingMedia(): Promise<LandingMediaItem[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("landing_media")
      .select("*")
      .order("section")
      .order("sort_order");
    return (data ?? []) as LandingMediaItem[];
  } catch {
    return [];
  }
}

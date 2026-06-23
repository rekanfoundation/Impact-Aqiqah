import { createClient } from "@/lib/supabase/server";

export interface MapPoint {
  lat: number;
  lng: number;
  label: string;
  weight: number;
  area: string | null;
}
export interface SlaughterPoint {
  lat: number;
  lng: number;
  name: string;
}
export interface AreaRecap {
  area: string;
  points: number;
  packages: number;
}
export interface DistributionMapData {
  slaughter: SlaughterPoint[];
  points: MapPoint[];
  recap: AreaRecap[];
  totals: { points: number; packages: number; areas: number; slaughter: number };
  center: { lat: number; lng: number };
}

const DEFAULT_CENTER = { lat: -6.9, lng: 107.6 }; // Bandung

/**
 * Data peta Distribution Intelligence (RLS-scoped). Titik potong (locations) +
 * titik distribusi (distributions) berkoordinat + rekap per area. Resilient.
 */
export async function getDistributionMap(): Promise<DistributionMapData> {
  const empty: DistributionMapData = {
    slaughter: [],
    points: [],
    recap: [],
    totals: { points: 0, packages: 0, areas: 0, slaughter: 0 },
    center: DEFAULT_CENTER,
  };
  try {
    const supabase = await createClient();
    const [{ data: locs }, { data: dists }] = await Promise.all([
      supabase.from("locations").select("name, lat, lng").not("lat", "is", null).is("deleted_at", null),
      supabase
        .from("distributions")
        .select("recipient_name, recipient_area, packages_count, lat, lng")
        .not("lat", "is", null),
    ]);

    const slaughter: SlaughterPoint[] = ((locs ?? []) as Array<{ name: string; lat: number; lng: number }>).map((l) => ({
      lat: Number(l.lat),
      lng: Number(l.lng),
      name: l.name,
    }));

    const distRows = (dists ?? []) as Array<{
      recipient_name: string | null;
      recipient_area: string | null;
      packages_count: number;
      lat: number;
      lng: number;
    }>;
    const points: MapPoint[] = distRows.map((d) => ({
      lat: Number(d.lat),
      lng: Number(d.lng),
      label: d.recipient_name ?? d.recipient_area ?? "Distribusi",
      weight: Math.max(1, d.packages_count || 1),
      area: d.recipient_area,
    }));

    const byArea = new Map<string, AreaRecap>();
    for (const d of distRows) {
      const area = d.recipient_area ?? "(Tanpa area)";
      const cur = byArea.get(area) ?? { area, points: 0, packages: 0 };
      cur.points += 1;
      cur.packages += d.packages_count || 0;
      byArea.set(area, cur);
    }
    const recap = [...byArea.values()].sort((a, b) => b.packages - a.packages);

    // center = rata-rata semua titik (atau default)
    const all = [...slaughter, ...points];
    const center = all.length
      ? { lat: all.reduce((s, p) => s + p.lat, 0) / all.length, lng: all.reduce((s, p) => s + p.lng, 0) / all.length }
      : DEFAULT_CENTER;

    return {
      slaughter,
      points,
      recap,
      totals: {
        points: points.length,
        packages: points.reduce((s, p) => s + p.weight, 0),
        areas: recap.length,
        slaughter: slaughter.length,
      },
      center,
    };
  } catch {
    return empty;
  }
}

import type { ServiceType, Service } from "@/types/db";

export const SERVICE_TYPE_LABEL: Record<ServiceType, string> = {
  aqiqah: "Aqiqah",
  qurban: "Qurban",
  sedekah_daging: "Sedekah Daging",
  nasi_box: "Nasi Box",
};

export const SERVICE_TYPES: ServiceType[] = [
  "aqiqah",
  "qurban",
  "sedekah_daging",
  "nasi_box",
];

/** Ringkasan "hasil" paket kambing untuk ditampilkan. */
export function hasilSummary(s: Service): string | null {
  const h = s.meta?.hasil;
  if (!h) return null;
  const parts: string[] = [];
  if (h.sate_tusuk) parts.push(`${h.sate_tusuk} tusuk sate`);
  if (h.olahan_porsi) parts.push(`${h.olahan_porsi} porsi olahan`);
  if (h.semur_porsi) parts.push(`${h.semur_porsi} semur/rendang`);
  if (h.gulai_porsi) parts.push(`${h.gulai_porsi} gulai/sop`);
  return parts.length ? parts.join(" · ") : null;
}

/** Daftar isi nasi box. */
export function nasiBoxItems(s: Service): string[] {
  return Array.isArray(s.meta?.items) ? (s.meta.items as string[]) : [];
}

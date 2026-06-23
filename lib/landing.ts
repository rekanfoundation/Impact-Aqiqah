import { buildWaLink } from "@/lib/wa";

export const WA_NUMBER = process.env.NEXT_PUBLIC_WA_NUMBER || "6281234567890";

export function waUrl(text: string): string {
  return buildWaLink(WA_NUMBER, text);
}

// WA hanya untuk konsultasi/bantuan. Pemesanan & pembayaran lewat sistem (checkout website).
export const WA_DEFAULT_TEXT =
  "Halo ImpactAqiqah, saya ingin berkonsultasi tentang layanan aqiqah.";

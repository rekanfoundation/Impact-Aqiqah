import { buildWaLink } from "@/lib/wa";
import { whatsappNumber } from "@/lib/site";

// docs/27: utamakan NEXT_PUBLIC_WHATSAPP_NUMBER, fallback NEXT_PUBLIC_WA_NUMBER.
export const WA_NUMBER = whatsappNumber();

export function waUrl(text: string): string {
  return buildWaLink(WA_NUMBER, text);
}

// WA hanya untuk konsultasi/bantuan. Pemesanan & pembayaran lewat sistem (checkout website).
export const WA_DEFAULT_TEXT =
  "Halo ImpactAqiqah, saya ingin berkonsultasi tentang layanan aqiqah.";

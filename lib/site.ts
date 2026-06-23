// Identitas & kontak situs (docs/27). TANPA hardcode — dari env, dengan default aman.
// Opsional override dari CMS (app_settings.site_contact) ditangani di server/db/cms.ts.

export const SITE_NAME = "ImpactAqiqah";
export const SITE_TAGLINE = "Tunaikan Ibadah, Tebarkan Manfaat";
export const SITE_DESCRIPTION =
  "Layanan aqiqah, qurban & sedekah daging profesional dan syar'i: pemilihan hewan, penyembelihan, masak higienis, distribusi, hingga laporan.";

export function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

/** Nomor WhatsApp resmi. docs/27 minta NEXT_PUBLIC_WHATSAPP_NUMBER; fallback ke NEXT_PUBLIC_WA_NUMBER. */
export function whatsappNumber(): string {
  return (
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ||
    process.env.NEXT_PUBLIC_WA_NUMBER ||
    "6281234567890"
  );
}

/** URL Instagram. Default @zakatsukses bila env kosong. */
export function instagramUrl(): string {
  const v = process.env.NEXT_PUBLIC_INSTAGRAM_URL;
  if (v && v.trim()) return v.trim();
  return "https://instagram.com/zakatsukses";
}

export function instagramHandle(url: string): string {
  const m = url.replace(/\/+$/, "").match(/instagram\.com\/(@?[^/?#]+)/i);
  const handle = m?.[1] ?? "zakatsukses";
  return handle.startsWith("@") ? handle : "@" + handle;
}

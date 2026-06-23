// Default media landing (sumber seed DB & fallback bila tabel landing_media belum ada).
// CATATAN: ini BUKAN di komponen frontend — komponen membaca dari getLandingMedia().
// Setelah migrasi 23 + seed, baris DB mengambil alih dan dikelola Super Admin via CMS.

export type LandingSection =
  | "hero"
  | "gallery"
  | "kambing"
  | "olahan"
  | "nasi_box"
  | "sertifikat"
  | "partner";

export interface LandingMediaItem {
  id?: string;
  section: LandingSection;
  url: string;
  alt: string;
  caption?: string | null;
  link_url?: string | null;
  sort_order: number;
  is_visible: boolean;
}

export interface LandingMedia {
  hero: LandingMediaItem | null;
  gallery: LandingMediaItem[];
  kambing: LandingMediaItem | null;
  olahan: LandingMediaItem | null;
  nasiBox: LandingMediaItem | null;
  sertifikat: LandingMediaItem | null;
  partners: LandingMediaItem[];
}

const m = (
  section: LandingSection,
  url: string,
  alt: string,
  sort_order = 0,
  link_url: string | null = null,
): LandingMediaItem => ({ section, url, alt, sort_order, link_url, is_visible: true });

export const DEFAULT_LANDING_MEDIA_FLAT: LandingMediaItem[] = [
  m("hero", "https://zakatsukses.org/wp-content/uploads/2023/06/WhatsApp_Image_2023-06-12_at_12.54.29_PM_2-1024x683.jpeg", "Aqiqah ImpactAqiqah"),

  m("gallery", "https://zakatsukses.org/wp-content/uploads/2025/06/WhatsApp-Image-2025-06-17-at-09.41.08-2-1024x683.jpeg", "Dokumentasi aqiqah 1", 1),
  m("gallery", "https://zakatsukses.org/wp-content/uploads/2025/06/WhatsApp-Image-2025-06-17-at-11.59.48-2048x1366.jpeg", "Dokumentasi aqiqah 2", 2),
  m("gallery", "https://zakatsukses.org/wp-content/uploads/2025/06/WhatsApp-Image-2025-06-17-at-11.59.49-2048x1366.jpeg", "Dokumentasi aqiqah 3", 3),
  m("gallery", "https://zakatsukses.org/wp-content/uploads/2025/06/WhatsApp-Image-2025-06-17-at-09.41.08-2048x1366.jpeg", "Dokumentasi aqiqah 4", 4),
  m("gallery", "https://zakatsukses.org/wp-content/uploads/2025/06/WhatsApp-Image-2025-06-17-at-09.41.08-1-2048x1366.jpeg", "Dokumentasi aqiqah 5", 5),
  m("gallery", "https://zakatsukses.org/wp-content/uploads/2024/07/IMG_7388-1024x768.jpg", "Dokumentasi aqiqah 6", 6),

  m("kambing", "https://zakatsukses.org/wp-content/uploads/2025/06/WhatsApp-Image-2025-06-11-at-10.32.02-2-2048x1366.jpeg", "Kambing aqiqah sehat & syar'i"),
  m("olahan", "https://waladaqiqah.com/wp-content/uploads/2024/09/Olahan-Kambing-Untuk-Aqiqah.webp", "Olahan kambing untuk aqiqah"),
  m("nasi_box", "https://res.cloudinary.com/dyjxgprna/image/upload/q_auto/f_auto/v1782127273/Olahan_Aqiqah_nasi_box_awui8a.png", "Paket nasi box aqiqah"),
  m("sertifikat", "https://res.cloudinary.com/dyjxgprna/image/upload/q_auto/f_auto/v1782126850/SERTIFIKAT_AQIQAH_puntvm.png", "Sertifikat aqiqah"),

  m("partner", "https://zakatsukses.org/wp-content/uploads/2024/04/Logo-ZS-High-Res-768x620.png", "Zakat Sukses", 1, "https://zakatsukses.org"),
  m("partner", "https://res.cloudinary.com/dyjxgprna/image/upload/q_auto/f_auto/v1782127349/logo_link_aja_fq4lfi.webp", "LinkAja", 2, "https://www.linkaja.id"),
];

/** Susun flat list menjadi struktur per-section yang dipakai landing. */
export function groupLandingMedia(items: LandingMediaItem[]): LandingMedia {
  const visible = items.filter((i) => i.is_visible);
  const bySection = (s: LandingSection) =>
    visible.filter((i) => i.section === s).sort((a, b) => a.sort_order - b.sort_order);
  const first = (s: LandingSection) => bySection(s)[0] ?? null;
  return {
    hero: first("hero"),
    gallery: bySection("gallery"),
    kambing: first("kambing"),
    olahan: first("olahan"),
    nasiBox: first("nasi_box"),
    sertifikat: first("sertifikat"),
    partners: bySection("partner"),
  };
}

export const DEFAULT_LANDING_MEDIA: LandingMedia = groupLandingMedia(DEFAULT_LANDING_MEDIA_FLAT);

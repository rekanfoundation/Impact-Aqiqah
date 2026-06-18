import type { UserRole } from "@/types/auth";

export interface NavItem {
  href: string;
  label: string;
  /** Emoji glyph ringan untuk bottom-nav mobile. */
  glyph: string;
  roles: UserRole[];
  /** Tampilkan di bottom-nav mobile (petugas). */
  mobile?: boolean;
}

const ALL: UserRole[] = [
  "direktur",
  "manager_program",
  "admin_pusat",
  "admin_cabang",
  "petugas_lapangan",
];

// Navigasi & akses per role — selaras docs/15 §3.
export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", glyph: "📊", roles: ALL, mobile: true },
  {
    href: "/orders",
    label: "Order",
    glyph: "📦",
    roles: ["direktur", "manager_program", "admin_pusat", "admin_cabang", "petugas_lapangan"],
    mobile: true,
  },
  {
    href: "/petugas/tugas",
    label: "Tugas Saya",
    glyph: "✅",
    roles: ["petugas_lapangan"],
    mobile: true,
  },
  {
    href: "/documentation",
    label: "Dokumentasi",
    glyph: "🖼️",
    roles: ["manager_program", "admin_pusat", "admin_cabang"],
    mobile: true,
  },
  {
    href: "/payments",
    label: "Pembayaran",
    glyph: "💳",
    roles: ["manager_program", "admin_cabang"],
  },
  {
    href: "/reports",
    label: "Laporan",
    glyph: "📄",
    roles: ["direktur", "manager_program", "admin_pusat", "admin_cabang"],
  },
  {
    href: "/issues",
    label: "Kendala",
    glyph: "⚠️",
    roles: ["direktur", "manager_program", "admin_pusat", "admin_cabang", "petugas_lapangan"],
  },
  {
    href: "/locations",
    label: "Lokasi",
    glyph: "📍",
    roles: ["manager_program", "admin_cabang"],
  },
  {
    href: "/programs",
    label: "Program",
    glyph: "🗂️",
    roles: ["manager_program"],
  },
  {
    href: "/petugas",
    label: "Petugas",
    glyph: "👥",
    roles: ["manager_program", "admin_cabang"],
  },
  { href: "/settings", label: "Pengaturan", glyph: "⚙️", roles: ALL },
];

export function navForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export function mobileNavForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.mobile && item.roles.includes(role)).slice(0, 4);
}

export function canAccessPath(role: UserRole, pathname: string): boolean {
  const item = NAV_ITEMS.find(
    (i) => pathname === i.href || pathname.startsWith(i.href + "/"),
  );
  if (!item) return true; // path tak terdaftar (mis. detail) — dijaga di server action/RLS
  return item.roles.includes(role);
}

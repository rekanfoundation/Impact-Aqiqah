// Tipe peran & profil — selaras docs/07_USER_ROLES & enum user_role (docs/05)

export type UserRole =
  | "direktur"
  | "manager_program"
  | "admin_pusat"
  | "admin_cabang"
  | "petugas_lapangan"
  | "user";

export interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: UserRole;
  branch_id: string | null;
  is_active: boolean;
}

// Role dengan akses lintas cabang (pusat) — docs/07 §6
export const CENTRAL_ROLES: UserRole[] = [
  "direktur",
  "manager_program",
  "admin_pusat",
];

export function isCentralRole(role: UserRole): boolean {
  return CENTRAL_ROLES.includes(role);
}

// Label tampilan (Bahasa Indonesia)
export const ROLE_LABELS: Record<UserRole, string> = {
  direktur: "Direktur",
  manager_program: "Manager Program",
  admin_pusat: "Admin Pusat",
  admin_cabang: "Admin Cabang",
  petugas_lapangan: "Petugas Lapangan",
  user: "Customer",
};

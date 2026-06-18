import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/types/auth";

/**
 * Helper sesi & RBAC server-side (docs/07 §5 — defense in depth).
 * RLS tetap menjadi penegak utama di level data (docs/05 §8).
 */

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, email, phone, role, branch_id, is_active")
    .eq("id", user.id)
    .single();

  if (error || !data) return null;
  return data as Profile;
}

/** Tujuan setelah login berdasarkan role (customer → /akun, internal → dashboard). */
export function postLoginPath(role: string | undefined, redirectTo?: string): string {
  if (role === "user") return "/akun";
  if (redirectTo && redirectTo.startsWith("/") && redirectTo !== "/login")
    return redirectTo;
  return "/dashboard";
}

/** Wajib login sebagai customer (role 'user'). */
export async function requireCustomer(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login?redirect=/akun");
  return profile;
}

/** Wajib login — kalau tidak, redirect ke /login. */
export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** Wajib login + profil aktif. */
export async function requireProfile(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (!profile.is_active) redirect("/login?error=inactive");
  return profile;
}

/** Wajib salah satu role tertentu — kalau tidak, ke /dashboard (403 friendly). */
export async function requireRole(roles: UserRole[]): Promise<Profile> {
  const profile = await requireProfile();
  if (!roles.includes(profile.role)) {
    redirect("/forbidden");
  }
  return profile;
}

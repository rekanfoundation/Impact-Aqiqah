import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/auth";

export interface ProfileFilter {
  role?: string;
  branch_id?: string;
  q?: string;
}

/** Semua profil (semua role) untuk panel Super Admin. RLS: manager_program melihat semua. */
export async function getAllProfiles(filter: ProfileFilter = {}): Promise<Profile[]> {
  const supabase = await createClient();
  let q = supabase
    .from("profiles")
    .select("id, full_name, email, phone, role, branch_id, is_active")
    .order("role")
    .order("full_name")
    .limit(500);
  if (filter.role) q = q.eq("role", filter.role);
  if (filter.branch_id) q = q.eq("branch_id", filter.branch_id);
  if (filter.q) q = q.or(`full_name.ilike.%${filter.q}%,email.ilike.%${filter.q}%`);
  const { data } = await q;
  return (data ?? []) as Profile[];
}

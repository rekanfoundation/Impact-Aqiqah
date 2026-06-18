"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { postLoginPath } from "@/server/auth/session";

export type LoginState = { error?: string } | undefined;

/** Server Action: login email + password (Supabase Auth). Routing per role. */
export async function signIn(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirect") ?? "");

  if (!email || !password) {
    return { error: "Email dan password wajib diisi." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { error: "Email atau password salah." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .single();

  redirect(
    postLoginPath((profile as { role?: string } | null)?.role, redirectTo),
  );
}

/** Server Action: logout. */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

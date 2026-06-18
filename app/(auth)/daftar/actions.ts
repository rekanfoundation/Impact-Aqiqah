"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { upsertContact } from "@/lib/brevo";

export type RegisterState = { error?: string; info?: string } | undefined;

/** Server Action: registrasi customer (role 'user'). */
export async function signUp(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const paket = String(formData.get("paket") ?? "");

  if (!fullName || !email || !password) {
    return { error: "Nama, email, dan password wajib diisi." };
  }
  if (password.length < 6) {
    return { error: "Password minimal 6 karakter." };
  }

  const refCode = (await cookies()).get("ia_ref")?.value ?? "";

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, role: "user", ref: refCode } },
  });

  if (error) {
    return { error: error.message };
  }

  // Sinkron kontak ke Brevo (marketing). Aman: no-op bila key kosong.
  await upsertContact({
    email,
    attributes: { FIRSTNAME: fullName, SOURCE: "signup" },
  });

  // Bila konfirmasi email aktif, belum ada sesi.
  if (!data.session) {
    return {
      info: "Akun dibuat. Silakan cek email untuk verifikasi, lalu masuk.",
    };
  }

  // Sesi aktif → lanjut. Jika memilih paket dari landing, ke halaman pesan.
  const ref = (await cookies()).get("ia_ref")?.value;
  const next = paket
    ? `/akun/pesan?paket=${paket}${ref ? `&ref=${ref}` : ""}`
    : "/akun";
  redirect(next);
}

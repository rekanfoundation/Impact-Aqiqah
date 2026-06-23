"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/server/auth/session";
import { sendTransactionalEmail } from "@/lib/brevo";
import { enqueueNotifications } from "@/server/services/notifications/enqueue";
import type { UserRole } from "@/types/auth";

export type ActionState = { ok: boolean; error?: string; count?: number };
const ok = (count?: number): ActionState => ({ ok: true, count });
const fail = (error: string): ActionState => ({ ok: false, error });

const ROLES: UserRole[] = ["direktur", "manager_program", "admin_pusat", "admin_cabang", "petugas_lapangan", "user"];

/** Tambah akun (internal/customer) via Admin API + kirim magic link untuk masuk. */
export async function createUserAction(input: {
  email: string;
  full_name: string;
  role: UserRole;
  branch_id?: string | null;
  phone?: string;
}): Promise<ActionState> {
  await requireRole(["manager_program"]);
  if (!input.email) return fail("Email wajib diisi");
  if (!ROLES.includes(input.role)) return fail("Role tidak valid");

  const admin = createAdminClient();
  const { data: created, error } = await admin.auth.admin.createUser({
    email: input.email,
    email_confirm: true,
    user_metadata: { full_name: input.full_name, role: input.role },
  });
  if (error || !created?.user) return fail(error?.message ?? "Gagal membuat akun");

  // set role/branch/phone (trigger sudah membuat profil dgn role dari metadata)
  await admin
    .from("profiles")
    .update({
      role: input.role,
      branch_id: input.branch_id || null,
      full_name: input.full_name || null,
      phone: input.phone || null,
    })
    .eq("id", created.user.id);

  // magic link login (aman bila Brevo nonaktif)
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const dest = input.role === "user" ? "/akun" : "/dashboard";
    const { data: link } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: input.email,
      options: { redirectTo: `${appUrl}${dest}` },
    });
    const action = (link as { properties?: { action_link?: string } } | null)?.properties?.action_link;
    if (action) {
      await sendTransactionalEmail({
        to: input.email,
        name: input.full_name,
        subject: "Akun ImpactAqiqah Anda",
        html: `<p>Akun Anda telah dibuat. Klik untuk masuk & atur kata sandi:</p><p><a href="${action}">Masuk ke ImpactAqiqah</a></p>`,
      });
    }
  } catch {
    /* abaikan */
  }

  revalidatePath("/users");
  return ok();
}

export async function updateUserAction(
  id: string,
  input: { full_name?: string; phone?: string; role?: UserRole; branch_id?: string | null },
): Promise<ActionState> {
  await requireRole(["manager_program"]);
  if (!id) return fail("ID tidak valid");
  if (input.role && !ROLES.includes(input.role)) return fail("Role tidak valid");

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: input.full_name ?? null,
      phone: input.phone || null,
      ...(input.role ? { role: input.role } : {}),
      branch_id: input.branch_id || null,
    })
    .eq("id", id);
  if (error) return fail(error.message);

  revalidatePath("/users");
  return ok();
}

/** Soft-ban: nonaktifkan akun (diblok di requireProfile). */
export async function toggleUserActiveAction(id: string, active: boolean): Promise<ActionState> {
  await requireRole(["manager_program"]);
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ is_active: !active }).eq("id", id);
  if (error) return fail(error.message);
  revalidatePath("/users");
  return ok();
}

type Audience = "user" | "admin_cabang" | "internal" | "all";

/** Broadcast info/promo via Email (Brevo) + catat notifikasi dashboard. */
export async function broadcastAction(input: {
  audience: Audience;
  subject: string;
  message: string;
}): Promise<ActionState> {
  await requireRole(["manager_program"]);
  if (!input.subject || !input.message) return fail("Subjek & pesan wajib diisi");

  const admin = createAdminClient();
  let q = admin.from("profiles").select("id, email, full_name, role").eq("is_active", true);
  if (input.audience === "user") q = q.eq("role", "user");
  else if (input.audience === "admin_cabang") q = q.eq("role", "admin_cabang");
  else if (input.audience === "internal") q = q.neq("role", "user");
  // "all" → tanpa filter role

  const { data } = await q.limit(2000);
  const rows = (data ?? []) as Array<{ id: string; email: string | null; full_name: string | null }>;
  if (rows.length === 0) return fail("Tidak ada penerima untuk audiens ini");

  const html = `<div>${input.message.replace(/\n/g, "<br>")}</div><p style="font-size:12px;color:#888">— ImpactAqiqah · Zakat Sukses</p>`;
  let sent = 0;
  for (const r of rows) {
    if (!r.email) continue;
    const okMail = await sendTransactionalEmail({ to: r.email, name: r.full_name ?? undefined, subject: input.subject, html });
    if (okMail) sent++;
  }

  // catat notifikasi dashboard (outbox) untuk jejak
  try {
    await enqueueNotifications(
      rows.map((r) => ({
        channel: "dashboard" as const,
        target: r.id,
        payload: { kind: "broadcast", subject: input.subject, message: input.message },
      })),
    );
  } catch {
    /* abaikan */
  }

  revalidatePath("/users");
  return ok(sent);
}

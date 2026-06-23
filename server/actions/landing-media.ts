"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/server/auth/session";
import { BUCKET, extFromMime } from "@/lib/storage";

export type ActionState = { ok: boolean; error?: string };
const ok = (): ActionState => ({ ok: true });
const fail = (error: string): ActionState => ({ ok: false, error });

function revalidate() {
  revalidatePath("/");
  revalidatePath("/landing");
}

const SECTIONS = ["hero", "gallery", "kambing", "olahan", "nasi_box", "sertifikat", "partner"];

/** Upload gambar baru ke bucket public-assets lalu catat di landing_media. */
export async function uploadLandingMedia(formData: FormData): Promise<ActionState> {
  await requireRole(["manager_program"]);
  const section = String(formData.get("section") ?? "");
  const alt = String(formData.get("alt") ?? "");
  const linkUrl = String(formData.get("link_url") ?? "");
  const file = formData.get("file") as File | null;
  if (!SECTIONS.includes(section)) return fail("Section tidak valid");
  if (!file || file.size === 0) return fail("File belum dipilih");
  if (!file.type.startsWith("image/")) return fail("File harus berupa gambar");

  const admin = createAdminClient();
  const ext = extFromMime(file.type);
  const path = `landing/${section}/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await admin.storage
    .from(BUCKET.publicAssets)
    .upload(path, buffer, { contentType: file.type, upsert: true });
  if (upErr) return fail(`Gagal unggah: ${upErr.message}`);

  const { data: pub } = admin.storage.from(BUCKET.publicAssets).getPublicUrl(path);

  const supabase = await createClient();
  const { data: maxRow } = await supabase
    .from("landing_media")
    .select("sort_order")
    .eq("section", section)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = ((maxRow as { sort_order?: number } | null)?.sort_order ?? 0) + 1;

  const { error } = await supabase.from("landing_media").insert({
    section,
    url: pub.publicUrl,
    storage_path: path,
    alt: alt || null,
    link_url: linkUrl || null,
    sort_order: nextOrder,
    is_visible: true,
  });
  if (error) return fail(error.message);

  revalidate();
  return ok();
}

/** Ganti gambar (upload baru, pertahankan baris & urutan). */
export async function replaceLandingMedia(formData: FormData): Promise<ActionState> {
  await requireRole(["manager_program"]);
  const id = String(formData.get("id") ?? "");
  const file = formData.get("file") as File | null;
  if (!id) return fail("ID tidak valid");
  if (!file || file.size === 0) return fail("File belum dipilih");
  if (!file.type.startsWith("image/")) return fail("File harus berupa gambar");

  const supabase = await createClient();
  const { data: row } = await supabase.from("landing_media").select("section").eq("id", id).maybeSingle();
  const section = (row as { section?: string } | null)?.section ?? "gallery";

  const admin = createAdminClient();
  const ext = extFromMime(file.type);
  const path = `landing/${section}/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await admin.storage
    .from(BUCKET.publicAssets)
    .upload(path, buffer, { contentType: file.type, upsert: true });
  if (upErr) return fail(`Gagal unggah: ${upErr.message}`);
  const { data: pub } = admin.storage.from(BUCKET.publicAssets).getPublicUrl(path);

  const { error } = await supabase
    .from("landing_media")
    .update({ url: pub.publicUrl, storage_path: path, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return fail(error.message);

  revalidate();
  return ok();
}

export async function deleteLandingMedia(id: string): Promise<ActionState> {
  await requireRole(["manager_program"]);
  if (!id) return fail("ID tidak valid");
  const supabase = await createClient();
  const { error } = await supabase.from("landing_media").delete().eq("id", id);
  if (error) return fail(error.message);
  revalidate();
  return ok();
}

export async function toggleLandingVisibility(id: string, visible: boolean): Promise<ActionState> {
  await requireRole(["manager_program"]);
  const supabase = await createClient();
  const { error } = await supabase.from("landing_media").update({ is_visible: !visible }).eq("id", id);
  if (error) return fail(error.message);
  revalidate();
  return ok();
}

/** Tukar urutan dengan tetangga dalam section yang sama (naik/turun). */
export async function moveLandingMedia(id: string, dir: "up" | "down"): Promise<ActionState> {
  await requireRole(["manager_program"]);
  const supabase = await createClient();
  const { data: cur } = await supabase.from("landing_media").select("id, section, sort_order").eq("id", id).maybeSingle();
  const c = cur as { id: string; section: string; sort_order: number } | null;
  if (!c) return fail("Item tidak ditemukan");

  // up: tetangga dengan sort_order < cur terbesar; down: > cur terkecil
  const base = supabase.from("landing_media").select("id, sort_order").eq("section", c.section);
  const q =
    dir === "up"
      ? base.lt("sort_order", c.sort_order).order("sort_order", { ascending: false })
      : base.gt("sort_order", c.sort_order).order("sort_order", { ascending: true });
  const { data: nb } = await q.limit(1).maybeSingle();
  const n = nb as { id: string; sort_order: number } | null;
  if (!n) return ok(); // sudah di ujung

  await supabase.from("landing_media").update({ sort_order: n.sort_order }).eq("id", c.id);
  await supabase.from("landing_media").update({ sort_order: c.sort_order }).eq("id", n.id);
  revalidate();
  return ok();
}

export async function updateLandingPartner(id: string, alt: string, linkUrl: string): Promise<ActionState> {
  await requireRole(["manager_program"]);
  const supabase = await createClient();
  const { error } = await supabase
    .from("landing_media")
    .update({ alt: alt || null, link_url: linkUrl || null })
    .eq("id", id);
  if (error) return fail(error.message);
  revalidate();
  return ok();
}

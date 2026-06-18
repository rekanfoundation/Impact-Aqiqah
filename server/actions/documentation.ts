"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile, getSessionUser } from "@/server/auth/session";
import { BUCKET, buildDocPath, extFromMime } from "@/lib/storage";

export type ActionState = { ok?: boolean; error?: string } | undefined;
const fail = (error: string): ActionState => ({ ok: false, error });

// ---------- Upload dokumentasi (foto/video/catatan) ----------
export async function uploadDocumentationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orderId = String(formData.get("order_id") ?? "");
  const animalId = (formData.get("animal_id") as string) || null;
  const stage = String(formData.get("stage") ?? "general");
  const caption = (formData.get("caption") as string) || null;
  const type = String(formData.get("type") ?? "photo");
  const file = formData.get("file") as File | null;

  if (!orderId) return fail("Order tidak valid");

  const user = await getSessionUser();
  const supabase = await createClient();

  let storagePath: string | null = null;

  if (type !== "note") {
    if (!file || file.size === 0) return fail("File wajib untuk foto/video");

    // ambil branch code + order number untuk penamaan path
    const { data: order } = await supabase
      .from("orders")
      .select("order_number, branch:branches(code)")
      .eq("id", orderId)
      .single();

    const branchCode =
      (order as { branch?: { code?: string } } | null)?.branch?.code ?? "NA";
    const orderNumber =
      (order as { order_number?: string } | null)?.order_number ?? orderId;

    const ext = extFromMime(file.type);
    storagePath = buildDocPath({ branchCode, orderNumber, stage, ext });

    const { error: upErr } = await supabase.storage
      .from(BUCKET.documentation)
      .upload(storagePath, file, { contentType: file.type, upsert: false });
    if (upErr) return fail(`Gagal unggah: ${upErr.message}`);
  }

  const { error } = await supabase.from("documentations").insert({
    order_id: orderId,
    animal_id: animalId,
    type,
    storage_path: storagePath,
    caption,
    stage,
    status: "pending",
    uploaded_by: user?.id ?? null,
  });
  if (error) return fail(error.message);

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/documentation");
  return { ok: true };
}

// ---------- Review dokumentasi (validasi 2 tingkat) ----------
// Supervisor (admin_cabang/manager) -> approved_supervisor
// Admin Pusat (admin_pusat) -> approved
export async function reviewDocumentationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const docId = String(formData.get("doc_id") ?? "");
  const orderId = String(formData.get("order_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const note = (formData.get("note") as string) || null;
  if (!docId) return fail("Dokumentasi tidak valid");

  const profile = await getProfile();
  if (!profile) return fail("Sesi tidak valid");

  const supabase = await createClient();

  if (decision === "reject") {
    if (!note) return fail("Alasan penolakan wajib diisi");
    const { error } = await supabase
      .from("documentations")
      .update({ status: "rejected", review_note: note, reviewed_by: profile.id })
      .eq("id", docId);
    if (error) return fail(error.message);
  } else if (decision === "approve") {
    const isFinal = profile.role === "admin_pusat";
    const isSupervisor =
      profile.role === "manager_program" || profile.role === "admin_cabang";
    if (!isFinal && !isSupervisor)
      return fail("Anda tidak berwenang memvalidasi");

    const nextStatus = isFinal ? "approved" : "approved_supervisor";
    const { error } = await supabase
      .from("documentations")
      .update({ status: nextStatus, reviewed_by: profile.id })
      .eq("id", docId);
    if (error) return fail(error.message);
  } else {
    return fail("Keputusan tidak valid");
  }

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/documentation");
  return { ok: true };
}

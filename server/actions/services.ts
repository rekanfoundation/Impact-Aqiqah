"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/session";
import { serviceSchema } from "@/server/validation/schemas";
import type { ServiceMeta } from "@/types/db";

export type ActionState = { ok?: boolean; error?: string } | undefined;
const fail = (error: string): ActionState => ({ ok: false, error });

function buildMeta(v: {
  type: string;
  harga_kambing?: number;
  biaya_masak?: number;
  sate_tusuk?: number;
  olahan_porsi?: number;
  semur_porsi?: number;
  gulai_porsi?: number;
  cocok_untuk?: string;
  items?: string;
}): ServiceMeta {
  if (v.type === "nasi_box") {
    let items: string[] = [];
    try {
      items = JSON.parse(v.items ?? "[]");
    } catch {
      items = [];
    }
    return { items: items.filter((s) => s.trim().length > 0) };
  }
  if (v.type === "aqiqah") {
    return {
      harga_kambing: v.harga_kambing ?? 0,
      biaya_masak: v.biaya_masak ?? 0,
      hasil: {
        sate_tusuk: v.sate_tusuk ?? 0,
        olahan_porsi: v.olahan_porsi ?? 0,
        semur_porsi: v.semur_porsi ?? 0,
        gulai_porsi: v.gulai_porsi ?? 0,
      },
      cocok_untuk: v.cocok_untuk ?? "",
    };
  }
  return {};
}

function parseForm(formData: FormData) {
  return serviceSchema.safeParse({
    id: (formData.get("id") as string) || undefined,
    type: formData.get("type"),
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    price: formData.get("price"),
    is_active: formData.get("is_active") === "on" || formData.get("is_active") === "true",
    harga_kambing: formData.get("harga_kambing") || undefined,
    biaya_masak: formData.get("biaya_masak") || undefined,
    sate_tusuk: formData.get("sate_tusuk") || undefined,
    olahan_porsi: formData.get("olahan_porsi") || undefined,
    semur_porsi: formData.get("semur_porsi") || undefined,
    gulai_porsi: formData.get("gulai_porsi") || undefined,
    cocok_untuk: formData.get("cocok_untuk") || undefined,
    items: (formData.get("items") as string) || undefined,
  });
}

export async function createServiceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(["manager_program"]);
  const parsed = parseForm(formData);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Input tidak valid");
  const v = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("services").insert({
    type: v.type,
    name: v.name,
    description: v.description ?? null,
    price: v.price,
    is_active: v.is_active,
    meta: buildMeta(v),
  });
  if (error) return fail(error.message);

  revalidatePath("/programs");
  redirect("/programs");
}

export async function updateServiceAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(["manager_program"]);
  const parsed = parseForm(formData);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Input tidak valid");
  const v = parsed.data;
  if (!v.id) return fail("ID paket tidak valid");

  const supabase = await createClient();
  const { error } = await supabase
    .from("services")
    .update({
      type: v.type,
      name: v.name,
      description: v.description ?? null,
      price: v.price,
      is_active: v.is_active,
      meta: buildMeta(v),
    })
    .eq("id", v.id);
  if (error) return fail(error.message);

  revalidatePath("/programs");
  redirect("/programs");
}

export async function toggleServiceActiveAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireRole(["manager_program"]);
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";
  if (!id) return fail("ID tidak valid");

  const supabase = await createClient();
  const { error } = await supabase
    .from("services")
    .update({ is_active: !active })
    .eq("id", id);
  if (error) return fail(error.message);

  revalidatePath("/programs");
  return { ok: true };
}

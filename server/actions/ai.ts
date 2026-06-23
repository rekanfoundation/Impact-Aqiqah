"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/session";

export type ActionState = { ok: boolean; error?: string };
const fail = (error: string): ActionState => ({ ok: false, error });

const CENTRAL = ["direktur", "manager_program", "admin_pusat"] as const;

/** Simpan hasil analisis AI (role pusat). */
export async function saveAiAnalysisAction(input: {
  kind?: string;
  title?: string;
  content: string;
}): Promise<ActionState> {
  const profile = await requireRole([...CENTRAL]);
  if (!input.content?.trim()) return fail("Konten kosong");

  const supabase = await createClient();
  const { error } = await supabase.from("ai_analyses").insert({
    kind: input.kind || "summary",
    title: input.title || `Analisis ${new Date().toISOString().slice(0, 16).replace("T", " ")}`,
    content: input.content,
    created_by: profile.id,
  });
  if (error) return fail(error.message);

  revalidatePath("/ai-analyses");
  return { ok: true };
}

export async function deleteAiAnalysisAction(id: string): Promise<ActionState> {
  await requireRole([...CENTRAL]);
  if (!id) return fail("ID tidak valid");
  const supabase = await createClient();
  const { error } = await supabase.from("ai_analyses").delete().eq("id", id);
  if (error) return fail(error.message);
  revalidatePath("/ai-analyses");
  return { ok: true };
}

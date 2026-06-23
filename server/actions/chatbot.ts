"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/session";
import { DEFAULT_CHATBOT_CONFIG, type ChatbotConfig } from "@/server/db/chatbot";

export type ActionState = { ok: boolean; error?: string };
const fail = (error: string): ActionState => ({ ok: false, error });

const CENTRAL = ["direktur", "manager_program", "admin_pusat"] as const;

/** Perbarui konfigurasi chatbot (app_settings.chatbot_config). Role pusat. */
export async function updateChatbotConfigAction(
  input: Partial<ChatbotConfig>,
): Promise<ActionState> {
  await requireRole([...CENTRAL]);
  const supabase = await createClient();

  // Ambil nilai saat ini agar partial-update aman, lalu merge.
  const { data: current } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "chatbot_config")
    .maybeSingle();

  const merged: ChatbotConfig = {
    ...DEFAULT_CHATBOT_CONFIG,
    ...((current?.value ?? {}) as Partial<ChatbotConfig>),
    ...input,
  };

  const { error } = await supabase.from("app_settings").upsert(
    {
      key: "chatbot_config",
      value: merged,
      description: "Konfigurasi chatbot AI (docs/26).",
    },
    { onConflict: "key" },
  );
  if (error) return fail(error.message);

  revalidatePath("/ai-assistant");
  return { ok: true };
}

/** Tambah/ubah entri Knowledge Base. Role pusat. */
export async function upsertKbAction(input: {
  id?: string;
  category: string;
  question?: string | null;
  content: string;
  sort_order?: number;
  is_active?: boolean;
}): Promise<ActionState> {
  await requireRole([...CENTRAL]);
  if (!input.content?.trim()) return fail("Konten kosong");

  const supabase = await createClient();
  const row = {
    category: input.category,
    question: input.question?.trim() || null,
    content: input.content.trim(),
    sort_order: input.sort_order ?? 0,
    is_active: input.is_active ?? true,
    updated_at: new Date().toISOString(),
  };

  const { error } = input.id
    ? await supabase.from("chatbot_kb").update(row).eq("id", input.id)
    : await supabase.from("chatbot_kb").insert(row);
  if (error) return fail(error.message);

  revalidatePath("/ai-assistant");
  return { ok: true };
}

/** Hapus entri Knowledge Base. Role pusat. */
export async function deleteKbAction(id: string): Promise<ActionState> {
  await requireRole([...CENTRAL]);
  if (!id) return fail("ID tidak valid");
  const supabase = await createClient();
  const { error } = await supabase.from("chatbot_kb").delete().eq("id", id);
  if (error) return fail(error.message);
  revalidatePath("/ai-assistant");
  return { ok: true };
}

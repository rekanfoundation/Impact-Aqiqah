import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Konfigurasi & data chatbot (docs/26). Config + KB dibaca server via service role
// (anon tidak menyentuh DB langsung). Riwayat & KB management memakai client RLS.

export interface ChatbotConfig {
  enabled: boolean;
  name: string;
  welcome: string;
  admin_wa: string;
  system_prompt: string;
  quick_actions: string[];
}

export const DEFAULT_CHATBOT_CONFIG: ChatbotConfig = {
  enabled: true,
  name: "ImpactAqiqah AI Assistant",
  welcome:
    "Halo! Saya asisten ImpactAqiqah. Ada yang bisa saya bantu seputar aqiqah, paket, atau laporan?",
  admin_wa: "",
  system_prompt:
    "Anda adalah ImpactAqiqah AI Assistant, asisten ramah untuk layanan Aqiqah/Qurban/Sedekah Daging dari Zakat Sukses (tagline: Tunaikan Ibadah, Tebarkan Manfaat). Jawab singkat, sopan, dan jelas dalam Bahasa Indonesia.",
  quick_actions: [
    "Apa itu Aqiqah Berbagi?",
    "Bagaimana cara melihat laporan?",
    "Apa arti Progress Dokumentasi?",
    "Bagaimana alur Qurban?",
    "Hubungi Admin",
  ],
};

export interface KbEntry {
  id: string;
  category: "product" | "business" | "sop" | "development" | "faq";
  question: string | null;
  content: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

/** Konfigurasi chatbot dari app_settings (service role; merge default). Resilient. */
export async function getChatbotConfig(): Promise<ChatbotConfig> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("app_settings")
      .select("value")
      .eq("key", "chatbot_config")
      .maybeSingle();
    const value = (data?.value ?? {}) as Partial<ChatbotConfig>;
    return { ...DEFAULT_CHATBOT_CONFIG, ...value };
  } catch {
    return DEFAULT_CHATBOT_CONFIG;
  }
}

/** KB aktif untuk grounding jawaban (service role, bypass RLS). Resilient. */
export async function getChatbotKb(): Promise<KbEntry[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("chatbot_kb")
      .select("id, category, question, content, sort_order, is_active")
      .eq("is_active", true)
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true })
      .limit(200);
    return (data ?? []) as KbEntry[];
  } catch {
    return [];
  }
}

/** KB lengkap untuk pengelolaan Super Admin (client RLS = manager_program). */
export async function getKbForAdmin(): Promise<KbEntry[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("chatbot_kb")
      .select("id, category, question, content, sort_order, is_active, created_at, updated_at")
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true })
      .limit(500);
    return (data ?? []) as KbEntry[];
  } catch {
    return [];
  }
}

export interface ChatLog {
  id: string;
  session_id: string | null;
  question: string;
  answer: string | null;
  status: "answered" | "escalated" | "failed";
  page: string | null;
  provider: string | null;
  created_at: string;
}

/** Riwayat percakapan (role pusat via RLS). Resilient. */
export async function getChatLogs(limit = 200): Promise<ChatLog[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("chat_logs")
      .select("id, session_id, question, answer, status, page, provider, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data ?? []) as ChatLog[];
  } catch {
    return [];
  }
}

/** Catat percakapan via service role (insert bypass RLS). Best-effort. */
export async function logChat(entry: {
  session_id?: string | null;
  question: string;
  answer?: string | null;
  status: "answered" | "escalated" | "failed";
  page?: string | null;
  provider?: string | null;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from("chat_logs").insert({
      session_id: entry.session_id ?? null,
      question: entry.question,
      answer: entry.answer ?? null,
      status: entry.status,
      page: entry.page ?? null,
      provider: entry.provider ?? null,
    });
  } catch {
    // logging tidak boleh menggagalkan respons chat
  }
}

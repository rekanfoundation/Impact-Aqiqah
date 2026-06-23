import { askWithProvider } from "@/server/ai/provider";
import { getChatbotConfig, getChatbotKb, type ChatbotConfig } from "@/server/db/chatbot";
import { getPublicPackages } from "@/server/db/public";
import { formatIDR } from "@/lib/utils";

// Otak chatbot (docs/26). Grounding: Knowledge Base + paket live. Tidak mengarang —
// bila tak yakin/di luar konteks/sensitif → balas token <<ESCALATE>> (handoff WA).

export const ESCALATE_MARKER = "<<ESCALATE>>";

export type ChatTurn = { role: "user" | "assistant"; content: string };
export type ChatStatus = "answered" | "escalated" | "failed";

const RULES =
  "ATURAN:\n" +
  "- Jawab dalam Bahasa Indonesia, singkat, sopan, dan jelas.\n" +
  "- Jawab HANYA berdasarkan KONTEKS di bawah atau pengetahuan umum yang aman tentang aqiqah/qurban. JANGAN mengarang fakta, harga, atau kebijakan.\n" +
  `- Jika informasi tidak ada di KONTEKS, atau Anda tidak yakin, balas PERSIS token: ${ESCALATE_MARKER}\n` +
  `- Untuk hal sensitif, keluhan, permintaan ubah data, atau pertanyaan spesifik tentang order tertentu, balas PERSIS token: ${ESCALATE_MARKER}\n` +
  "- Jangan gunakan markdown tebal (tanda bintang ganda).";

function buildKnowledgeContext(
  kb: Awaited<ReturnType<typeof getChatbotKb>>,
  packages: Awaited<ReturnType<typeof getPublicPackages>>,
): string {
  const kbText = kb.length
    ? kb
        .map((k) => `• [${k.category}] ${k.question ? k.question + " — " : ""}${k.content}`)
        .join("\n")
    : "(belum ada entri)";

  const pkgText = packages.length
    ? packages
        .map((p) => `• ${p.name} (${p.type}): ${formatIDR(p.price)}${p.description ? " — " + p.description : ""}`)
        .join("\n")
    : "(tidak ada data paket)";

  return `KONTEKS PENGETAHUAN:\n${kbText}\n\nDAFTAR PAKET & HARGA SAAT INI:\n${pkgText}`;
}

function buildUserPrompt(message: string, history: ChatTurn[]): string {
  const recent = history.slice(-6);
  if (recent.length === 0) return `Pertanyaan pengguna: ${message}`;
  const transcript = recent
    .map((t) => `${t.role === "user" ? "Pengguna" : "Asisten"}: ${t.content}`)
    .join("\n");
  return `Riwayat percakapan:\n${transcript}\n\nPertanyaan pengguna sekarang: ${message}`;
}

export interface ChatAnswer {
  text: string;
  status: ChatStatus;
  provider: string | null;
  config: ChatbotConfig;
}

/** Jawab pesan chatbot dengan grounding KB + paket. */
export async function answerChat(input: {
  message: string;
  history?: ChatTurn[];
}): Promise<ChatAnswer> {
  const [config, kb, packages] = await Promise.all([
    getChatbotConfig(),
    getChatbotKb(),
    getPublicPackages(),
  ]);

  const system = `${config.system_prompt}\n\n${RULES}\n\n${buildKnowledgeContext(kb, packages)}`;
  const user = buildUserPrompt(input.message, input.history ?? []);

  const result = await askWithProvider(system, user, 500);

  // Semua provider gagal/nonaktif → failed (handoff).
  if (!result || !result.text.trim()) {
    return { text: "", status: "failed", provider: null, config };
  }

  // Model meminta eskalasi.
  if (result.text.includes(ESCALATE_MARKER)) {
    return { text: "", status: "escalated", provider: result.provider, config };
  }

  return { text: result.text.trim(), status: "answered", provider: result.provider, config };
}

import { NextResponse } from "next/server";
import { getChatbotConfig } from "@/server/db/chatbot";
import { buildWaLink, chatHandoffMessage } from "@/lib/wa";

export const runtime = "nodejs";

/**
 * GET /api/chat/config — bootstrap widget chatbot (publik).
 * Gabungan env (hard-off) + konfigurasi DB. Tidak membocorkan system prompt.
 */
export async function GET() {
  // Hard-off via env: bila NEXT_PUBLIC_CHATBOT_ENABLED=false, widget tidak tampil.
  const envOff = process.env.NEXT_PUBLIC_CHATBOT_ENABLED === "false";
  const config = await getChatbotConfig();

  const enabled = !envOff && config.enabled;
  const name = process.env.NEXT_PUBLIC_CHATBOT_NAME || config.name;
  const adminWa =
    config.admin_wa || process.env.ADMIN_WHATSAPP_NUMBER || process.env.NEXT_PUBLIC_WA_NUMBER || "";

  return NextResponse.json({
    enabled,
    name,
    welcome: config.welcome,
    quickActions: config.quick_actions,
    adminWa,
    adminWaUrl: adminWa ? buildWaLink(adminWa, chatHandoffMessage("(pertanyaan umum)")) : null,
  });
}

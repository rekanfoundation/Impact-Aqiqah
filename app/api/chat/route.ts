import { NextResponse } from "next/server";
import { answerChat, type ChatTurn } from "@/server/ai/chatbot";
import { logChat } from "@/server/db/chatbot";
import { buildWaLink, chatHandoffMessage } from "@/lib/wa";

export const runtime = "nodejs";

const FALLBACK_MESSAGE =
  "Maaf, saya belum memiliki informasi yang cukup untuk menjawab pertanyaan tersebut. " +
  "Silakan hubungi tim kami agar dapat membantu lebih lanjut.";

const MAX_LEN = 1000;

/**
 * POST /api/chat — chatbot publik (docs/26). Anon diizinkan (lihat middleware).
 * Grounding KB + paket, handoff WhatsApp bila tak yakin. Mencatat ke chat_logs.
 */
export async function POST(req: Request) {
  let body: { message?: unknown; history?: unknown; page?: unknown; sessionId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { message: "Body tidak valid" } }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json({ error: { message: "Pesan kosong" } }, { status: 400 });
  }
  if (message.length > MAX_LEN) {
    return NextResponse.json(
      { error: { message: `Pesan terlalu panjang (maks ${MAX_LEN} karakter)` } },
      { status: 400 },
    );
  }

  const history: ChatTurn[] = Array.isArray(body.history)
    ? (body.history as unknown[])
        .filter(
          (t): t is ChatTurn =>
            !!t &&
            typeof t === "object" &&
            (t as ChatTurn).role !== undefined &&
            typeof (t as ChatTurn).content === "string",
        )
        .map((t) => ({ role: t.role === "assistant" ? "assistant" : "user", content: t.content }))
    : [];
  const page = typeof body.page === "string" ? body.page : null;
  const sessionId = typeof body.sessionId === "string" ? body.sessionId : null;

  const result = await answerChat({ message, history });

  // Chatbot dimatikan Super Admin.
  if (!result.config.enabled) {
    return NextResponse.json({ disabled: true });
  }

  const escalate = result.status !== "answered";
  const answer = escalate ? FALLBACK_MESSAGE : result.text;

  // Nomor admin: konfigurasi DB → env → nomor WA default.
  const adminWa =
    result.config.admin_wa ||
    process.env.ADMIN_WHATSAPP_NUMBER ||
    process.env.NEXT_PUBLIC_WA_NUMBER ||
    "";
  const waUrl = adminWa ? buildWaLink(adminWa, chatHandoffMessage(message)) : null;

  // Catat (best-effort, tidak menggagalkan respons).
  await logChat({
    session_id: sessionId,
    question: message,
    answer: escalate ? null : result.text,
    status: result.status,
    page,
    provider: result.provider,
  });

  return NextResponse.json({
    answer,
    status: result.status,
    escalate,
    adminWa,
    waUrl,
  });
}

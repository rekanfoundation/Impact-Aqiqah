// Notifikasi admin via Telegram bot. Fallback aman bila token/chat id kosong.

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;
const ENABLED = !!TOKEN && !!CHAT_ID && !TOKEN.startsWith("PLACEHOLDER");

export function telegramEnabled(): boolean {
  return ENABLED;
}

export async function sendTelegramAdmin(text: string): Promise<boolean> {
  if (!ENABLED) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

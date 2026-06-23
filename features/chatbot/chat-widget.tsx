"use client";

import { useEffect, useRef, useState } from "react";

// Floating AI Assistant (docs/26). Tampil di semua halaman (mount di root layout).
// Bubble kanan-bawah, panel responsif, quick actions, handoff WhatsApp.

type Role = "user" | "assistant";
interface Msg {
  role: Role;
  content: string;
  escalate?: boolean;
  waUrl?: string | null;
}

interface ChatConfig {
  enabled: boolean;
  name: string;
  welcome: string;
  quickActions: string[];
  adminWa: string;
  adminWaUrl: string | null;
}

const SESSION_KEY = "ia_chat_session";

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function ChatWidget() {
  const [config, setConfig] = useState<ChatConfig | null>(null);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Env hard-off: jangan tampil sama sekali.
  const envOff = process.env.NEXT_PUBLIC_CHATBOT_ENABLED === "false";

  useEffect(() => {
    if (envOff) return;
    fetch("/api/chat/config")
      .then((r) => r.json())
      .then((c: ChatConfig) => {
        if (c?.enabled) setConfig(c);
      })
      .catch(() => {});
  }, [envOff]);

  useEffect(() => {
    if (open && config && messages.length === 0) {
      setMessages([{ role: "assistant", content: config.welcome }]);
    }
  }, [open, config, messages.length]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  if (envOff || !config) return null;

  async function send(text: string) {
    const message = text.trim();
    if (!message || loading) return;

    // Quick action "Hubungi Admin" → langsung WA.
    if (/hubungi admin/i.test(message) && config!.adminWaUrl) {
      window.open(config!.adminWaUrl, "_blank");
      return;
    }

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history,
          page: typeof window !== "undefined" ? window.location.pathname : null,
          sessionId: getSessionId(),
        }),
      });
      const data = await res.json();
      if (data?.disabled) {
        setConfig(null);
        return;
      }
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer ?? "Maaf, terjadi kendala.",
          escalate: !!data.escalate,
          waUrl: data.waUrl ?? config!.adminWaUrl,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Maaf, koneksi bermasalah. Silakan coba lagi atau hubungi admin.",
          escalate: true,
          waUrl: config!.adminWaUrl,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // ---------- Collapsed bubble ----------
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="Buka chat asisten"
        className="fixed bottom-20 right-4 z-50 flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-amber-600/30 transition hover:scale-105 md:bottom-5"
      >
        <span className="text-lg">💬</span>
        <span className="hidden sm:inline">Tanya ImpactAqiqah</span>
      </button>
    );
  }

  // ---------- Expanded panel ----------
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-end p-0 sm:bottom-5 sm:right-4 sm:left-auto sm:top-auto sm:inset-auto"
      role="dialog"
      aria-label="Chat asisten ImpactAqiqah"
    >
      {/* Backdrop hanya di mobile */}
      <div
        className="absolute inset-0 bg-black/30 sm:hidden"
        onClick={() => setOpen(false)}
        aria-hidden
      />
      <div className="relative flex h-[100dvh] w-full flex-col bg-white shadow-2xl sm:h-[600px] sm:max-h-[80vh] sm:w-[380px] sm:rounded-2xl sm:border sm:border-neutral-200">
        {/* Header */}
        <div className="flex items-center justify-between rounded-t-none bg-[var(--color-primary)] px-4 py-3 text-white sm:rounded-t-2xl">
          <div className="flex items-center gap-2">
            <span className="text-lg">🤖</span>
            <div className="leading-tight">
              <div className="text-sm font-semibold">{config.name}</div>
              <div className="text-[11px] text-white/80">Biasanya membalas cepat</div>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Tutup chat"
            className="rounded-full p-1 text-white/90 hover:bg-white/20"
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-neutral-50 px-3 py-3">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div
                className={
                  m.role === "user"
                    ? "max-w-[80%] rounded-2xl rounded-br-sm bg-[var(--color-primary)] px-3 py-2 text-sm text-white"
                    : "max-w-[85%] rounded-2xl rounded-bl-sm border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800"
                }
              >
                <p className="whitespace-pre-wrap">{m.content}</p>
                {m.role === "assistant" && m.escalate && m.waUrl && (
                  <a
                    href={m.waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                  >
                    💬 Hubungi Admin
                  </a>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-400">
                Mengetik…
              </div>
            </div>
          )}

          {/* Quick actions (hanya saat awal percakapan) */}
          {messages.length <= 1 && !loading && (
            <div className="flex flex-wrap gap-2 pt-1">
              {config.quickActions.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="rounded-full border border-[var(--color-primary)]/40 bg-white px-3 py-1.5 text-xs text-[var(--color-primary)] hover:bg-amber-50"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2 border-t border-neutral-200 bg-white px-3 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tulis pesan…"
            maxLength={1000}
            className="flex-1 rounded-full border border-neutral-300 px-4 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            aria-label="Kirim"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-white transition hover:opacity-90 disabled:opacity-50"
          >
            ➤
          </button>
        </form>
      </div>
    </div>
  );
}

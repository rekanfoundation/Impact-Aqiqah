import Anthropic from "@anthropic-ai/sdk";

// Rantai AI multi-provider + multi-key dengan fallback otomatis.
// Urut: Gemini (3 key) → OpenRouter (3 key) → Anthropic (pilihan terakhir).
// Bila satu provider/key error atau kena limit → geser ke berikutnya.

// Model default tiap provider — dipilih agar seimbang: cerdas, stabil (anti-error),
// dan hemat token. Semua bisa di-override via env.
// - Gemini: 2.5 Flash → GA stabil, cepat, murah, kualitas di atas 2.0 Flash.
// - OpenRouter: GPT-4o-mini → provider BERBEDA dari Gemini (diversifikasi: bila Google
//   down/limit, fallback ini tidak ikut tumbang), reliabel & murah.
// - Anthropic (cadangan terakhir): Haiku 4.5 → termurah & tercepat di kelasnya,
//   konteks 200K, pas untuk ringkasan singkat (hemat token).
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
// Cadangan model di dalam OpenRouter (routing fallback bawaan OpenRouter): bila model
// utama gagal/limit, OpenRouter otomatis mencoba model berikutnya pada request yang sama.
const OPENROUTER_FALLBACK_MODELS = (process.env.OPENROUTER_FALLBACK_MODELS ||
  "google/gemini-2.5-flash,meta-llama/llama-3.3-70b-instruct")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";

const valid = (k?: string | null): k is string => !!k && !k.startsWith("PLACEHOLDER");

interface Provider {
  name: string;
  call: (system: string, user: string, maxTokens: number) => Promise<string | null>;
}

// ---------- Gemini ----------
function geminiCall(key: string): Provider["call"] {
  return async (system, user, maxTokens) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(key)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.4 },
      }),
    });
    if (!res.ok) throw new Error(`gemini ${res.status}`);
    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    return data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") || null;
  };
}

// ---------- OpenRouter (OpenAI-compatible) ----------
function openrouterCall(key: string): Provider["call"] {
  return async (system, user, maxTokens) => {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        "X-Title": "ImpactAqiqah",
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        // Routing fallback bawaan OpenRouter: coba model berikutnya bila utama gagal/limit.
        ...(OPENROUTER_FALLBACK_MODELS.length
          ? { models: [OPENROUTER_MODEL, ...OPENROUTER_FALLBACK_MODELS], route: "fallback" }
          : {}),
        max_tokens: maxTokens,
        temperature: 0.4,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) throw new Error(`openrouter ${res.status}`);
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content || null;
  };
}

// ---------- Anthropic (SDK) ----------
function anthropicCall(key: string): Provider["call"] {
  return async (system, user, maxTokens) => {
    const client = new Anthropic({ apiKey: key });
    const msg = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    });
    const block = msg.content.find((b) => b.type === "text");
    return block && "text" in block ? block.text : null;
  };
}

function buildChain(): Provider[] {
  const chain: Provider[] = [];
  for (const i of [1, 2, 3]) {
    const k = process.env[`GEMINI_API_KEY_${i}`];
    if (valid(k)) chain.push({ name: `gemini#${i}`, call: geminiCall(k) });
  }
  for (const i of [1, 2, 3]) {
    const k = process.env[`OPENROUTER_API_KEY_${i}`];
    if (valid(k)) chain.push({ name: `openrouter#${i}`, call: openrouterCall(k) });
  }
  const ak = process.env.ANTHROPIC_API_KEY;
  if (valid(ak)) chain.push({ name: "anthropic", call: anthropicCall(ak) });
  return chain;
}

const CHAIN = buildChain();

export function aiEnabled(): boolean {
  return CHAIN.length > 0;
}

/** Daftar nama provider aktif (untuk diagnostik; tanpa membocorkan key). */
export function providerChainNames(): string[] {
  return CHAIN.map((p) => p.name);
}

/** Bersihkan output AI: hapus penanda tebal markdown, rapikan bullet & spasi. */
export function sanitizeAiText(s: string): string {
  return s
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/^\s*[*•]\s+/gm, "- ") // normalisasi bullet ke "- "
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Panggil AI lewat rantai fallback. Mengembalikan teks tersanitasi + provider terpakai. */
export async function askWithProvider(
  system: string,
  user: string,
  maxTokens = 600,
): Promise<{ text: string; provider: string } | null> {
  for (const p of CHAIN) {
    try {
      const out = await p.call(system, user, maxTokens);
      if (out && out.trim()) return { text: sanitizeAiText(out), provider: p.name };
    } catch {
      // error/limit → geser ke provider/key berikutnya
    }
  }
  return null;
}

/** Versi ringkas (kompatibel pemakaian lama): teks saja, null bila semua gagal/nonaktif. */
export async function ask(system: string, user: string, maxTokens = 600): Promise<string | null> {
  const r = await askWithProvider(system, user, maxTokens);
  return r?.text ?? null;
}

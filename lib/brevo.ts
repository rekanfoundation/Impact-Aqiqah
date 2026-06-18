// Integrasi Brevo (email transaksional + kontak marketing).
// Fallback aman: no-op bila API key kosong/placeholder (pola server/ai).

const KEY = process.env.BREVO_API_KEY;
const ENABLED = !!KEY && !KEY.startsWith("PLACEHOLDER");
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || "no-reply@impactaqiqah.id";
const SENDER_NAME = process.env.BREVO_SENDER_NAME || "ImpactAqiqah";
const LIST_ID = process.env.BREVO_LIST_ID ? Number(process.env.BREVO_LIST_ID) : undefined;

const BASE = "https://api.brevo.com/v3";

export function brevoEnabled(): boolean {
  return ENABLED;
}

async function brevoFetch(path: string, body: unknown): Promise<boolean> {
  if (!ENABLED) return false;
  try {
    const res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: {
        "api-key": KEY as string,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function sendTransactionalEmail(opts: {
  to: string;
  subject: string;
  html: string;
  name?: string;
}): Promise<boolean> {
  return brevoFetch("/smtp/email", {
    sender: { email: SENDER_EMAIL, name: SENDER_NAME },
    to: [{ email: opts.to, name: opts.name }],
    subject: opts.subject,
    htmlContent: opts.html,
  });
}

export async function upsertContact(opts: {
  email: string;
  attributes?: Record<string, unknown>;
  listIds?: number[];
}): Promise<boolean> {
  const listIds = opts.listIds ?? (LIST_ID ? [LIST_ID] : undefined);
  return brevoFetch("/contacts", {
    email: opts.email,
    attributes: opts.attributes,
    listIds,
    updateEnabled: true,
  });
}

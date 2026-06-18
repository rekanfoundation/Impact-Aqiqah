import { createHash, createHmac } from "node:crypto";

// Integrasi iPaymu (payment gateway) — redirect/hosted, API v2.
// Signature: HMAC-SHA256( `POST:{VA}:{sha256hex(body)}:{APIKEY}`, APIKEY ).

const VA = process.env.IPAYMU_VA ?? "";
const API_KEY = process.env.IPAYMU_API_KEY ?? "";
const MODE = process.env.IPAYMU_MODE === "production" ? "production" : "sandbox";

const BASE =
  MODE === "production"
    ? "https://my.ipaymu.com/api/v2"
    : "https://sandbox.ipaymu.com/api/v2";

export function ipaymuEnabled(): boolean {
  return !!VA && !!API_KEY && !VA.startsWith("PLACEHOLDER") && !API_KEY.startsWith("PLACEHOLDER");
}

function sign(bodyJson: string): { signature: string; timestamp: string } {
  const bodyHash = createHash("sha256").update(bodyJson).digest("hex").toLowerCase();
  const stringToSign = `POST:${VA}:${bodyHash}:${API_KEY}`;
  const signature = createHmac("sha256", API_KEY).update(stringToSign).digest("hex");
  const timestamp = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14); // YYYYMMDDHHmmss
  return { signature, timestamp };
}

async function ipaymuPost(path: string, body: Record<string, unknown>) {
  const json = JSON.stringify(body);
  const { signature, timestamp } = sign(json);
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      va: VA,
      signature,
      timestamp,
    },
    body: json,
  });
  return res.json();
}

export interface CreatePaymentInput {
  amount: number;
  productName: string;
  referenceId: string;
  returnUrl: string;
  notifyUrl: string;
  cancelUrl?: string;
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
}

/** Buat transaksi redirect → kembalikan URL pembayaran iPaymu. */
export async function createRedirectPayment(
  input: CreatePaymentInput,
): Promise<{ ok: boolean; url?: string; sessionId?: string; error?: string }> {
  if (!ipaymuEnabled()) return { ok: false, error: "iPaymu belum dikonfigurasi" };

  const body = {
    product: [input.productName],
    qty: ["1"],
    price: [String(Math.round(input.amount))],
    returnUrl: input.returnUrl,
    notifyUrl: input.notifyUrl,
    cancelUrl: input.cancelUrl ?? input.returnUrl,
    referenceId: input.referenceId,
    buyerName: input.buyerName ?? "",
    buyerEmail: input.buyerEmail ?? "",
    buyerPhone: input.buyerPhone ?? "",
  };

  try {
    const data = await ipaymuPost("/payment", body);
    const url = data?.Data?.Url as string | undefined;
    const sessionId = data?.Data?.SessionID as string | undefined;
    if (!url) return { ok: false, error: data?.Message ?? "Gagal membuat pembayaran" };
    return { ok: true, url, sessionId };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** Cek status transaksi (verifikasi callback). */
export async function checkTransaction(
  transactionId: string,
): Promise<{ ok: boolean; status?: string; amount?: number; raw?: unknown }> {
  if (!ipaymuEnabled()) return { ok: false };
  try {
    const data = await ipaymuPost("/transaction", { transactionId });
    const d = data?.Data ?? {};
    return {
      ok: true,
      status: (d.Status ?? d.StatusDesc ?? "").toString().toLowerCase(),
      amount: Number(d.Amount ?? d.SubTotal ?? 0),
      raw: data,
    };
  } catch {
    return { ok: false };
  }
}

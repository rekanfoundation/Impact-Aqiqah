import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkTransaction } from "@/lib/ipaymu";
import { sendTelegramAdmin } from "@/lib/telegram";

export const runtime = "nodejs";

/**
 * POST /api/payment/ipaymu/callback — notifyUrl iPaymu (server-to-server, tanpa sesi).
 * Verifikasi transaksi → catat payment (idempoten) → recompute payment_status → coba majukan order.
 */
export async function POST(req: Request) {
  // iPaymu mengirim form-urlencoded; dukung juga JSON.
  let fields: Record<string, string> = {};
  const ct = req.headers.get("content-type") ?? "";
  try {
    if (ct.includes("application/json")) {
      fields = (await req.json()) as Record<string, string>;
    } else {
      const form = await req.formData();
      form.forEach((v, k) => (fields[k] = String(v)));
    }
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const trxId = fields.trx_id || fields.transactionId || fields.sid;
  const orderId = fields.reference_id || fields.referenceId;
  if (!trxId || !orderId) {
    return NextResponse.json({ ok: false, message: "data tidak lengkap" }, { status: 400 });
  }

  // Verifikasi ke iPaymu (jangan percaya callback mentah)
  const verify = await checkTransaction(trxId);
  const status = (verify.status ?? fields.status ?? "").toLowerCase();
  const success = status.includes("berhasil") || status === "1" || status.includes("success");

  if (!verify.ok || !success) {
    // Bukan sukses → akui terima, jangan catat
    return NextResponse.json({ ok: true, recorded: false });
  }

  const admin = createAdminClient();
  const amount = Number(verify.amount ?? fields.amount ?? 0);

  // Catat payment (idempoten via unique provider_ref)
  await admin
    .from("payments")
    .insert({
      order_id: orderId,
      amount,
      method: "ipaymu",
      provider: "ipaymu",
      provider_ref: trxId,
      status: "paid",
      verified_at: new Date().toISOString(),
      raw: verify.raw ?? fields,
    })
    .select();
  // Konflik (callback dobel) diabaikan oleh unique index — error tidak fatal.

  // Coba majukan order new -> paid (gate DP/lunas dicek di RPC). Abaikan bila gagal.
  try {
    await admin.rpc("transition_order_status", { p_order_id: orderId, p_to: "paid" });
  } catch {
    /* gate belum terpenuhi / status bukan new */
  }

  // Alert admin
  try {
    await sendTelegramAdmin(`💰 <b>Pembayaran diterima</b>\nOrder: ${orderId}\nNominal: Rp${amount.toLocaleString("id-ID")}`);
  } catch {
    /* abaikan */
  }

  return NextResponse.json({ ok: true, recorded: true });
}

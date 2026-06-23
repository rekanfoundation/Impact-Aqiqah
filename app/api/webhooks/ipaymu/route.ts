import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkTransaction } from "@/lib/ipaymu";
import { sendTelegramAdmin } from "@/lib/telegram";
import { sendTransactionalEmail } from "@/lib/brevo";

export const runtime = "nodejs";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Guest yang sudah bayar → buat akun login (magic link) + hak affiliate.
 * Idempoten: skip bila order sudah punya customer_id atau email kosong. Aman bila gagal.
 */
async function provisionGuestAccount(admin: Admin, orderId: string): Promise<void> {
  const { data: order } = await admin
    .from("orders")
    .select("id, customer_id, participant:participants(name,email)")
    .eq("id", orderId)
    .single();
  const o = order as unknown as {
    customer_id: string | null;
    participant:
      | { name: string | null; email: string | null }
      | { name: string | null; email: string | null }[]
      | null;
  } | null;
  if (!o || o.customer_id) return;

  const part = Array.isArray(o.participant) ? o.participant[0] : o.participant;
  const email = part?.email ?? null;
  if (!email) return;

  // user existing? (profiles.email unik) — kalau belum, buat via Admin API
  let userId: string | null = null;
  const { data: prof } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  if ((prof as { id?: string } | null)?.id) {
    userId = (prof as { id: string }).id;
  } else {
    const { data: created, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: part?.name ?? "", role: "user" },
    });
    if (error || !created?.user) return;
    userId = created.user.id;
  }
  await admin.from("orders").update({ customer_id: userId }).eq("id", orderId);

  // magic link → kirim via Brevo (akun + akses affiliate)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const { data: link } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${appUrl}/akun` },
  });
  const actionLink = (link as { properties?: { action_link?: string } } | null)?.properties?.action_link;
  if (actionLink) {
    await sendTransactionalEmail({
      to: email,
      name: part?.name ?? undefined,
      subject: "Pesanan Diterima — Masuk & Aktifkan Affiliate",
      html:
        `<p>Terima kasih telah beraqiqah bersama ImpactAqiqah.</p>` +
        `<p>Klik tombol di bawah untuk masuk ke akun Anda, melacak pesanan, dan mengaktifkan akses <b>affiliate</b> (komisi atas setiap ajakan).</p>` +
        `<p><a href="${actionLink}" style="background:#f59e0b;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Masuk ke Akun</a></p>` +
        `<p style="font-size:12px;color:#888">Atau buka link: ${actionLink}</p>`,
    });
  }
}

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

  // Guest checkout: buat akun + magic link + affiliate (aman bila gagal)
  try {
    await provisionGuestAccount(admin, orderId);
  } catch {
    /* abaikan — pencatatan bayar tetap sukses */
  }

  // Alert admin
  try {
    await sendTelegramAdmin(`💰 <b>Pembayaran diterima</b>\nOrder: ${orderId}\nNominal: Rp${amount.toLocaleString("id-ID")}`);
  } catch {
    /* abaikan */
  }

  return NextResponse.json({ ok: true, recorded: true });
}

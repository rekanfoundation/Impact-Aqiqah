"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createRedirectPayment } from "@/lib/ipaymu";
import { sendTelegramAdmin } from "@/lib/telegram";

export interface CheckoutPayload {
  items: { service_id: string; qty: number }[];
  aqiqah_type: "salur" | "kirim";
  child_name: string;
  child_bin_binti: string;
  child_gender: "L" | "P" | "";
  pemesan: { name: string; phone: string; email: string };
  delivery: { date: string; time: string };
  address: {
    alamat?: string;
    provinsi?: string;
    kota?: string;
    kecamatan?: string;
    kelurahan?: string;
    patokan?: string;
  };
  notes?: string;
}

export type CheckoutResult = { error: string };

/**
 * Guest checkout: buat order via RPC create_guest_order (anon, SECURITY DEFINER) lalu mulai
 * pembayaran iPaymu (hosted). Redirect ke URL iPaymu, atau ke halaman sukses (pending) bila
 * iPaymu belum dikonfigurasi. Mengembalikan {error} hanya saat gagal validasi.
 */
export async function createGuestOrderAction(payload: CheckoutPayload): Promise<CheckoutResult> {
  const ref = (await cookies()).get("ia_ref")?.value ?? "";
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("create_guest_order", {
    payload: { ...payload, referral_code: ref },
  });
  if (error) return { error: error.message };

  const res = data as { order_id: string; public_token: string; total: number };
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const successUrl = `${appUrl}/checkout/sukses?token=${res.public_token}`;

  // Alert admin (aman bila nonaktif)
  try {
    await sendTelegramAdmin(
      `🛒 <b>Checkout baru</b>\nTotal: Rp${res.total.toLocaleString("id-ID")}\nOrder: ${res.order_id}`,
    );
  } catch {
    /* abaikan */
  }

  // Mulai pembayaran iPaymu (lunas). Bila belum dikonfigurasi → ke sukses (pending).
  const pay = await createRedirectPayment({
    amount: res.total,
    productName: `Aqiqah ${payload.child_name || payload.pemesan.name}`.slice(0, 60),
    referenceId: res.order_id,
    returnUrl: successUrl,
    notifyUrl: process.env.IPAYMU_NOTIFY_URL || `${appUrl}/api/webhooks/ipaymu`,
    cancelUrl: `${appUrl}/checkout`,
    buyerName: payload.pemesan.name,
    buyerEmail: payload.pemesan.email,
    buyerPhone: payload.pemesan.phone,
  });

  redirect(pay.ok && pay.url ? pay.url : `${successUrl}&pending=1`);
}

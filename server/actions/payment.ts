"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/server/auth/session";
import { createRedirectPayment, ipaymuEnabled } from "@/lib/ipaymu";

export type ActionState = { ok?: boolean; error?: string } | undefined;
const fail = (error: string): ActionState => ({ ok: false, error });

/** Customer memulai pembayaran iPaymu (DP atau Lunas). */
export async function startPaymentAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!ipaymuEnabled()) return fail("Pembayaran online belum aktif. Hubungi admin.");

  const orderId = String(formData.get("order_id") ?? "");
  const mode = String(formData.get("mode") ?? "full"); // 'dp' | 'full'
  if (!orderId) return fail("Order tidak valid");

  const profile = await getProfile();
  if (!profile) return fail("Sesi tidak valid");

  const supabase = await createClient();

  // Order milik customer (RLS membatasi)
  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number, total_amount, customer_id, payment_status")
    .eq("id", orderId)
    .single();
  if (!order) return fail("Order tidak ditemukan");
  const o = order as {
    order_number: string;
    total_amount: number;
    payment_status: string;
  };
  if (o.payment_status === "paid") return fail("Pesanan sudah lunas");

  // Nominal: sudah dibayar & rasio DP via RPC
  const [{ data: paid }, { data: ratio }] = await Promise.all([
    supabase.rpc("order_paid_amount", { p_order_id: orderId }),
    supabase.rpc("effective_min_dp_ratio", { p_order_id: orderId }),
  ]);
  const paidAmount = Number(paid ?? 0);
  const dpRatio = Number(ratio ?? 0.5);
  const total = Number(o.total_amount);

  const remaining = Math.max(0, total - paidAmount);
  const dpTarget = Math.max(0, Math.ceil(total * dpRatio) - paidAmount);
  const amount = mode === "dp" ? Math.min(dpTarget, remaining) : remaining;

  if (amount <= 0) return fail("Tidak ada tagihan yang perlu dibayar");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const result = await createRedirectPayment({
    amount,
    productName: `Pembayaran ${o.order_number}`,
    referenceId: orderId,
    returnUrl: `${appUrl}/akun/pesanan/${orderId}?paid=1`,
    notifyUrl: process.env.IPAYMU_NOTIFY_URL || `${appUrl}/api/webhooks/ipaymu`,
    buyerName: profile.full_name ?? undefined,
    buyerEmail: profile.email ?? undefined,
    buyerPhone: profile.phone ?? undefined,
  });

  if (!result.ok || !result.url) return fail(result.error ?? "Gagal memproses pembayaran");

  redirect(result.url);
}

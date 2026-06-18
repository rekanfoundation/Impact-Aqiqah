"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/server/auth/session";
import { enqueueNotifications } from "@/server/services/notifications/enqueue";
import { sendTelegramAdmin } from "@/lib/telegram";

export type ActionState = { ok?: boolean; error?: string } | undefined;

/** Customer membuat order (Beli). Harga diambil server-side dari paket (RPC). */
export async function createCustomerOrderAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const serviceId = String(formData.get("service_id") ?? "");
  const qty = Math.max(1, Number(formData.get("qty") ?? 1));
  const notes = String(formData.get("notes") ?? "");
  if (!serviceId) return { ok: false, error: "Paket belum dipilih" };

  const ref = (await cookies()).get("ia_ref")?.value ?? "";

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_customer_order", {
    payload: {
      items: [{ service_id: serviceId, qty }],
      notes,
      referral_code: ref,
    },
  });

  if (error) return { ok: false, error: error.message };

  const orderId = data as string;

  // Email konfirmasi order (outbox → dikirim Brevo via dispatch). Aman bila gagal.
  try {
    const user = await getSessionUser();
    if (user?.email) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
      await enqueueNotifications([
        {
          order_id: orderId,
          channel: "email",
          target: user.email,
          payload: {
            kind: "order_created",
            link: `${appUrl}/akun/pesanan/${orderId}`,
            subject: "Pesanan Anda Diterima — ImpactAqiqah",
          },
        },
      ]);
    }
  } catch {
    /* abaikan kegagalan enqueue */
  }

  // Alert admin via Telegram (fire-and-forget, aman bila nonaktif)
  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    await sendTelegramAdmin(
      `🆕 <b>Order baru</b>\nID: ${orderId}\n${appUrl}/orders/${orderId}`,
    );
  } catch {
    /* abaikan */
  }

  revalidatePath("/akun");
  redirect(`/akun/pesanan/${orderId}`);
}

import { createAdminClient } from "@/lib/supabase/admin";

// Enqueue ke outbox notifications (docs/12). Outbox tertutup dari user (RLS),
// jadi penulisan memakai admin client server-side. n8n memproses outbox (Tahap 8).

export interface NotificationInput {
  order_id?: string;
  channel: "whatsapp" | "email" | "dashboard";
  target?: string | null;
  payload: Record<string, unknown>;
}

export async function enqueueNotifications(items: NotificationInput[]): Promise<void> {
  if (items.length === 0) return;
  const admin = createAdminClient();
  await admin.from("notifications").insert(
    items.map((i) => ({
      order_id: i.order_id ?? null,
      channel: i.channel,
      target: i.target ?? null,
      payload: i.payload,
      status: "queued",
    })),
  );
}

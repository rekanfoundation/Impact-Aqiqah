import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendTransactionalEmail, brevoEnabled } from "@/lib/brevo";

export const runtime = "nodejs";

interface NotifRow {
  id: string;
  channel: string;
  target: string | null;
  payload: Record<string, unknown>;
}

function emailHtml(p: Record<string, unknown>): { subject: string; html: string } {
  const link = (p.link as string) ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
  const kind = (p.kind as string) ?? "info";
  if (kind === "report_ready") {
    return {
      subject: (p.subject as string) ?? "Laporan Pelaksanaan Aqiqah Anda",
      html: `<p>Assalamu'alaikum,</p><p>Alhamdulillah pelaksanaan ibadah Anda telah selesai. Lihat laporan & dokumentasi:</p><p><a href="${link}">${link}</a></p><p>— ImpactAqiqah · Zakat Sukses</p>`,
    };
  }
  if (kind === "order_created") {
    return {
      subject: (p.subject as string) ?? "Pesanan Anda Diterima — ImpactAqiqah",
      html: `<p>Terima kasih, pesanan Anda telah kami terima.</p><p>Pantau perjalanan pesanan: <a href="${link}">${link}</a></p><p>Tim kami akan menghubungi Anda untuk konfirmasi pembayaran & jadwal.</p><p>— ImpactAqiqah</p>`,
    };
  }
  return {
    subject: (p.subject as string) ?? "Notifikasi ImpactAqiqah",
    html: `<p>${(p.message as string) ?? "Anda memiliki notifikasi baru."}</p><p><a href="${link}">${link}</a></p>`,
  };
}

/**
 * POST /api/internal/notifications/dispatch (docs/12/18).
 * Email dikirim via Brevo; WhatsApp dikembalikan untuk diproses n8n.
 * Guard: header x-webhook-secret == N8N_WEBHOOK_SECRET.
 */
export async function POST(req: Request) {
  const secret = req.headers.get("x-webhook-secret");
  if (!process.env.N8N_WEBHOOK_SECRET || secret !== process.env.N8N_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Secret tidak valid" } },
      { status: 401 },
    );
  }

  const admin = createAdminClient();
  const { data: queued, error } = await admin
    .from("notifications")
    .select("id, channel, target, payload")
    .eq("status", "queued")
    .in("channel", ["whatsapp", "email"])
    .limit(100);

  if (error) {
    return NextResponse.json(
      { error: { code: "DB_ERROR", message: error.message } },
      { status: 500 },
    );
  }

  const items = (queued ?? []) as NotifRow[];
  const waItems: NotifRow[] = [];
  let emailSent = 0;
  let emailFailed = 0;

  for (const it of items) {
    if (it.channel === "email") {
      const { subject, html } = emailHtml(it.payload);
      const ok = it.target
        ? await sendTransactionalEmail({ to: it.target, subject, html })
        : false;
      await admin
        .from("notifications")
        .update({
          status: ok ? "sent" : "failed",
          sent_at: ok ? new Date().toISOString() : null,
        })
        .eq("id", it.id);
      ok ? emailSent++ : emailFailed++;
    } else {
      // whatsapp: tandai sent (pengiriman aktual oleh n8n dari payload)
      waItems.push(it);
      await admin
        .from("notifications")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", it.id);
    }
  }

  return NextResponse.json({
    data: {
      processed: items.length,
      email: { sent: emailSent, failed: emailFailed, provider: brevoEnabled() ? "brevo" : "none" },
      whatsapp: waItems,
    },
  });
}

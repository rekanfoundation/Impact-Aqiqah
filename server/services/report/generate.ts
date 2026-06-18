import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET, buildReportPath } from "@/lib/storage";
import { enqueueNotifications } from "@/server/services/notifications/enqueue";
import { buildWaLink, reportReadyMessage } from "@/lib/wa";
import { ReportDocument, type ReportData } from "./document";

/**
 * Generate laporan PDF untuk sebuah order (docs/11):
 * kumpulkan data -> render PDF -> unggah ke bucket reports -> upsert reports (version++).
 * Idempoten terhadap token: public_token order tidak berubah.
 */
export async function generateReport(orderId: string): Promise<{
  ok: boolean;
  error?: string;
  token?: string;
}> {
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number, status, created_at, public_token, branch:branches(name), participant:participants(name,phone,email)")
    .eq("id", orderId)
    .single();

  if (!order) return { ok: false, error: "Order tidak ditemukan" };

  const o = order as unknown as {
    id: string;
    order_number: string;
    status: string;
    created_at: string;
    public_token: string;
    branch: { name: string } | null;
    participant: { name: string; phone: string | null; email: string | null } | null;
  };

  const [{ data: items }, { data: animals }, { data: dists }, { data: media }, { data: sched }] =
    await Promise.all([
      supabase.from("order_items").select("qty, service:services(name)").eq("order_id", orderId),
      supabase.from("animals").select("status").eq("order_id", orderId),
      supabase.from("distributions").select("recipient_name, recipient_area, packages_count").eq("order_id", orderId),
      supabase.from("documentations").select("type, stage, caption").eq("order_id", orderId).eq("status", "approved"),
      supabase.from("schedules").select("scheduled_date, location:locations(name)").eq("order_id", orderId).maybeSingle(),
    ]);

  const data: ReportData = {
    order_number: o.order_number,
    status: o.status,
    participant: o.participant?.name ?? null,
    branch: o.branch?.name ?? null,
    created_at: o.created_at,
    schedule: sched
      ? {
          date: (sched as unknown as { scheduled_date: string | null }).scheduled_date,
          location:
            (sched as unknown as { location: { name: string } | { name: string }[] | null })
              .location instanceof Array
              ? ((sched as unknown as { location: { name: string }[] }).location[0]?.name ?? null)
              : ((sched as unknown as { location: { name: string } | null }).location?.name ?? null),
        }
      : null,
    items: ((items ?? []) as unknown as Array<{ qty: number; service: { name: string } | null }>).map(
      (i) => ({ name: i.service?.name ?? "—", qty: i.qty }),
    ),
    animals_total: (animals ?? []).length,
    animals_distributed: ((animals ?? []) as Array<{ status: string }>).filter(
      (a) => a.status === "distributed",
    ).length,
    distributions: ((dists ?? []) as Array<{ recipient_name: string | null; recipient_area: string | null; packages_count: number }>).map(
      (d) => ({ recipient: d.recipient_name, area: d.recipient_area, packages: d.packages_count }),
    ),
    media: ((media ?? []) as Array<{ type: string; stage: string; caption: string | null }>).map((m) => ({
      type: m.type,
      stage: m.stage,
      caption: m.caption,
    })),
  };

  // versi berikutnya
  const { data: lastReport } = await supabase
    .from("reports")
    .select("version")
    .eq("order_id", orderId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const version = ((lastReport as { version?: number } | null)?.version ?? 0) + 1;

  // render PDF — panggil komponen langsung agar menghasilkan elemen <Document>
  const buffer = await renderToBuffer(ReportDocument({ data }));
  const path = buildReportPath(o.order_number, version);

  // unggah via admin (bucket reports privat)
  const admin = createAdminClient();
  const { error: upErr } = await admin.storage
    .from(BUCKET.reports)
    .upload(path, buffer, { contentType: "application/pdf", upsert: true });
  if (upErr) return { ok: false, error: `Gagal unggah PDF: ${upErr.message}` };

  // reports.public_token dibiarkan default (unik per versi). Link publik memakai
  // orders.public_token (stabil) via get_public_report.
  const { error: insErr } = await supabase.from("reports").insert({
    order_id: orderId,
    pdf_path: path,
    generated_by: "app",
    version,
  });
  if (insErr) return { ok: false, error: insErr.message };

  // Enqueue notifikasi laporan siap (WA + Email) ke outbox — diproses n8n (docs/12/18).
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const link = `${appUrl}/r/${o.public_token}`;
  const serviceName = data.items[0]?.name ?? "ibadah";
  const msg = reportReadyMessage({
    name: o.participant?.name ?? "Bapak/Ibu",
    service: serviceName,
    orderNumber: o.order_number,
    link,
  });
  try {
    const notifs = [];
    if (o.participant?.phone)
      notifs.push({
        order_id: orderId,
        channel: "whatsapp" as const,
        target: o.participant.phone,
        payload: { kind: "report_ready", link, wa_link: buildWaLink(o.participant.phone, msg) },
      });
    if (o.participant?.email)
      notifs.push({
        order_id: orderId,
        channel: "email" as const,
        target: o.participant.email,
        payload: { kind: "report_ready", link, subject: `Laporan ${o.order_number}` },
      });
    await enqueueNotifications(notifs);
  } catch {
    // gagal enqueue tidak membatalkan laporan; n8n reminder akan menyusul.
  }

  return { ok: true, token: o.public_token };
}

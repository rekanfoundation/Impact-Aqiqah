import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET, buildReportPath } from "@/lib/storage";
import { enqueueNotifications } from "@/server/services/notifications/enqueue";
import { buildWaLink, reportReadyMessage } from "@/lib/wa";
import { reportNarrative } from "@/server/ai";
import { ReportDocument, type ReportData } from "./document";

export interface ReportContext {
  data: ReportData;
  meta: {
    public_token: string;
    participant_phone: string | null;
    participant_email: string | null;
  };
}

/**
 * Kumpulkan seluruh data laporan untuk sebuah order (tanpa render).
 * Dipakai ulang oleh generateReport dan endpoint draft narasi (AI Report Writer).
 */
export async function collectReportData(orderId: string): Promise<ReportContext | null> {
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, order_number, status, created_at, public_token, branch:branches(name), participant:participants(name,phone,email)")
    .eq("id", orderId)
    .single();

  if (!order) return null;

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

  return {
    data,
    meta: {
      public_token: o.public_token,
      participant_phone: o.participant?.phone ?? null,
      participant_email: o.participant?.email ?? null,
    },
  };
}

/**
 * Draf narasi laporan (AI Report Writer) untuk sebuah order — tanpa generate PDF.
 * Dipakai langkah review manusia sebelum laporan final dibuat.
 */
export async function draftReportNarrative(
  orderId: string,
): Promise<{ ok: boolean; error?: string; text?: string; ai?: boolean }> {
  const ctx = await collectReportData(orderId);
  if (!ctx) return { ok: false, error: "Order tidak ditemukan" };
  const { text, ai } = await reportNarrative({
    participant: ctx.data.participant,
    service: ctx.data.items[0]?.name ?? "ibadah",
    branch: ctx.data.branch,
    animals_distributed: ctx.data.animals_distributed,
    animals_total: ctx.data.animals_total,
  });
  return { ok: true, text, ai };
}

/**
 * Generate laporan PDF untuk sebuah order (docs/11):
 * kumpulkan data -> (narasi AI/review) -> render PDF -> unggah ke bucket reports -> upsert reports (version++).
 * Idempoten terhadap token: public_token order tidak berubah.
 *
 * opts.narrative: bila diberikan (hasil review manusia) dipakai apa adanya (narrative_ai=false);
 * bila kosong, draf otomatis via reportNarrative() (narrative_ai mengikuti apakah AI aktif).
 */
export async function generateReport(
  orderId: string,
  opts?: { narrative?: string },
): Promise<{ ok: boolean; error?: string; token?: string }> {
  const ctx = await collectReportData(orderId);
  if (!ctx) return { ok: false, error: "Order tidak ditemukan" };

  const { data, meta } = ctx;
  const serviceName = data.items[0]?.name ?? "ibadah";

  // Narasi: pakai hasil review bila ada, else draf AI/fallback.
  let narrativeAi = false;
  const reviewed = opts?.narrative?.trim();
  if (reviewed) {
    data.narrative = reviewed;
  } else {
    const n = await reportNarrative({
      participant: data.participant,
      service: serviceName,
      branch: data.branch,
      animals_distributed: data.animals_distributed,
      animals_total: data.animals_total,
    });
    data.narrative = n.text;
    narrativeAi = n.ai;
  }

  const supabase = await createClient();

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
  const path = buildReportPath(data.order_number, version);

  // unggah via admin (bucket reports privat)
  const admin = createAdminClient();
  const { error: upErr } = await admin.storage
    .from(BUCKET.reports)
    .upload(path, buffer, { contentType: "application/pdf", upsert: true });
  if (upErr) return { ok: false, error: `Gagal unggah PDF: ${upErr.message}` };

  // reports.public_token dibiarkan default (unik per versi). Link publik memakai
  // orders.public_token (stabil) via get_public_report.
  const baseRow = { order_id: orderId, pdf_path: path, generated_by: "app", version };
  let { error: insErr } = await supabase
    .from("reports")
    .insert({ ...baseRow, narrative: data.narrative ?? null, narrative_ai: narrativeAi });
  // Resilient: bila migration 20 (kolom narrative) belum diterapkan, ulangi tanpa kolom itu.
  // Narasi tetap tertanam di PDF; hanya tidak dipersist sampai migrasi dijalankan.
  if (insErr && /narrative|column|schema cache|PGRST204/i.test(insErr.message)) {
    ({ error: insErr } = await supabase.from("reports").insert(baseRow));
  }
  if (insErr) return { ok: false, error: insErr.message };

  // Enqueue notifikasi laporan siap (WA + Email) ke outbox — diproses n8n (docs/12/18).
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const link = `${appUrl}/r/${meta.public_token}`;
  const msg = reportReadyMessage({
    name: data.participant ?? "Bapak/Ibu",
    service: serviceName,
    orderNumber: data.order_number,
    link,
  });
  try {
    const notifs = [];
    if (meta.participant_phone)
      notifs.push({
        order_id: orderId,
        channel: "whatsapp" as const,
        target: meta.participant_phone,
        payload: { kind: "report_ready", link, wa_link: buildWaLink(meta.participant_phone, msg) },
      });
    if (meta.participant_email)
      notifs.push({
        order_id: orderId,
        channel: "email" as const,
        target: meta.participant_email,
        payload: { kind: "report_ready", link, subject: `Laporan ${data.order_number}` },
      });
    await enqueueNotifications(notifs);
  } catch {
    // gagal enqueue tidak membatalkan laporan; n8n reminder akan menyusul.
  }

  return { ok: true, token: meta.public_token };
}

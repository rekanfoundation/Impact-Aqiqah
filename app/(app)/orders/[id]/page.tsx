import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { getOrderDetail, getLocations, getPetugas } from "@/server/db/queries";
import { formatIDR, formatDate, formatDateTime } from "@/lib/utils";
import {
  StatusControl,
  PaymentForm,
  ScheduleForm,
  SlaughterButton,
  DistributionForm,
  IssueForm,
  ResolveIssueButton,
} from "@/features/orders/order-forms";
import { MediaUploader } from "@/features/documentation/doc-forms";
import { GenerateReportButton } from "@/features/orders/generate-report-button";
import type {
  Order,
  Participant,
  Branch,
  Animal,
  Payment,
  Distribution,
  Documentation,
  Issue,
} from "@/types/db";
import type { OrderStatus } from "@/lib/status";

export const metadata = { title: "Detail Order" };

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = (await getOrderDetail(id)) as
    | (Order & {
        participant: Participant | null;
        branch: Branch | null;
        items: Array<{ id: string; qty: number; unit_price: number; service: { name: string } | null }>;
        animals: Animal[];
        payments: Payment[];
        schedule: { location: { name: string } | null; pic: { full_name: string | null } | null; scheduled_date: string | null } | null;
        distributions: Distribution[];
        documentations: Documentation[];
        issues: Issue[];
      })
    | null;

  if (!order) notFound();

  const [locations, petugas] = await Promise.all([
    getLocations(order.branch_id),
    getPetugas(order.branch_id),
  ]);

  const openIssues = order.issues.filter((i) => i.status !== "resolved");

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={order.order_number}
        description={`${order.participant?.name ?? "—"} · ${order.branch?.name ?? "—"}`}
        action={
          <div className="flex gap-2">
            <StatusBadge kind="order" value={order.status} />
            <StatusBadge kind="payment" value={order.payment_status} />
          </div>
        }
      />

      {/* Kontrol status */}
      <Card>
        <CardHeader title="Status & Alur" />
        <CardBody>
          <StatusControl orderId={order.id} current={order.status as OrderStatus} />
        </CardBody>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Info & item */}
        <Card>
          <CardHeader title="Informasi" />
          <CardBody className="text-sm">
            <dl className="grid grid-cols-[120px_1fr] gap-y-1">
              <dt className="text-neutral-500">Total</dt>
              <dd className="font-semibold">{formatIDR(order.total_amount)}</dd>
              <dt className="text-neutral-500">Dibuat</dt>
              <dd>{formatDate(order.created_at)}</dd>
              <dt className="text-neutral-500">Catatan</dt>
              <dd>{order.notes ?? "—"}</dd>
            </dl>
            <div className="mt-3 border-t border-neutral-100 pt-3">
              <p className="mb-1 font-medium text-neutral-700">Layanan</p>
              <ul className="space-y-1">
                {order.items.map((it) => (
                  <li key={it.id} className="flex justify-between">
                    <span>
                      {it.service?.name ?? "—"} × {it.qty}
                    </span>
                    <span className="text-neutral-500">{formatIDR(it.unit_price * it.qty)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardBody>
        </Card>

        {/* Pembayaran */}
        <Card>
          <CardHeader title="Pembayaran" />
          <CardBody className="text-sm">
            <ul className="mb-3 space-y-1">
              {order.payments.length === 0 && (
                <li className="text-neutral-500">Belum ada pembayaran.</li>
              )}
              {order.payments.map((p) => (
                <li key={p.id} className="flex justify-between">
                  <span>{formatIDR(p.amount)} · {p.method ?? "—"}</span>
                  <span className="text-neutral-500">{formatDate(p.created_at)}</span>
                </li>
              ))}
            </ul>
            <PaymentForm orderId={order.id} />
          </CardBody>
        </Card>

        {/* Jadwal */}
        <Card>
          <CardHeader title="Jadwal & PIC" />
          <CardBody className="text-sm">
            {order.schedule ? (
              <dl className="mb-3 grid grid-cols-[120px_1fr] gap-y-1">
                <dt className="text-neutral-500">Lokasi</dt>
                <dd>{order.schedule.location?.name ?? "—"}</dd>
                <dt className="text-neutral-500">PIC</dt>
                <dd>{order.schedule.pic?.full_name ?? "—"}</dd>
                <dt className="text-neutral-500">Tanggal</dt>
                <dd>{formatDate(order.schedule.scheduled_date)}</dd>
              </dl>
            ) : (
              <p className="mb-3 text-neutral-500">Belum dijadwalkan.</p>
            )}
            <ScheduleForm
              orderId={order.id}
              locations={locations}
              petugas={petugas.map((p) => ({ id: p.id, full_name: p.full_name }))}
            />
          </CardBody>
        </Card>

        {/* Hewan */}
        <Card>
          <CardHeader title={`Hewan (${order.animals.length})`} />
          <CardBody className="text-sm">
            <ul className="space-y-2">
              {order.animals.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2">
                  <span>
                    {a.species} {a.on_behalf_of ? `· ${a.on_behalf_of}` : ""}{" "}
                    <StatusBadge kind="animal" value={a.status} />
                  </span>
                  {a.status === "registered" || a.status === "prepared" ? (
                    <SlaughterButton orderId={order.id} animalId={a.id} />
                  ) : null}
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>

        {/* Distribusi */}
        <Card>
          <CardHeader title="Distribusi" />
          <CardBody className="text-sm">
            <ul className="mb-3 space-y-1">
              {order.distributions.length === 0 && (
                <li className="text-neutral-500">Belum ada distribusi.</li>
              )}
              {order.distributions.map((d) => (
                <li key={d.id} className="flex justify-between">
                  <span>{d.recipient_name} · {d.recipient_area ?? "—"}</span>
                  <span className="text-neutral-500">{d.packages_count} paket</span>
                </li>
              ))}
            </ul>
            <DistributionForm orderId={order.id} />
          </CardBody>
        </Card>

        {/* Kendala */}
        <Card>
          <CardHeader title={`Kendala (${openIssues.length} terbuka)`} />
          <CardBody className="text-sm">
            <ul className="mb-3 space-y-1">
              {order.issues.map((i) => (
                <li key={i.id} className="flex items-center justify-between gap-2">
                  <span>
                    <StatusBadge kind="issueSeverity" value={i.severity} /> {i.title}
                  </span>
                  {i.status !== "resolved" ? (
                    <ResolveIssueButton orderId={order.id} issueId={i.id} />
                  ) : (
                    <span className="text-xs text-[var(--color-success)]">selesai</span>
                  )}
                </li>
              ))}
            </ul>
            <IssueForm orderId={order.id} />
          </CardBody>
        </Card>
      </div>

      {/* Dokumentasi ringkas (penuh di Tahap 5) */}
      <Card>
        <CardHeader title={`Dokumentasi (${order.documentations.length})`} />
        <CardBody className="flex flex-col gap-3 text-sm">
          {order.documentations.length === 0 ? (
            <p className="text-neutral-500">Belum ada dokumentasi.</p>
          ) : (
            <ul className="space-y-1">
              {order.documentations.map((d) => (
                <li key={d.id} className="flex justify-between">
                  <span>
                    {d.type} · {d.stage} — {d.caption ?? "—"}
                  </span>
                  <StatusBadge kind="doc" value={d.status} />
                </li>
              ))}
            </ul>
          )}
          <div className="border-t border-neutral-100 pt-3">
            <p className="mb-2 font-medium text-neutral-700">Unggah Dokumentasi</p>
            <MediaUploader orderId={order.id} />
          </div>
        </CardBody>
      </Card>

      {/* Laporan — tersedia saat tahap pelaporan/selesai */}
      {["reporting", "completed"].includes(order.status) && (
        <Card>
          <CardHeader title="Laporan Peserta" />
          <CardBody className="flex flex-col gap-2 text-sm">
            <p className="text-neutral-600">
              Generate PDF & bagikan link publik (peserta tanpa login).
            </p>
            <GenerateReportButton orderId={order.id} publicToken={order.public_token} />
          </CardBody>
        </Card>
      )}

      <p className="text-xs text-neutral-400">
        Terakhir diperbarui {formatDateTime(order.updated_at)}.
      </p>
    </div>
  );
}

import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { requireCustomer } from "@/server/auth/session";
import { formatIDR, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { PayButton } from "@/features/customer/pay-button";
import type { OrderStatus } from "@/lib/status";

export const metadata = { title: "Lacak Pesanan" };

// 6 tahap perjalanan pesanan untuk customer (peta dari order_status).
const STAGES = [
  "Pesanan Dibuat",
  "Pembayaran & Konsultasi",
  "Penjadwalan",
  "Penyembelihan",
  "Pengolahan & Distribusi",
  "Laporan & Selesai",
];

function currentStage(status: OrderStatus): number {
  const map: Record<OrderStatus, number> = {
    new: 1,
    paid: 2,
    scheduled: 3,
    preparation: 4,
    slaughtering: 4,
    distribution: 5,
    documentation: 5,
    reporting: 6,
    completed: 6,
    on_hold: 1,
    cancelled: 0,
  };
  return map[status] ?? 1;
}

export default async function TrackOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paid?: string }>;
}) {
  await requireCustomer();
  const { id } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select(
      "id, order_number, status, payment_status, total_amount, created_at, public_token, customer_id, items:order_items(qty, service:services(name))",
    )
    .eq("id", id)
    .single();

  if (!data) notFound();

  // Nominal pembayaran (untuk tombol bayar)
  const [{ data: paidVal }, { data: ratioVal }] = await Promise.all([
    supabase.rpc("order_paid_amount", { p_order_id: id }),
    supabase.rpc("effective_min_dp_ratio", { p_order_id: id }),
  ]);
  const o = data as unknown as {
    order_number: string;
    status: OrderStatus;
    payment_status: "unpaid" | "partial" | "paid";
    total_amount: number;
    created_at: string;
    public_token: string;
    items: Array<{ qty: number; service: { name: string } | null }>;
  };

  const stage = currentStage(o.status);
  const cancelled = o.status === "cancelled";
  const showReport = ["reporting", "completed"].includes(o.status);

  const paidAmount = Number(paidVal ?? 0);
  const dpRatio = Number(ratioVal ?? 0.5);
  const remaining = Math.max(0, Number(o.total_amount) - paidAmount);
  const dpAmount = Math.max(0, Math.ceil(Number(o.total_amount) * dpRatio) - paidAmount);
  const canPay = o.payment_status !== "paid" && !cancelled && remaining > 0;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={o.order_number}
        description={`Dibuat ${formatDate(o.created_at)}`}
        action={<StatusBadge kind="order" value={o.status} />}
      />

      <Card>
        <CardHeader title="Perjalanan Pesanan" />
        <CardBody>
          {cancelled ? (
            <p className="text-sm text-[var(--color-danger)]">Pesanan dibatalkan.</p>
          ) : (
            <ol className="relative ml-3 border-l border-neutral-200">
              {STAGES.map((label, i) => {
                const n = i + 1;
                const done = n < stage;
                const active = n === stage;
                return (
                  <li key={label} className="mb-5 ml-4">
                    <span
                      className={cn(
                        "absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full",
                        done && "bg-[var(--color-accent)]",
                        active && "bg-[var(--color-primary)]",
                        !done && !active && "bg-neutral-300",
                      )}
                    />
                    <p
                      className={cn(
                        "text-sm",
                        active ? "font-semibold text-neutral-900" : "text-neutral-500",
                      )}
                    >
                      {label}
                      {active && " — sedang berjalan"}
                      {done && " ✓"}
                    </p>
                  </li>
                );
              })}
            </ol>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Rincian" />
        <CardBody className="text-sm">
          <ul className="mb-3 space-y-1">
            {o.items.map((it, i) => (
              <li key={i} className="flex justify-between">
                <span>{it.service?.name ?? "—"} × {it.qty}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between border-t border-neutral-100 pt-2">
            <span className="text-neutral-500">Total</span>
            <span className="font-bold">{formatIDR(o.total_amount)}</span>
          </div>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-neutral-500">Pembayaran</span>
            <StatusBadge kind="payment" value={o.payment_status} />
          </div>
          {paidAmount > 0 && (
            <div className="mt-1 flex items-center justify-between text-xs text-neutral-500">
              <span>Terbayar / Sisa</span>
              <span>{formatIDR(paidAmount)} / {formatIDR(remaining)}</span>
            </div>
          )}

          {sp.paid === "1" && (
            <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
              Pembayaran sedang diproses. Status diperbarui otomatis setelah dikonfirmasi.
            </p>
          )}

          {canPay && (
            <div className="mt-4 border-t border-neutral-100 pt-3">
              <PayButton orderId={id} remaining={remaining} dpAmount={dpAmount} allowDp={dpRatio < 1} />
            </div>
          )}

          {showReport && (
            <Link
              href={`/r/${o.public_token}`}
              target="_blank"
              className="mt-4 inline-block rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white"
            >
              Lihat Laporan Pelaksanaan →
            </Link>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { listOrders } from "@/server/db/queries";
import { formatIDR, formatDate } from "@/lib/utils";
import { ORDER_STATUS } from "@/lib/status";

export const metadata = { title: "Order" };

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const orders = await listOrders({ status: sp.status, q: sp.q });

  return (
    <div>
      <PageHeader
        title="Order"
        description="Seluruh order Aqiqah, Qurban, dan Sedekah Daging."
        action={
          <Link href="/orders/new">
            <Button>+ Order Baru</Button>
          </Link>
        }
      />

      {/* Filter status */}
      <form className="mb-4 flex flex-wrap items-center gap-2" action="/orders">
        <input
          name="q"
          defaultValue={sp.q}
          placeholder="Cari nomor order…"
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
        <select
          name="status"
          defaultValue={sp.status ?? ""}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="">Semua status</option>
          {Object.entries(ORDER_STATUS).map(([k, v]) => (
            <option key={k} value={k}>
              {v.label}
            </option>
          ))}
        </select>
        <Button variant="secondary" size="sm" type="submit">
          Filter
        </Button>
      </form>

      {orders.length === 0 ? (
        <EmptyState
          title="Belum ada order"
          description="Buat order baru untuk memulai."
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-100 text-left text-neutral-500">
              <tr>
                <th className="px-4 py-2.5">Nomor</th>
                <th className="px-4 py-2.5">Peserta</th>
                <th className="px-4 py-2.5">Cabang</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Bayar</th>
                <th className="px-4 py-2.5">Total</th>
                <th className="px-4 py-2.5">Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-neutral-50 hover:bg-neutral-50">
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/orders/${o.id}`}
                      className="font-medium text-[var(--color-primary)] hover:underline"
                    >
                      {o.order_number}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">{o.participant?.name ?? "—"}</td>
                  <td className="px-4 py-2.5">{o.branch?.name ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge kind="order" value={o.status} />
                  </td>
                  <td className="px-4 py-2.5">
                    <StatusBadge kind="payment" value={o.payment_status} />
                  </td>
                  <td className="px-4 py-2.5">{formatIDR(o.total_amount)}</td>
                  <td className="px-4 py-2.5 text-neutral-500">
                    {formatDate(o.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

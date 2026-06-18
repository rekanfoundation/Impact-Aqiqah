import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { listOrders } from "@/server/db/queries";
import { requireRole } from "@/server/auth/session";
import { formatIDR } from "@/lib/utils";

export const metadata = { title: "Pembayaran" };

export default async function PaymentsPage() {
  await requireRole(["manager_program", "admin_cabang"]);
  const orders = await listOrders();
  const unpaid = orders.filter((o) => o.payment_status !== "paid");

  return (
    <div>
      <PageHeader
        title="Pembayaran"
        description="Order yang belum lunas — verifikasi dari detail order."
      />
      {unpaid.length === 0 ? (
        <EmptyState title="Semua order lunas" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-100 text-left text-neutral-500">
              <tr>
                <th className="px-4 py-2.5">Nomor</th>
                <th className="px-4 py-2.5">Peserta</th>
                <th className="px-4 py-2.5">Total</th>
                <th className="px-4 py-2.5">Status Bayar</th>
              </tr>
            </thead>
            <tbody>
              {unpaid.map((o) => (
                <tr key={o.id} className="border-b border-neutral-50 hover:bg-neutral-50">
                  <td className="px-4 py-2.5">
                    <Link href={`/orders/${o.id}`} className="font-medium text-[var(--color-primary)] hover:underline">
                      {o.order_number}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">{o.participant?.name ?? "—"}</td>
                  <td className="px-4 py-2.5">{formatIDR(o.total_amount)}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge kind="payment" value={o.payment_status} />
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

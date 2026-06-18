import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { listOrders } from "@/server/db/queries";
import { StatusBadge } from "@/components/ui/badge";

export const metadata = { title: "Laporan" };

export default async function ReportsPage() {
  // Order pada tahap pelaporan/selesai — generate & kirim laporan dari detail (Tahap 6).
  const orders = await listOrders();
  const reportable = orders.filter((o) =>
    ["reporting", "completed"].includes(o.status),
  );

  return (
    <div>
      <PageHeader
        title="Laporan"
        description="Order siap dilaporkan / sudah selesai. Generate & bagikan dari detail order."
      />
      {reportable.length === 0 ? (
        <EmptyState title="Belum ada order pada tahap pelaporan" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-100 text-left text-neutral-500">
              <tr>
                <th className="px-4 py-2.5">Nomor</th>
                <th className="px-4 py-2.5">Peserta</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {reportable.map((o) => (
                <tr key={o.id} className="border-b border-neutral-50 hover:bg-neutral-50">
                  <td className="px-4 py-2.5">
                    <Link href={`/orders/${o.id}`} className="font-medium text-[var(--color-primary)] hover:underline">
                      {o.order_number}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">{o.participant?.name ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge kind="order" value={o.status} />
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

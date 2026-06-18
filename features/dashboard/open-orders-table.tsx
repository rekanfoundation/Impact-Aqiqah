import Link from "next/link";
import { StatusBadge, Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { OpenOrderRow } from "@/types/db";
import type { IssueSeverity } from "@/lib/status";

/**
 * Tabel "Order Belum Selesai" — INTI LITMUS TEST (docs/09 §3):
 * order + lokasi + PIC + kendala, terjawab < 10 detik.
 */
export function OpenOrdersTable({ rows }: { rows: OpenOrderRow[] }) {
  if (rows.length === 0) {
    return <EmptyState title="Tidak ada order tertunda" description="Semua order selesai 🎉" />;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-neutral-100 text-left text-neutral-500">
          <tr>
            <th className="px-4 py-2.5">Order</th>
            <th className="px-4 py-2.5">Cabang</th>
            <th className="px-4 py-2.5">Lokasi</th>
            <th className="px-4 py-2.5">PIC</th>
            <th className="px-4 py-2.5">Status</th>
            <th className="px-4 py-2.5">Kendala</th>
            <th className="px-4 py-2.5">Umur</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.order_id} className="border-b border-neutral-50 hover:bg-neutral-50">
              <td className="px-4 py-2.5">
                <Link
                  href={`/orders/${r.order_id}`}
                  className="font-medium text-[var(--color-primary)] hover:underline"
                >
                  {r.order_number}
                </Link>
              </td>
              <td className="px-4 py-2.5">{r.branch_name}</td>
              <td className="px-4 py-2.5">{r.location_name ?? "—"}</td>
              <td className="px-4 py-2.5">{r.pic_name ?? "—"}</td>
              <td className="px-4 py-2.5">
                <StatusBadge kind="order" value={r.status} />
              </td>
              <td className="px-4 py-2.5">
                {r.open_issues > 0 ? (
                  <StatusBadge
                    kind="issueSeverity"
                    value={(r.max_severity as IssueSeverity) ?? "low"}
                  />
                ) : (
                  <Badge label="—" tone="neutral" />
                )}
              </td>
              <td className="px-4 py-2.5 text-neutral-500">{r.age_hours} jam</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

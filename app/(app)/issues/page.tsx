import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import type { Issue } from "@/types/db";

export const metadata = { title: "Kendala" };

interface IssueRow extends Issue {
  order: { id: string; order_number: string } | null;
}

export default async function IssuesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("issues")
    .select("*, order:orders(id,order_number)")
    .neq("status", "resolved")
    .order("created_at", { ascending: false })
    .limit(100);
  const issues = (data ?? []) as unknown as IssueRow[];

  return (
    <div>
      <PageHeader title="Kendala" description="Issue terbuka pada seluruh order yang dapat Anda akses." />
      {issues.length === 0 ? (
        <EmptyState title="Tidak ada kendala terbuka" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-100 text-left text-neutral-500">
              <tr>
                <th className="px-4 py-2.5">Order</th>
                <th className="px-4 py-2.5">Kendala</th>
                <th className="px-4 py-2.5">Severity</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((i) => (
                <tr key={i.id} className="border-b border-neutral-50 hover:bg-neutral-50">
                  <td className="px-4 py-2.5">
                    {i.order ? (
                      <Link href={`/orders/${i.order.id}`} className="font-medium text-[var(--color-primary)] hover:underline">
                        {i.order.order_number}
                      </Link>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-2.5">{i.title}</td>
                  <td className="px-4 py-2.5"><StatusBadge kind="issueSeverity" value={i.severity} /></td>
                  <td className="px-4 py-2.5"><StatusBadge kind="issueStatus" value={i.status} /></td>
                  <td className="px-4 py-2.5 text-neutral-500">{formatDate(i.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

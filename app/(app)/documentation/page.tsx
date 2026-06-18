import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/server/auth/session";
import { ReviewControls } from "@/features/documentation/doc-forms";
import { formatDate } from "@/lib/utils";
import type { Documentation } from "@/types/db";

export const metadata = { title: "Validasi Dokumentasi" };

interface DocRow extends Documentation {
  order: { id: string; order_number: string } | null;
}

export default async function DocumentationPage() {
  const profile = await requireRole([
    "manager_program",
    "admin_pusat",
    "admin_cabang",
  ]);

  const supabase = await createClient();
  // Admin Pusat memvalidasi yang sudah lolos supervisor; supervisor memvalidasi pending.
  const statuses =
    profile.role === "admin_pusat"
      ? ["approved_supervisor"]
      : ["pending", "approved_supervisor"];

  const { data } = await supabase
    .from("documentations")
    .select("*, order:orders(id,order_number)")
    .in("status", statuses)
    .order("created_at", { ascending: true })
    .limit(100);
  const docs = (data ?? []) as unknown as DocRow[];

  return (
    <div>
      <PageHeader
        title="Validasi Dokumentasi"
        description={
          profile.role === "admin_pusat"
            ? "Validasi tingkat akhir (Admin Pusat)."
            : "Validasi tingkat-1 (Supervisor) → diteruskan ke Admin Pusat."
        }
      />
      {docs.length === 0 ? (
        <EmptyState title="Tidak ada dokumentasi menunggu validasi" />
      ) : (
        <div className="flex flex-col gap-3">
          {docs.map((d) => (
            <Card key={d.id}>
              <CardBody className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    {d.order ? (
                      <Link
                        href={`/orders/${d.order.id}`}
                        className="font-semibold text-[var(--color-primary)] hover:underline"
                      >
                        {d.order.order_number}
                      </Link>
                    ) : (
                      "—"
                    )}
                    <span className="ml-2 text-neutral-500">
                      {d.type} · {d.stage} · {formatDate(d.created_at)}
                    </span>
                  </div>
                  <StatusBadge kind="doc" value={d.status} />
                </div>
                {d.caption && <p className="text-sm text-neutral-600">{d.caption}</p>}
                <ReviewControls docId={d.id} orderId={d.order?.id ?? ""} />
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

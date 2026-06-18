import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/server/auth/session";
import { formatDate } from "@/lib/utils";
import type { OrderStatus } from "@/lib/status";

export const metadata = { title: "Tugas Saya" };

interface TaskRow {
  order_id: string;
  scheduled_date: string | null;
  order: { id: string; order_number: string; status: OrderStatus } | null;
  location: { name: string } | null;
}

export default async function TugasPage() {
  const user = await getSessionUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("schedules")
    .select("order_id, scheduled_date, order:orders(id,order_number,status), location:locations(name)")
    .eq("pic_user_id", user?.id ?? "")
    .order("scheduled_date", { ascending: true });
  const tasks = (data ?? []) as unknown as TaskRow[];

  return (
    <div>
      <PageHeader title="Tugas Saya" description="Order yang ditugaskan kepada Anda (PIC)." />
      {tasks.length === 0 ? (
        <EmptyState title="Belum ada tugas" description="Tugas muncul setelah admin menjadwalkan order." />
      ) : (
        <div className="flex flex-col gap-3">
          {tasks.map((t) => (
            <Card key={t.order_id}>
              <CardBody className="flex items-center justify-between">
                <div>
                  <Link
                    href={`/orders/${t.order?.id}`}
                    className="font-semibold text-[var(--color-primary)] hover:underline"
                  >
                    {t.order?.order_number}
                  </Link>
                  <p className="text-sm text-neutral-500">
                    {t.location?.name ?? "—"} · {formatDate(t.scheduled_date)}
                  </p>
                </div>
                {t.order && <StatusBadge kind="order" value={t.order.status} />}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

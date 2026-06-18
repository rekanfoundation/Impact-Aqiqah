import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/server/auth/session";
import { formatIDR, formatDate } from "@/lib/utils";
import type { Order } from "@/types/db";

export const metadata = { title: "Pesanan Saya" };

export default async function AkunPage() {
  const user = await getSessionUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("id, order_number, status, payment_status, total_amount, created_at")
    .eq("customer_id", user?.id ?? "")
    .order("created_at", { ascending: false });
  const orders = (data ?? []) as Order[];

  return (
    <div>
      <PageHeader
        title="Pesanan Saya"
        description="Pantau perjalanan setiap pesanan aqiqah Anda."
        action={
          <Link href="/akun/pesan">
            <Button>+ Pesan Baru</Button>
          </Link>
        }
      />
      {orders.length === 0 ? (
        <EmptyState
          title="Belum ada pesanan"
          description="Mulai pesan paket aqiqah Anda."
          action={
            <Link href="/akun/pesan">
              <Button>Pesan Sekarang</Button>
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((o) => (
            <Link key={o.id} href={`/akun/pesanan/${o.id}`}>
              <Card className="transition hover:border-[var(--color-primary)]">
                <CardBody className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-neutral-900">{o.order_number}</div>
                    <div className="text-sm text-neutral-500">
                      {formatIDR(o.total_amount)} · {formatDate(o.created_at)}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge kind="order" value={o.status} />
                    <StatusBadge kind="payment" value={o.payment_status} />
                  </div>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

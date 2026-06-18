import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { CustomerOrderForm } from "@/features/customer/order-form";
import { getPublicPackages } from "@/server/db/public";
import { requireCustomer } from "@/server/auth/session";

export const metadata = { title: "Pesan Baru" };

export default async function PesanPage({
  searchParams,
}: {
  searchParams: Promise<{ paket?: string }>;
}) {
  await requireCustomer();
  const sp = await searchParams;
  const packages = await getPublicPackages();

  return (
    <div>
      <PageHeader title="Pesan Baru" description="Pilih paket dan buat pesanan aqiqah Anda." />
      {packages.length === 0 ? (
        <EmptyState title="Paket belum tersedia" description="Silakan coba lagi nanti." />
      ) : (
        <Card>
          <CardBody>
            <CustomerOrderForm packages={packages} preselect={sp.paket} />
          </CardBody>
        </Card>
      )}
    </div>
  );
}

import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { NewOrderForm } from "@/features/orders/new-order-form";
import { getBranches, getServices } from "@/server/db/queries";
import { requireRole } from "@/server/auth/session";

export const metadata = { title: "Order Baru" };

export default async function NewOrderPage() {
  // Hanya Admin Cabang yang membuat order (docs/07).
  await requireRole(["admin_cabang"]);
  const [branches, services] = await Promise.all([getBranches(), getServices()]);

  return (
    <div>
      <PageHeader title="Order Baru" description="Catat order baru untuk peserta." />
      <Card>
        <CardBody>
          <NewOrderForm branches={branches} services={services} />
        </CardBody>
      </Card>
    </div>
  );
}

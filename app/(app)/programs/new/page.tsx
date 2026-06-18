import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { ServiceForm } from "@/features/programs/service-form";
import { requireRole } from "@/server/auth/session";

export const metadata = { title: "Paket Baru" };

export default async function NewServicePage() {
  await requireRole(["manager_program"]);
  return (
    <div>
      <PageHeader title="Paket Baru" description="Tambah paket ke katalog." />
      <Card>
        <CardBody>
          <ServiceForm />
        </CardBody>
      </Card>
    </div>
  );
}

import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { ServiceForm } from "@/features/programs/service-form";
import { getServiceById } from "@/server/db/queries";
import { requireRole } from "@/server/auth/session";

export const metadata = { title: "Edit Paket" };

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["manager_program"]);
  const { id } = await params;
  const service = await getServiceById(id);
  if (!service) notFound();

  return (
    <div>
      <PageHeader title="Edit Paket" description={service.name} />
      <Card>
        <CardBody>
          <ServiceForm service={service} />
        </CardBody>
      </Card>
    </div>
  );
}

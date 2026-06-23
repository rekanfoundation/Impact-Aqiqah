import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { KpiCard } from "@/features/dashboard/kpi-card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/server/auth/session";
import { getDistributionMap } from "@/server/db/distribution";
import { DistributionMap } from "@/features/distribution/map";

export const metadata = { title: "Distribusi" };

export default async function DistributionPage() {
  await requireRole(["direktur", "manager_program", "admin_pusat", "admin_cabang"]);
  const data = await getDistributionMap();
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Distribution Intelligence"
        description="Sebaran titik potong & distribusi daging beserta heatmap kepadatan paket."
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Titik Potong" value={data.totals.slaughter} />
        <KpiCard label="Titik Distribusi" value={data.totals.points} />
        <KpiCard label="Total Paket" value={data.totals.packages} />
        <KpiCard label="Area Terjangkau" value={data.totals.areas} />
      </section>

      <Card>
        <CardHeader title="Peta Sebaran" />
        <CardBody>
          <DistributionMap apiKey={apiKey} slaughter={data.slaughter} points={data.points} center={data.center} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Rekap per Area" />
        <CardBody className="p-0">
          {data.recap.length === 0 ? (
            <div className="p-4">
              <EmptyState title="Belum ada data distribusi" description="Titik distribusi muncul setelah petugas mencatat penyaluran (lengkap dengan koordinat)." />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-100 text-left text-neutral-500">
                <tr>
                  <th className="px-4 py-2.5">Area Penerima</th>
                  <th className="px-4 py-2.5">Titik</th>
                  <th className="px-4 py-2.5">Paket</th>
                </tr>
              </thead>
              <tbody>
                {data.recap.map((r) => (
                  <tr key={r.area} className="border-b border-neutral-50">
                    <td className="px-4 py-2.5 font-medium text-neutral-800">{r.area}</td>
                    <td className="px-4 py-2.5">{r.points}</td>
                    <td className="px-4 py-2.5">{r.packages}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

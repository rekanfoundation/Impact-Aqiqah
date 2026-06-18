import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getLocations } from "@/server/db/queries";
import { requireRole } from "@/server/auth/session";

export const metadata = { title: "Lokasi" };

export default async function LocationsPage() {
  await requireRole(["manager_program", "admin_cabang"]);
  const locations = await getLocations();

  return (
    <div>
      <PageHeader title="Lokasi" description="Titik pemotongan & distribusi." />
      {locations.length === 0 ? (
        <EmptyState title="Belum ada lokasi" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-100 text-left text-neutral-500">
              <tr>
                <th className="px-4 py-2.5">Nama</th>
                <th className="px-4 py-2.5">Alamat</th>
                <th className="px-4 py-2.5">Koordinat</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((l) => (
                <tr key={l.id} className="border-b border-neutral-50">
                  <td className="px-4 py-2.5 font-medium">{l.name}</td>
                  <td className="px-4 py-2.5 text-neutral-600">{l.address ?? "—"}</td>
                  <td className="px-4 py-2.5 text-neutral-500">
                    {l.lat != null && l.lng != null ? `${l.lat}, ${l.lng}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

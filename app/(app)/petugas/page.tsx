import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { getPetugas } from "@/server/db/queries";
import { requireRole } from "@/server/auth/session";

export const metadata = { title: "Petugas" };

export default async function PetugasPage() {
  await requireRole(["manager_program", "admin_cabang"]);
  const petugas = await getPetugas();

  return (
    <div>
      <PageHeader title="Petugas Lapangan" description="Daftar petugas & penugasan." />
      {petugas.length === 0 ? (
        <EmptyState title="Belum ada petugas" />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-neutral-100 text-left text-neutral-500">
              <tr>
                <th className="px-4 py-2.5">Nama</th>
                <th className="px-4 py-2.5">Email</th>
                <th className="px-4 py-2.5">Telepon</th>
              </tr>
            </thead>
            <tbody>
              {petugas.map((p) => (
                <tr key={p.id} className="border-b border-neutral-50">
                  <td className="px-4 py-2.5 font-medium">{p.full_name ?? "—"}</td>
                  <td className="px-4 py-2.5 text-neutral-600">{p.email ?? "—"}</td>
                  <td className="px-4 py-2.5 text-neutral-500">{p.phone ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

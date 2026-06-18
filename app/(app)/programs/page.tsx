import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getAllServices } from "@/server/db/queries";
import { requireRole } from "@/server/auth/session";
import { formatIDR } from "@/lib/utils";
import { SERVICE_TYPE_LABEL, SERVICE_TYPES, hasilSummary, nasiBoxItems } from "@/lib/packages";
import { ToggleActive } from "@/features/programs/toggle-active";
import type { Service } from "@/types/db";

export const metadata = { title: "Paket & Layanan" };

export default async function ProgramsPage() {
  await requireRole(["manager_program"]);
  const services = await getAllServices();
  const byType = SERVICE_TYPES.map((t) => ({
    type: t,
    items: services.filter((s) => s.type === t),
  })).filter((g) => g.items.length > 0);

  return (
    <div>
      <PageHeader
        title="Paket & Layanan"
        description="Kelola katalog paket — harga & detail dapat diedit di sini."
        action={
          <Link href="/programs/new">
            <Button>+ Paket Baru</Button>
          </Link>
        }
      />

      {services.length === 0 ? (
        <EmptyState title="Belum ada paket" />
      ) : (
        <div className="flex flex-col gap-6">
          {byType.map((group) => (
            <section key={group.type}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
                {SERVICE_TYPE_LABEL[group.type]}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.items.map((s) => (
                  <ServiceCard key={s.id} s={s} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function ServiceCard({ s }: { s: Service }) {
  const hasil = hasilSummary(s);
  const items = nasiBoxItems(s);
  return (
    <Card className="flex flex-col p-4">
      <div className="mb-1 flex items-start justify-between gap-2">
        <span className="font-semibold text-neutral-800">{s.name}</span>
        {!s.is_active && <Badge label="Nonaktif" tone="neutral" />}
      </div>
      <div className="text-lg font-bold text-[var(--color-primary)]">{formatIDR(s.price)}</div>
      {s.description && <p className="mt-1 text-sm text-neutral-500">{s.description}</p>}

      {hasil && <p className="mt-2 text-xs text-neutral-600">Hasil: {hasil}</p>}
      {s.meta?.cocok_untuk && (
        <p className="mt-1 text-xs text-neutral-500">Cocok untuk: {s.meta.cocok_untuk}</p>
      )}
      {items.length > 0 && (
        <ul className="mt-2 list-inside list-disc text-xs text-neutral-600">
          {items.slice(0, 6).map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex items-center gap-3 border-t border-neutral-100 pt-3 text-sm">
        <Link href={`/programs/${s.id}/edit`} className="text-[var(--color-primary)] hover:underline">
          Edit
        </Link>
        <ToggleActive id={s.id} active={s.is_active} />
      </div>
    </Card>
  );
}

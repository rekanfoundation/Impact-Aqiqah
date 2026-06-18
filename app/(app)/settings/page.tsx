import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";
import { requireProfile } from "@/server/auth/session";
import { ROLE_LABELS } from "@/types/auth";

export const metadata = { title: "Pengaturan" };

export default async function SettingsPage() {
  const profile = await requireProfile();
  return (
    <div>
      <PageHeader title="Pengaturan" description="Profil & preferensi akun." />
      <Card>
        <CardBody className="text-sm">
          <dl className="grid grid-cols-[140px_1fr] gap-y-1">
            <dt className="text-neutral-500">Nama</dt>
            <dd>{profile.full_name ?? "—"}</dd>
            <dt className="text-neutral-500">Email</dt>
            <dd>{profile.email ?? "—"}</dd>
            <dt className="text-neutral-500">Role</dt>
            <dd>{ROLE_LABELS[profile.role]}</dd>
          </dl>
          <p className="mt-3 text-xs text-neutral-400">
            Manajemen master data & user lanjutan menyusul.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

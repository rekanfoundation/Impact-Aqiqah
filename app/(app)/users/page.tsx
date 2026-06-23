import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/server/auth/session";
import { getAllProfiles } from "@/server/db/users";
import { getBranches } from "@/server/db/queries";
import { UsersManager } from "@/features/users/users-manager";

export const metadata = { title: "Akun & Broadcast" };

export default async function UsersPage() {
  await requireRole(["manager_program"]);
  const [profiles, branches] = await Promise.all([getAllProfiles(), getBranches()]);

  return (
    <div>
      <PageHeader
        title="Akun & Broadcast"
        description="Kelola akun (tambah, edit, tangguhkan), kirim WhatsApp, dan broadcast info/promo."
      />
      <UsersManager profiles={profiles} branches={branches} />
    </div>
  );
}

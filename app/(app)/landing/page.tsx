import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { requireRole } from "@/server/auth/session";
import { getAllLandingMedia } from "@/server/db/landing-media";
import { LandingCms } from "@/features/landing-cms/cms";

export const metadata = { title: "Landing CMS" };

export default async function LandingCmsPage() {
  await requireRole(["manager_program"]);
  const items = await getAllLandingMedia();

  return (
    <div>
      <PageHeader
        title="Landing Page Manager"
        description="Kelola gambar landing — hero, galeri, konten, dan partner. Perubahan langsung tampil di halaman utama."
      />
      {items.length === 0 ? (
        <EmptyState
          title="Belum ada media tersimpan"
          description="Tabel landing_media belum terisi (migrasi 23 belum di-apply). Sementara itu landing memakai gambar default. Setelah migrasi + seed dijalankan, media muncul di sini dan bisa dikelola."
        />
      ) : (
        <LandingCms items={items} />
      )}
    </div>
  );
}

import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/server/auth/session";
import { getAllCmsPages, getAllFaqs, getSiteContact } from "@/server/db/cms";
import { CmsTabs } from "@/features/cms/cms-tabs";

export const metadata = { title: "Halaman & FAQ" };

export default async function CmsPage() {
  await requireRole(["manager_program"]);
  const [pages, faqs, contact] = await Promise.all([
    getAllCmsPages(),
    getAllFaqs(),
    getSiteContact(),
  ]);

  return (
    <div>
      <PageHeader
        title="Halaman & FAQ"
        description="Kelola halaman footer (judul/konten/SEO/slug/urutan), FAQ, dan kontak — tanpa ubah kode (docs/27)."
      />
      <CmsTabs pages={pages} faqs={faqs} contact={contact} />
    </div>
  );
}

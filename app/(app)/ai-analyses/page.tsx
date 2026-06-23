import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/server/auth/session";
import { getSavedAnalyses } from "@/server/db/ai";
import { SavedAnalysesList } from "@/features/ai/saved-list";

export const metadata = { title: "Analisis AI" };

export default async function AiAnalysesPage() {
  await requireRole(["direktur", "manager_program", "admin_pusat"]);
  const items = await getSavedAnalyses();

  return (
    <div>
      <PageHeader
        title="Analisis AI Tersimpan"
        description="Arsip hasil ringkasan & analisis AI yang disimpan oleh admin."
      />
      <SavedAnalysesList items={items} />
    </div>
  );
}

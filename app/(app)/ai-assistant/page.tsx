import { PageHeader } from "@/components/ui/page-header";
import { requireRole } from "@/server/auth/session";
import { getChatbotConfig, getKbForAdmin, getChatLogs } from "@/server/db/chatbot";
import { SettingsForm } from "@/features/chatbot/admin/settings-form";
import { KbManager } from "@/features/chatbot/admin/kb-manager";
import { ChatHistory } from "@/features/chatbot/admin/history";

export const metadata = { title: "AI Assistant" };

export default async function AiAssistantPage() {
  await requireRole(["manager_program"]);
  const [config, kb, logs] = await Promise.all([
    getChatbotConfig(),
    getKbForAdmin(),
    getChatLogs(200),
  ]);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="AI Assistant"
        description="Kelola chatbot website: pengaturan, knowledge base, dan riwayat percakapan (docs/26)."
      />
      <SettingsForm config={config} />
      <KbManager items={kb} />
      <ChatHistory logs={logs} />
    </div>
  );
}

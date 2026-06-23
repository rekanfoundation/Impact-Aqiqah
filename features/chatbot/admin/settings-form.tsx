"use client";

import { useState, useTransition } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { updateChatbotConfigAction } from "@/server/actions/chatbot";
import type { ChatbotConfig } from "@/server/db/chatbot";

export function SettingsForm({ config }: { config: ChatbotConfig }) {
  const [enabled, setEnabled] = useState(config.enabled);
  const [name, setName] = useState(config.name);
  const [welcome, setWelcome] = useState(config.welcome);
  const [systemPrompt, setSystemPrompt] = useState(config.system_prompt);
  const [adminWa, setAdminWa] = useState(config.admin_wa);
  const [quick, setQuick] = useState(config.quick_actions.join("\n"));
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setMsg(null);
    start(async () => {
      const res = await updateChatbotConfigAction({
        enabled,
        name: name.trim(),
        welcome: welcome.trim(),
        system_prompt: systemPrompt.trim(),
        admin_wa: adminWa.trim(),
        quick_actions: quick
          .split("\n")
          .map((q) => q.trim())
          .filter(Boolean),
      });
      setMsg(res.ok ? "Tersimpan." : (res.error ?? "Gagal menyimpan"));
    });
  }

  const label = "block text-sm font-medium text-neutral-700";
  const field =
    "mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]";

  return (
    <Card>
      <CardHeader
        title="Pengaturan Assistant"
        action={
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-4 w-4 accent-[var(--color-primary)]"
            />
            {enabled ? "Aktif" : "Nonaktif"}
          </label>
        }
      />
      <CardBody className="flex flex-col gap-4">
        <div>
          <label className={label}>Nama Assistant</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={field} />
        </div>
        <div>
          <label className={label}>Welcome Message</label>
          <textarea value={welcome} onChange={(e) => setWelcome(e.target.value)} rows={2} className={field} />
        </div>
        <div>
          <label className={label}>System Prompt</label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={4}
            className={field}
          />
          <p className="mt-1 text-xs text-neutral-400">
            Persona & gaya jawaban. Aturan anti-mengarang & handoff ditambahkan otomatis oleh sistem.
          </p>
        </div>
        <div>
          <label className={label}>Nomor Admin WhatsApp</label>
          <input
            value={adminWa}
            onChange={(e) => setAdminWa(e.target.value)}
            placeholder="cth: 628123456789 (kosong = pakai default sistem)"
            className={field}
          />
        </div>
        <div>
          <label className={label}>Quick Actions (satu per baris)</label>
          <textarea value={quick} onChange={(e) => setQuick(e.target.value)} rows={5} className={field} />
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={pending}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Menyimpan…" : "Simpan Pengaturan"}
          </button>
          {msg && <span className="text-sm text-neutral-600">{msg}</span>}
        </div>
      </CardBody>
    </Card>
  );
}

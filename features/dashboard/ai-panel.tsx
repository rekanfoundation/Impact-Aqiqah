"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { saveAiAnalysisAction } from "@/server/actions/ai";

interface Risk {
  order_number: string;
  order_id: string;
  level: "low" | "medium" | "high";
  reason: string;
  overdue?: boolean;
}

export function AiPanel() {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [briefing, setBriefing] = useState<string | null>(null);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [ai, setAi] = useState<boolean>(false);
  const [loaded, setLoaded] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/ai/summary");
      const json = await res.json();
      if (res.ok) {
        setSummary(json.data.summary);
        setBriefing(json.data.briefing ?? null);
        setRisks(json.data.risks ?? []);
        setAi(json.data.ai);
        setLoaded(true);
      }
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!summary) return;
    setSaving(true);
    setSaveMsg(null);
    const content =
      summary +
      (briefing ? `\n\nPrioritas:\n${briefing}` : "") +
      (risks.length ? `\n\nOrder berisiko:\n${risks.map((r) => `- ${r.order_number} (${r.level})${r.overdue ? " · lewat SLA" : ""} — ${r.reason}`).join("\n")}` : "");
    try {
      const res = await saveAiAnalysisAction({ kind: "summary", content });
      setSaveMsg(res.ok ? "Tersimpan ke Analisis AI." : res.error ?? "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Ringkasan & Risiko (AI)"
        action={
          <div className="flex items-center gap-2">
            {loaded && summary && (
              <button
                onClick={save}
                disabled={saving}
                className="rounded-lg border border-[var(--color-primary)] px-3 py-1 text-sm font-medium text-[var(--color-primary)] hover:bg-amber-50 disabled:opacity-60"
              >
                {saving ? "Menyimpan…" : "Simpan analisis"}
              </button>
            )}
            <button
              onClick={load}
              disabled={loading}
              className="rounded-lg border border-neutral-300 px-3 py-1 text-sm text-neutral-700 hover:bg-neutral-100 disabled:opacity-60"
            >
              {loading ? "Memuat…" : loaded ? "Muat ulang" : "Buat ringkasan"}
            </button>
          </div>
        }
      />
      <CardBody className="flex flex-col gap-3 text-sm">
        {!loaded && !loading && (
          <p className="text-neutral-500">
            Klik “Buat ringkasan” untuk ringkasan eksekutif & deteksi order berisiko.
          </p>
        )}
        {summary && (
          <div>
            <p className="whitespace-pre-wrap text-neutral-700">{summary}</p>
            <p className="mt-1 text-xs text-neutral-400">
              {ai ? "Dihasilkan AI (draf, tinjau manusia)." : "Ringkasan template (AI nonaktif)."}
            </p>
            {saveMsg && <p className="mt-1 text-xs text-[var(--color-primary-dark)]">{saveMsg}</p>}
          </div>
        )}
        {loaded && briefing && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-neutral-700">
            <span className="font-medium">Prioritas: </span>
            {briefing}
          </p>
        )}
        {loaded && risks.length > 0 && (
          <div>
            <p className="mb-1 font-medium text-neutral-700">Order Berisiko</p>
            <ul className="space-y-1">
              {risks.map((r) => (
                <li key={r.order_id} className="flex flex-wrap items-center gap-2">
                  <Badge
                    label={r.level === "high" ? "Tinggi" : "Sedang"}
                    tone={r.level === "high" ? "danger" : "warning"}
                  />
                  {r.overdue && <Badge label="Lewat SLA" tone="danger" />}
                  <Link
                    href={`/orders/${r.order_id}`}
                    className="font-medium text-[var(--color-primary)] hover:underline"
                  >
                    {r.order_number}
                  </Link>
                  <span className="text-neutral-500">— {r.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {loaded && risks.length === 0 && (
          <p className="text-neutral-500">Tidak ada order berisiko terdeteksi.</p>
        )}
      </CardBody>
    </Card>
  );
}

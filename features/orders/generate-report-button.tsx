"use client";

import { useState } from "react";

export function GenerateReportButton({
  orderId,
  publicToken,
}: {
  orderId: string;
  publicToken: string;
}) {
  const [loading, setLoading] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [narrative, setNarrative] = useState<string | null>(null);
  const [draftAi, setDraftAi] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onDraft() {
    setDrafting(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/report/narrative`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setMsg(json?.error?.message ?? "Gagal menyiapkan narasi");
      } else {
        setNarrative(json.data.text ?? "");
        setDraftAi(!!json.data.ai);
      }
    } catch {
      setMsg("Terjadi kesalahan jaringan");
    } finally {
      setDrafting(false);
    }
  }

  async function onGenerate() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // kirim narasi yang sudah ditinjau bila ada
        body: JSON.stringify(narrative != null ? { narrative } : {}),
      });
      const json = await res.json();
      if (!res.ok) {
        setMsg(json?.error?.message ?? "Gagal membuat laporan");
      } else {
        setMsg("Laporan dibuat.");
      }
    } catch {
      setMsg("Terjadi kesalahan jaringan");
    } finally {
      setLoading(false);
    }
  }

  const link = `/r/${publicToken}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onDraft}
          disabled={drafting || loading}
          className="rounded-lg border border-[var(--color-primary)] px-3 py-1.5 text-sm font-semibold text-[var(--color-primary)] transition hover:bg-amber-50 disabled:opacity-60"
        >
          {drafting ? "Menyiapkan…" : "Siapkan Narasi (AI)"}
        </button>
        <button
          onClick={onGenerate}
          disabled={loading || drafting}
          className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-dark)] disabled:opacity-60"
        >
          {loading ? "Membuat…" : "Generate Laporan PDF"}
        </button>
        <a href={link} target="_blank" className="text-sm text-[var(--color-primary)] hover:underline">
          Lihat halaman publik ↗
        </a>
        {msg && <span className="text-xs text-neutral-600">{msg}</span>}
      </div>

      {narrative != null && (
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-neutral-600">
            Narasi laporan {draftAi ? "(draf AI — tinjau & edit sebelum generate)" : "(template — AI nonaktif)"}
          </label>
          <textarea
            value={narrative}
            onChange={(e) => setNarrative(e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-neutral-300 p-2 text-sm text-neutral-800 focus:border-[var(--color-primary)] focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}

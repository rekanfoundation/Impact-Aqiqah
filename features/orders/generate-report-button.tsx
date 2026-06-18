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
  const [msg, setMsg] = useState<string | null>(null);

  async function onGenerate() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/report`, { method: "POST" });
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
    <div className="flex flex-wrap items-center gap-3">
      <button
        onClick={onGenerate}
        disabled={loading}
        className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-dark)] disabled:opacity-60"
      >
        {loading ? "Membuat…" : "Generate Laporan PDF"}
      </button>
      <a href={link} target="_blank" className="text-sm text-[var(--color-primary)] hover:underline">
        Lihat halaman publik ↗
      </a>
      {msg && <span className="text-xs text-neutral-600">{msg}</span>}
    </div>
  );
}

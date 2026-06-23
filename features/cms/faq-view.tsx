"use client";

import { useMemo, useState } from "react";
import type { Faq } from "@/server/db/cms";

// Tampilan FAQ publik (docs/27): search + filter kategori. Accordion semantic.
export function FaqView({ faqs }: { faqs: Faq[] }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("Semua");

  const categories = useMemo(
    () => ["Semua", ...Array.from(new Set(faqs.map((f) => f.category)))],
    [faqs],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return faqs.filter((f) => {
      const okCat = cat === "Semua" || f.category === cat;
      const okQ =
        !needle ||
        f.question.toLowerCase().includes(needle) ||
        f.answer.toLowerCase().includes(needle);
      return okCat && okQ;
    });
  }, [faqs, q, cat]);

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cari pertanyaan…"
          className="flex-1 rounded-lg border border-neutral-300 px-4 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
        />
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3">
        {filtered.map((f) => (
          <details key={f.id} className="group rounded-xl border border-neutral-200 bg-white p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium text-neutral-800">
              <span>
                <span className="mr-2 rounded bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-700">
                  {f.category}
                </span>
                {f.question}
              </span>
              <span className="text-neutral-400 transition group-open:rotate-180">⌄</span>
            </summary>
            <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-600">{f.answer}</p>
          </details>
        ))}
        {filtered.length === 0 && (
          <p className="py-6 text-center text-sm text-neutral-400">Tidak ada FAQ yang cocok.</p>
        )}
      </div>
    </div>
  );
}

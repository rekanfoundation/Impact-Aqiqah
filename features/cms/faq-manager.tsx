"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { upsertFaq, deleteFaq, toggleFaq, moveFaq } from "@/server/actions/cms";
import type { Faq } from "@/server/db/cms";

const CATEGORIES = ["Pemesanan", "Pembayaran", "Aqiqah", "Qurban", "Pengiriman", "Vendor", "Umum"];
const empty = { category: "Umum", question: "", answer: "", sort_order: 0, is_active: true };
const field =
  "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]";

export function FaqManager({ faqs }: { faqs: Faq[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setMsg(null);
    start(async () => {
      const res = await upsertFaq({ ...draft, id: editId ?? undefined });
      if (res.ok) {
        setDraft(empty);
        setEditId(null);
        router.refresh();
      } else setMsg(res.error ?? "Gagal");
    });
  }
  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setMsg(null);
    start(async () => {
      const res = await fn();
      if (res.ok) router.refresh();
      else setMsg(res.error ?? "Gagal");
    });
  }

  return (
    <Card>
      <CardHeader title={`FAQ (${faqs.length})`} />
      <CardBody className="flex flex-col gap-4">
        {msg && <p className="text-sm text-red-600">{msg}</p>}
        <div className="grid gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3 sm:grid-cols-[160px_1fr]">
          <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className={field}>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            value={draft.question}
            onChange={(e) => setDraft({ ...draft, question: e.target.value })}
            placeholder="Pertanyaan"
            className={field}
          />
          <div className="sm:col-span-2">
            <textarea
              value={draft.answer}
              onChange={(e) => setDraft({ ...draft, answer: e.target.value })}
              placeholder="Jawaban"
              rows={3}
              className={field}
            />
          </div>
          <div className="flex items-center gap-3 sm:col-span-2">
            <label className="flex items-center gap-1 text-xs text-neutral-600">
              Urutan
              <input
                type="number"
                value={draft.sort_order}
                onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })}
                className="w-16 rounded border border-neutral-300 px-2 py-1 text-sm"
              />
            </label>
            <button
              onClick={submit}
              disabled={pending || !draft.question.trim() || !draft.answer.trim()}
              className="ml-auto rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {editId ? "Simpan" : "Tambah FAQ"}
            </button>
            {editId && (
              <button
                onClick={() => {
                  setEditId(null);
                  setDraft(empty);
                }}
                className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600"
              >
                Batal
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col divide-y divide-neutral-100">
          {faqs.map((f) => (
            <div key={f.id} className="flex items-start justify-between gap-3 py-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                  <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-700">{f.category}</span>
                  <span>urutan {f.sort_order}</span>
                  {!f.is_active && <span className="text-red-500">nonaktif</span>}
                </div>
                <div className="text-sm font-medium text-neutral-800">{f.question}</div>
                <p className="line-clamp-2 text-sm text-neutral-600">{f.answer}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button onClick={() => run(() => moveFaq(f.id, "up"))} disabled={pending} className="rounded border border-neutral-300 px-1.5 py-1 text-xs">↑</button>
                <button onClick={() => run(() => moveFaq(f.id, "down"))} disabled={pending} className="rounded border border-neutral-300 px-1.5 py-1 text-xs">↓</button>
                <button onClick={() => run(() => toggleFaq(f.id, f.is_active))} disabled={pending} className="rounded border border-neutral-300 px-2 py-1 text-xs">{f.is_active ? "Off" : "On"}</button>
                <button
                  onClick={() => {
                    setEditId(f.id);
                    setDraft({ category: f.category, question: f.question, answer: f.answer, sort_order: f.sort_order, is_active: f.is_active });
                  }}
                  className="rounded border border-neutral-300 px-2 py-1 text-xs"
                >
                  Edit
                </button>
                <button onClick={() => run(() => deleteFaq(f.id))} disabled={pending} className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50">Hapus</button>
              </div>
            </div>
          ))}
          {faqs.length === 0 && <p className="py-4 text-center text-sm text-neutral-400">Belum ada FAQ.</p>}
        </div>
      </CardBody>
    </Card>
  );
}

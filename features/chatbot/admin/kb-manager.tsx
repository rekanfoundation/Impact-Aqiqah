"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { upsertKbAction, deleteKbAction } from "@/server/actions/chatbot";
import type { KbEntry } from "@/server/db/chatbot";

const CATEGORIES = ["product", "business", "sop", "development", "faq"] as const;

const emptyDraft = { category: "faq", question: "", content: "", sort_order: 0, is_active: true };

export function KbManager({ items }: { items: KbEntry[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<{
    category: string;
    question: string;
    content: string;
    sort_order: number;
    is_active: boolean;
  }>(emptyDraft);
  const [editId, setEditId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const field =
    "w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]";

  function submit() {
    setMsg(null);
    start(async () => {
      const res = await upsertKbAction({ id: editId ?? undefined, ...draft });
      if (res.ok) {
        setDraft(emptyDraft);
        setEditId(null);
        router.refresh();
      } else {
        setMsg(res.error ?? "Gagal menyimpan");
      }
    });
  }

  function edit(it: KbEntry) {
    setEditId(it.id);
    setDraft({
      category: it.category,
      question: it.question ?? "",
      content: it.content,
      sort_order: it.sort_order,
      is_active: it.is_active,
    });
  }

  function remove(id: string) {
    start(async () => {
      const res = await deleteKbAction(id);
      if (res.ok) router.refresh();
      else setMsg(res.error ?? "Gagal menghapus");
    });
  }

  return (
    <Card>
      <CardHeader title={`Knowledge Base (${items.length})`} />
      <CardBody className="flex flex-col gap-4">
        {/* Editor */}
        <div className="grid gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3 sm:grid-cols-[140px_1fr]">
          <select
            value={draft.category}
            onChange={(e) => setDraft({ ...draft, category: e.target.value })}
            className={field}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            value={draft.question}
            onChange={(e) => setDraft({ ...draft, question: e.target.value })}
            placeholder="Pertanyaan (opsional)"
            className={field}
          />
          <div className="sm:col-span-2">
            <textarea
              value={draft.content}
              onChange={(e) => setDraft({ ...draft, content: e.target.value })}
              placeholder="Jawaban / isi pengetahuan…"
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
            <label className="flex items-center gap-1 text-xs text-neutral-600">
              <input
                type="checkbox"
                checked={draft.is_active}
                onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
                className="h-4 w-4 accent-[var(--color-primary)]"
              />
              Aktif
            </label>
            <button
              onClick={submit}
              disabled={pending || !draft.content.trim()}
              className="ml-auto rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
            >
              {editId ? "Simpan Perubahan" : "Tambah Entri"}
            </button>
            {editId && (
              <button
                onClick={() => {
                  setEditId(null);
                  setDraft(emptyDraft);
                }}
                className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-600"
              >
                Batal
              </button>
            )}
          </div>
        </div>
        {msg && <p className="text-sm text-red-600">{msg}</p>}

        {/* List */}
        <div className="flex flex-col divide-y divide-neutral-100">
          {items.map((it) => (
            <div key={it.id} className="flex items-start justify-between gap-3 py-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs text-neutral-400">
                  <span className="rounded bg-neutral-100 px-1.5 py-0.5">{it.category}</span>
                  {!it.is_active && <span className="text-red-500">nonaktif</span>}
                </div>
                {it.question && <div className="text-sm font-medium text-neutral-800">{it.question}</div>}
                <p className="line-clamp-2 text-sm text-neutral-600">{it.content}</p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  onClick={() => edit(it)}
                  className="rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-100"
                >
                  Edit
                </button>
                <button
                  onClick={() => remove(it.id)}
                  disabled={pending}
                  className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  Hapus
                </button>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <p className="py-4 text-center text-sm text-neutral-400">Belum ada entri KB.</p>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

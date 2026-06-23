"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/utils";
import { deleteAiAnalysisAction } from "@/server/actions/ai";
import type { SavedAnalysis } from "@/server/db/ai";

export function SavedAnalysesList({ items }: { items: SavedAnalysis[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  if (items.length === 0) {
    return <EmptyState title="Belum ada analisis tersimpan" description="Buka Dashboard → panel AI → 'Buat ringkasan' lalu 'Simpan analisis'." />;
  }

  return (
    <div className="flex flex-col gap-3">
      {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
      {items.map((a) => (
        <Card key={a.id}>
          <CardBody className="flex flex-col gap-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium text-neutral-800">{a.title ?? "Analisis"}</div>
                <div className="text-xs text-neutral-400">{formatDate(a.created_at)} · {a.kind}</div>
              </div>
              <button
                onClick={() => {
                  setErr(null);
                  start(async () => {
                    const res = await deleteAiAnalysisAction(a.id);
                    if (res.error) setErr(res.error);
                    else router.refresh();
                  });
                }}
                disabled={pending}
                className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                Hapus
              </button>
            </div>
            <p className="whitespace-pre-wrap text-sm text-neutral-700">{a.content}</p>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

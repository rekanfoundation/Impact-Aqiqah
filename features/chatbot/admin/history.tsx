"use client";

import { useMemo, useState } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import type { ChatLog } from "@/server/db/chatbot";

const STATUS_LABEL: Record<ChatLog["status"], string> = {
  answered: "Terjawab",
  escalated: "Eskalasi",
  failed: "Gagal",
};
const STATUS_CLASS: Record<ChatLog["status"], string> = {
  answered: "bg-green-50 text-green-700",
  escalated: "bg-amber-50 text-amber-700",
  failed: "bg-red-50 text-red-700",
};

function toCsv(rows: ChatLog[]): string {
  const head = ["waktu", "status", "halaman", "provider", "pertanyaan", "jawaban"];
  const esc = (v: string | null) => `"${(v ?? "").replace(/"/g, '""')}"`;
  const lines = rows.map((r) =>
    [r.created_at, r.status, r.page, r.provider, r.question, r.answer].map((c) => esc(c as string)).join(","),
  );
  return [head.join(","), ...lines].join("\n");
}

export function ChatHistory({ logs }: { logs: ChatLog[] }) {
  const [filter, setFilter] = useState<"all" | ChatLog["status"]>("all");

  const filtered = useMemo(
    () => (filter === "all" ? logs : logs.filter((l) => l.status === filter)),
    [logs, filter],
  );

  function exportCsv() {
    const blob = new Blob(["﻿" + toCsv(filtered)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Card>
      <CardHeader
        title={`Riwayat Percakapan (${filtered.length})`}
        action={
          <div className="flex items-center gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="rounded-lg border border-neutral-300 px-2 py-1 text-sm"
            >
              <option value="all">Semua</option>
              <option value="answered">Terjawab</option>
              <option value="escalated">Eskalasi</option>
              <option value="failed">Gagal</option>
            </select>
            <button
              onClick={exportCsv}
              disabled={filtered.length === 0}
              className="rounded-lg border border-neutral-300 px-3 py-1 text-sm text-neutral-700 hover:bg-neutral-100 disabled:opacity-50"
            >
              Export CSV
            </button>
          </div>
        }
      />
      <CardBody className="flex flex-col divide-y divide-neutral-100">
        {filtered.map((l) => (
          <div key={l.id} className="py-2">
            <div className="flex items-center gap-2 text-xs text-neutral-400">
              <span className={`rounded px-1.5 py-0.5 ${STATUS_CLASS[l.status]}`}>
                {STATUS_LABEL[l.status]}
              </span>
              <span>{formatDateTime(l.created_at)}</span>
              {l.page && <span className="truncate">· {l.page}</span>}
              {l.provider && <span>· {l.provider}</span>}
            </div>
            <p className="mt-1 text-sm font-medium text-neutral-800">{l.question}</p>
            {l.answer && <p className="whitespace-pre-wrap text-sm text-neutral-600">{l.answer}</p>}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="py-4 text-center text-sm text-neutral-400">Belum ada percakapan.</p>
        )}
      </CardBody>
    </Card>
  );
}

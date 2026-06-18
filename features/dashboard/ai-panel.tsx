"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Risk {
  order_number: string;
  order_id: string;
  level: "low" | "medium" | "high";
  reason: string;
}

export function AiPanel() {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [ai, setAi] = useState<boolean>(false);
  const [loaded, setLoaded] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/summary");
      const json = await res.json();
      if (res.ok) {
        setSummary(json.data.summary);
        setRisks(json.data.risks ?? []);
        setAi(json.data.ai);
        setLoaded(true);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Ringkasan & Risiko (AI)"
        action={
          <button
            onClick={load}
            disabled={loading}
            className="rounded-lg border border-neutral-300 px-3 py-1 text-sm text-neutral-700 hover:bg-neutral-100 disabled:opacity-60"
          >
            {loading ? "Memuat…" : loaded ? "Muat ulang" : "Buat ringkasan"}
          </button>
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
            <p className="text-neutral-700">{summary}</p>
            <p className="mt-1 text-xs text-neutral-400">
              {ai ? "Dihasilkan AI (draf, tinjau manusia)." : "Ringkasan template (AI nonaktif)."}
            </p>
          </div>
        )}
        {loaded && risks.length > 0 && (
          <div>
            <p className="mb-1 font-medium text-neutral-700">Order Berisiko</p>
            <ul className="space-y-1">
              {risks.map((r) => (
                <li key={r.order_id} className="flex items-center gap-2">
                  <Badge
                    label={r.level === "high" ? "Tinggi" : "Sedang"}
                    tone={r.level === "high" ? "danger" : "warning"}
                  />
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

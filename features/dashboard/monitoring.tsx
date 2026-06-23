import Link from "next/link";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import type { SlaBreaches, OfficerLoad, TrendDay, AlertItem } from "@/server/db/monitoring";

// Widget Advanced Monitoring (docs/09). Presentational murni (server component),
// visualisasi dengan CSS bar — tanpa library chart.

function ageLabel(hours: number): string {
  if (hours >= 48) return `${Math.round(hours / 24)} hari`;
  return `${hours} jam`;
}

const BUCKET_LABEL = { documentation: "Dokumentasi", distribution: "Distribusi", report: "Laporan" } as const;

// ---------- SLA Terlewat ----------
export function SlaBreachesCard({ data }: { data: SlaBreaches }) {
  return (
    <Card>
      <CardHeader
        title="SLA Terlewat"
        action={<Badge label={`${data.total} order`} tone={data.total > 0 ? "danger" : "success"} />}
      />
      <CardBody className="flex flex-col gap-3 text-sm">
        <div className="grid grid-cols-3 gap-2">
          {(["documentation", "distribution", "report"] as const).map((b) => (
            <div key={b} className="rounded-lg bg-neutral-50 px-3 py-2 text-center">
              <div className="text-lg font-semibold text-neutral-800">{data.counts[b]}</div>
              <div className="text-xs text-neutral-500">{BUCKET_LABEL[b]}</div>
            </div>
          ))}
        </div>
        {data.orders.length === 0 ? (
          <p className="text-neutral-500">Tidak ada order yang melewati SLA. 👍</p>
        ) : (
          <ul className="space-y-1">
            {data.orders.map((o) => (
              <li key={o.order_id} className="flex flex-wrap items-center gap-2">
                <Badge label={BUCKET_LABEL[o.bucket]} tone="warning" />
                <Link href={`/orders/${o.order_id}`} className="font-medium text-[var(--color-primary)] hover:underline">
                  {o.order_number}
                </Link>
                <span className="text-neutral-500">
                  {o.branch_name ? `${o.branch_name} · ` : ""}terlambat {ageLabel(o.age_hours)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

// ---------- Beban Petugas (PIC) ----------
export function OfficerLoadCard({ data }: { data: OfficerLoad[] }) {
  const max = Math.max(1, ...data.map((d) => d.open_orders));
  return (
    <Card>
      <CardHeader title="Beban Petugas (PIC)" />
      <CardBody className="text-sm">
        {data.length === 0 ? (
          <p className="text-neutral-500">Belum ada order aktif yang ditugaskan.</p>
        ) : (
          <ul className="space-y-2.5">
            {data.map((d) => (
              <li key={d.pic_name} className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-neutral-700">{d.pic_name}</span>
                  <span className="text-neutral-500">
                    {d.open_orders} order
                    {d.with_issues > 0 && (
                      <span className="ml-2 text-[var(--color-danger)]">{d.with_issues} kendala</span>
                    )}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="h-full rounded-full bg-[var(--color-primary)]"
                    style={{ width: `${Math.round((d.open_orders / max) * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

// ---------- Tren (dibuat vs selesai) ----------
export function TrendsCard({ data }: { data: TrendDay[] }) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.created, d.completed)));
  const totalCreated = data.reduce((s, d) => s + d.created, 0);
  const totalCompleted = data.reduce((s, d) => s + d.completed, 0);
  return (
    <Card>
      <CardHeader
        title={`Tren ${data.length} Hari`}
        action={
          <span className="flex items-center gap-3 text-xs text-neutral-500">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm bg-[var(--color-primary)]" /> Masuk {totalCreated}
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-sm bg-[var(--color-accent)]" /> Selesai {totalCompleted}
            </span>
          </span>
        }
      />
      <CardBody>
        <div className="flex items-end justify-between gap-1" style={{ height: 96 }}>
          {data.map((d) => (
            <div key={d.day} className="flex flex-1 flex-col items-center justify-end gap-1" title={`${d.day}: masuk ${d.created}, selesai ${d.completed}`}>
              <div className="flex h-full w-full items-end justify-center gap-0.5">
                <div
                  className="w-1.5 rounded-t bg-[var(--color-primary)]"
                  style={{ height: `${Math.max(2, Math.round((d.created / max) * 100))}%` }}
                />
                <div
                  className="w-1.5 rounded-t bg-[var(--color-accent)]"
                  style={{ height: `${Math.max(2, Math.round((d.completed / max) * 100))}%` }}
                />
              </div>
              <span className="text-[9px] text-neutral-400">{d.day.slice(8)}</span>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

// ---------- Alert feed (kendala terbuka) ----------
export function AlertFeedCard({ data }: { data: AlertItem[] }) {
  const tone = (s: AlertItem["severity"]) => (s === "high" ? "danger" : s === "medium" ? "warning" : "neutral");
  const sevLabel = { high: "Tinggi", medium: "Sedang", low: "Rendah" } as const;
  return (
    <Card>
      <CardHeader title="Kendala Terbuka" action={<Badge label={`${data.length}`} tone={data.length > 0 ? "warning" : "success"} />} />
      <CardBody className="text-sm">
        {data.length === 0 ? (
          <EmptyState title="Tidak ada kendala terbuka" description="Semua order berjalan tanpa kendala aktif." />
        ) : (
          <ul className="space-y-2">
            {data.map((a) => (
              <li key={a.id} className="flex items-start gap-2">
                <Badge label={sevLabel[a.severity]} tone={tone(a.severity)} />
                <div className="min-w-0">
                  <p className="text-neutral-700">{a.title}</p>
                  {a.order_id && (
                    <Link href={`/orders/${a.order_id}`} className="text-xs text-[var(--color-primary)] hover:underline">
                      {a.order_number}
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

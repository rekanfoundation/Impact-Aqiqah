import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { KpiCard } from "@/features/dashboard/kpi-card";
import { OpenOrdersTable } from "@/features/dashboard/open-orders-table";
import { AiPanel } from "@/features/dashboard/ai-panel";
import {
  SlaBreachesCard,
  OfficerLoadCard,
  TrendsCard,
  AlertFeedCard,
} from "@/features/dashboard/monitoring";
import { requireProfile } from "@/server/auth/session";
import { getBranchKpi, getOpenOrders, summarize } from "@/server/db/dashboard";
import { getSlaBreaches, getOfficerLoad, getTrends, getAlertFeed } from "@/server/db/monitoring";
import { isCentralRole, ROLE_LABELS } from "@/types/auth";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const profile = await requireProfile();
  const central = isCentralRole(profile.role);

  // Non-pusat dibatasi ke cabangnya (defense in depth; RLS juga membatasi).
  const branchFilter = central ? undefined : profile.branch_id ?? undefined;

  const [kpiRows, openOrders, sla, officers, trends, alerts] = await Promise.all([
    getBranchKpi(branchFilter),
    getOpenOrders(50),
    getSlaBreaches(branchFilter),
    getOfficerLoad(),
    getTrends(14, branchFilter),
    getAlertFeed(12),
  ]);
  const sum = summarize(kpiRows);

  const scopeLabel = central
    ? "Semua cabang"
    : `Cabang Anda · ${ROLE_LABELS[profile.role]}`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description={`${scopeLabel} — pantau progres operasional real-time.`}
      />

      {/* KPI inti (docs/09 §2) */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard label="Total Order" value={sum.total_order} />
        <KpiCard label="Belum Selesai" value={sum.open_order} />
        <KpiCard label="Progress Potong" value={sum.avg_progress_potong} suffix="%" />
        <KpiCard label="Progress Distribusi" value={sum.avg_progress_distribusi} suffix="%" />
        <KpiCard label="Dokumentasi" value={sum.pct_documentation} suffix="%" />
        <KpiCard label="Laporan" value={sum.pct_report} suffix="%" />
      </section>

      {/* AI Executive Summary & Risk (Phase 2) — role pusat */}
      {central && <AiPanel />}

      {/* Advanced Monitoring (Phase 2): tren, SLA, beban petugas, kendala — ter-scope RLS */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <TrendsCard data={trends} />
        </div>
        <SlaBreachesCard data={sla} />
        <OfficerLoadCard data={officers} />
        <div className="lg:col-span-2">
          <AlertFeedCard data={alerts} />
        </div>
      </section>

      {/* Litmus test: order belum selesai + lokasi + PIC + kendala */}
      <Card>
        <CardHeader title="Order Belum Selesai" />
        <CardBody>
          <OpenOrdersTable rows={openOrders} />
        </CardBody>
      </Card>

      {/* Breakdown per cabang (hanya role pusat) */}
      {central && kpiRows.length > 0 && (
        <Card>
          <CardHeader title="KPI per Cabang" />
          <CardBody className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-neutral-100 text-left text-neutral-500">
                <tr>
                  <th className="px-4 py-2.5">Cabang</th>
                  <th className="px-4 py-2.5">Order</th>
                  <th className="px-4 py-2.5">Belum Selesai</th>
                  <th className="px-4 py-2.5">Potong</th>
                  <th className="px-4 py-2.5">Distribusi</th>
                  <th className="px-4 py-2.5">Dokumentasi</th>
                  <th className="px-4 py-2.5">Laporan</th>
                </tr>
              </thead>
              <tbody>
                {kpiRows.map((r) => (
                  <tr key={r.branch_id} className="border-b border-neutral-50">
                    <td className="px-4 py-2.5 font-medium">{r.branch_name}</td>
                    <td className="px-4 py-2.5">{r.total_order}</td>
                    <td className="px-4 py-2.5">{r.open_order}</td>
                    <td className="px-4 py-2.5">{r.avg_progress_potong}%</td>
                    <td className="px-4 py-2.5">{r.avg_progress_distribusi}%</td>
                    <td className="px-4 py-2.5">{r.pct_documentation}%</td>
                    <td className="px-4 py-2.5">{r.pct_report}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}
    </div>
  );
}

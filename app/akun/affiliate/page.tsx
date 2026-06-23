import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/features/dashboard/kpi-card";
import { CopyLink } from "@/features/customer/copy-link";
import { createClient } from "@/lib/supabase/server";
import { requireCustomer } from "@/server/auth/session";
import { formatIDR, formatDate } from "@/lib/utils";

export const metadata = { title: "Affiliate" };

interface AffiliateData {
  code: string;
  referred_users: number;
  attributed_orders: number;
  gross: number;
  commission_estimate: number;
  goats_period: number;
  gross_period: number;
  threshold: number;
  rate_low: number;
  rate_high: number;
  current_rate: number;
  period_start: string | null;
  period_end: string | null;
}

export default async function AffiliatePage() {
  await requireCustomer();
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_my_affiliate");
  const a = (data as AffiliateData | null) ?? null;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const link = a ? `${appUrl}/?ref=${a.code}` : "";

  const pct = (r: number) => `${(r * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%`;
  const toNext = a ? Math.max(0, a.threshold - a.goats_period) : 0;
  const progress = a ? Math.min(100, Math.round((a.goats_period / Math.max(1, a.threshold)) * 100)) : 0;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Program Affiliate"
        description="Bagikan link Anda. Setiap pesanan yang masuk lewat link tercatat sebagai referral Anda."
      />

      {!a ? (
        <Card>
          <CardBody>Gagal memuat data affiliate. Coba lagi nanti.</CardBody>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader title="Link Promosi Anda" />
            <CardBody className="flex flex-col gap-3">
              <div className="text-sm text-neutral-500">
                Kode referral: <span className="font-mono font-semibold text-neutral-800">{a.code}</span>
              </div>
              <CopyLink link={link} />
              <p className="text-xs text-neutral-400">
                Komisi berjenjang per ekor kambing: {pct(a.rate_low)} untuk {a.threshold} ekor pertama,
                lalu {pct(a.rate_high)} untuk ekor berikutnya. Dihitung per periode 1 tahun &amp; reset tiap
                tahun. Pencairan diproses manual oleh tim.
              </p>
            </CardBody>
          </Card>

          {/* Tier periode berjalan */}
          <Card>
            <CardHeader
              title="Tier Periode Ini"
              action={
                <Badge
                  label={`Komisi ${pct(a.current_rate)}`}
                  tone={a.current_rate >= a.rate_high ? "success" : "warning"}
                />
              }
            />
            <CardBody className="flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-neutral-600">
                  <span className="text-lg font-semibold text-neutral-900">{a.goats_period}</span> ekor kambing periode ini
                </span>
                {a.period_start && (
                  <span className="text-xs text-neutral-400">
                    {formatDate(a.period_start)} – {formatDate(a.period_end)}
                  </span>
                )}
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                <div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-xs text-neutral-500">
                {toNext > 0
                  ? `${toNext} ekor lagi menuju tier ${pct(a.rate_high)} (di atas ${a.threshold} ekor).`
                  : `Anda sudah di tier tertinggi ${pct(a.rate_high)} untuk periode ini. 🎉`}
              </p>
            </CardBody>
          </Card>

          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard label="User Direferensikan" value={a.referred_users} />
            <KpiCard label="Pesanan Teratribusi" value={a.attributed_orders} />
            <KpiCard label="Nilai Pesanan" value={formatIDR(a.gross)} />
            <KpiCard label="Estimasi Komisi" value={formatIDR(a.commission_estimate)} />
          </section>
        </>
      )}
    </div>
  );
}

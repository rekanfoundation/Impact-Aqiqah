import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { KpiCard } from "@/features/dashboard/kpi-card";
import { CopyLink } from "@/features/customer/copy-link";
import { createClient } from "@/lib/supabase/server";
import { requireCustomer } from "@/server/auth/session";
import { formatIDR } from "@/lib/utils";

export const metadata = { title: "Affiliate" };

interface AffiliateData {
  code: string;
  commission_ratio: number;
  referred_users: number;
  attributed_orders: number;
  gross: number;
  commission_estimate: number;
}

export default async function AffiliatePage() {
  await requireCustomer();
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_my_affiliate");
  const a = (data as AffiliateData | null) ?? null;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const link = a ? `${appUrl}/?ref=${a.code}` : "";

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
                Komisi {Math.round(a.commission_ratio * 100)}% dari nilai pesanan teratribusi
                (estimasi; pencairan diproses manual oleh tim).
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

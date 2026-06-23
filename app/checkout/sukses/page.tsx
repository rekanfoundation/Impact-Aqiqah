import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Pesanan Diterima — ImpactAqiqah" };

const rupiah = (n: number) => `Rp${Number(n).toLocaleString("id-ID")}`;

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; pending?: string }>;
}) {
  const { token, pending } = await searchParams;
  if (!token) notFound();

  const admin = createAdminClient();
  const { data } = await admin
    .from("orders")
    .select("order_number, total_amount, payment_status, aqiqah_type")
    .eq("public_token", token)
    .maybeSingle();
  if (!data) notFound();

  const o = data as { order_number: string; total_amount: number; payment_status: string; aqiqah_type: string | null };
  const paid = o.payment_status === "paid" || o.payment_status === "partial";

  return (
    <main className="mx-auto max-w-lg px-4 py-12 text-center">
      <div className="rounded-2xl border border-neutral-200 bg-white p-8">
        <div className="text-5xl">{paid ? "✅" : "🧾"}</div>
        <h1 className="mt-3 text-xl font-bold text-neutral-900">
          {paid ? "Pembayaran Berhasil!" : "Pesanan Diterima"}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Nomor pesanan <span className="font-semibold text-neutral-700">{o.order_number}</span>
        </p>

        <dl className="mx-auto mt-5 max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-neutral-500">Total</dt>
            <dd className="font-semibold">{rupiah(o.total_amount)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-500">Jenis</dt>
            <dd>{o.aqiqah_type === "kirim" ? "Aqiqah Kirim" : "Aqiqah Salur"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-neutral-500">Status bayar</dt>
            <dd className="font-medium">{paid ? "Lunas/DP" : "Menunggu pembayaran"}</dd>
          </div>
        </dl>

        {paid ? (
          <p className="mt-5 rounded-lg bg-amber-50 px-4 py-3 text-sm text-neutral-700">
            📧 Kami telah mengirim <b>link masuk (magic link)</b> ke email Anda. Klik link tersebut untuk
            melacak pesanan dan mengaktifkan <b>akses affiliate</b> Anda.
          </p>
        ) : pending ? (
          <p className="mt-5 rounded-lg bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
            Pesanan tersimpan. Jika Anda belum menyelesaikan pembayaran, tim kami akan menghubungi Anda
            via WhatsApp untuk menuntaskannya.
          </p>
        ) : null}

        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--color-primary-dark)]"
        >
          Kembali ke Beranda
        </Link>
      </div>
    </main>
  );
}

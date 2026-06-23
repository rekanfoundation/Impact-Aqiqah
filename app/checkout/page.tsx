import Link from "next/link";
import { CheckoutForm } from "@/features/checkout/checkout-form";
import { getPublicPackages, splitPackages } from "@/server/db/public";

export const metadata = { title: "Checkout — ImpactAqiqah" };

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ paket?: string }>;
}) {
  const { paket } = await searchParams;
  const all = await getPublicPackages();
  const { kambing, nasiBox } = splitPackages(all);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex items-center justify-between">
        <Link href="/" className="text-lg font-bold tracking-tight text-neutral-900">
          Impact<span className="text-[var(--color-primary)]">Aqiqah</span>
        </Link>
        <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-800">
          ← Kembali
        </Link>
      </header>

      <h1 className="mb-1 text-2xl font-bold text-neutral-900">Pemesanan Aqiqah</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Lengkapi data berikut. Anda tidak perlu login — akun &amp; akses affiliate otomatis dikirim ke email setelah pembayaran berhasil.
      </p>

      {kambing.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-8 text-center text-neutral-500">
          Paket belum tersedia. Silakan hubungi kami via WhatsApp.
        </p>
      ) : (
        <CheckoutForm kambing={kambing} nasiBox={nasiBox} preselect={paket} />
      )}
    </main>
  );
}

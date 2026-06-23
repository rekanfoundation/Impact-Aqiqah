import Link from "next/link";
import { formatIDR } from "@/lib/utils";
import { hasilSummary, nasiBoxItems } from "@/lib/packages";
import { SERVICE_TYPE_LABEL } from "@/lib/packages";
import type { Service } from "@/types/db";

// Halaman detail program publik (docs/28) — di-render dari route (site)/[slug].
export function ProgramDetail({ service }: { service: Service }) {
  const hasil = hasilSummary(service);
  const items = nasiBoxItems(service);
  const checkoutHref = `/checkout?paket=${service.slug || service.id}`;

  return (
    <div className="mt-6">
      <span className="inline-block rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
        {SERVICE_TYPE_LABEL[service.type]}
      </span>

      <div className="mt-3 text-4xl font-bold text-[var(--color-primary)]">
        {formatIDR(service.price)}
      </div>

      {service.description && (
        <p className="mt-3 max-w-2xl text-neutral-600">{service.description}</p>
      )}

      {hasil && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-neutral-800">Yang Anda dapatkan</h2>
          <ul className="mt-2 space-y-1.5 text-sm text-neutral-700">
            {hasil.split(" · ").map((h) => (
              <li key={h} className="flex items-start gap-2">
                <span className="text-[var(--color-accent)]">✓</span> {h}
              </li>
            ))}
            {service.meta?.cocok_untuk && (
              <li className="flex items-start gap-2 text-neutral-500">
                <span className="text-[var(--color-accent)]">✓</span> Cocok untuk {service.meta.cocok_untuk}
              </li>
            )}
          </ul>
        </div>
      )}

      {items.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold text-neutral-800">Isi paket</h2>
          <ul className="mt-2 space-y-1 text-sm text-neutral-700">
            {items.map((it) => (
              <li key={it} className="flex items-start gap-2">
                <span className="text-[var(--color-accent)]">•</span> {it}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href={checkoutHref}
          className="rounded-lg bg-[var(--color-primary)] px-6 py-3 text-sm font-semibold text-white hover:bg-[var(--color-primary-dark)]"
        >
          Pesan Sekarang
        </Link>
        <Link
          href="/paket"
          className="rounded-lg border border-neutral-300 px-6 py-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
        >
          Lihat Semua Paket
        </Link>
      </div>

      <p className="mt-4 text-xs text-neutral-400">
        Pemesanan & pembayaran dilakukan melalui sistem (checkout). Kami tidak menerima pembayaran via WhatsApp.
      </p>
    </div>
  );
}

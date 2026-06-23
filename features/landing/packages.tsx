import Link from "next/link";
import { formatIDR } from "@/lib/utils";
import { hasilSummary, nasiBoxItems } from "@/lib/packages";
import type { Service } from "@/types/db";

function buyHref(id: string) {
  return `/checkout?paket=${id}`;
}

const SectionTitle = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="mx-auto mb-10 max-w-2xl text-center">
    <h2 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">{title}</h2>
    {subtitle && <p className="mt-3 text-neutral-500">{subtitle}</p>}
  </div>
);

export function KambingPackages({ packages }: { packages: Service[] }) {
  return (
    <section id="paket" className="mx-auto max-w-[1280px] scroll-mt-20 px-4 py-16 sm:px-6">
      <SectionTitle
        title="Pilihan Paket Kambing"
        subtitle="Transparan tanpa biaya tersembunyi. Pilih paket yang sesuai dengan kebutuhan Anda."
      />
      <div className="grid items-stretch gap-4 md:grid-cols-3">
        {packages.map((p, idx) => {
          const popular = idx === 1; // tengah = MOST POPULAR
          const hasil = hasilSummary(p);
          return (
            <div
              key={p.id}
              className={`relative flex flex-col rounded-2xl border bg-white p-6 ${
                popular
                  ? "border-[var(--color-primary)] shadow-lg shadow-amber-500/10"
                  : "border-neutral-200"
              }`}
            >
              {popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--color-primary)] px-3 py-1 text-xs font-bold text-white">
                  MOST POPULAR
                </span>
              )}
              <h3 className="font-semibold text-neutral-900">{tierName(p.name)}</h3>
              <div className="mt-2 text-3xl font-bold text-[var(--color-primary)]">
                {formatIDR(p.price)}
              </div>
              {p.description && <p className="mt-2 text-sm text-neutral-500">{p.description}</p>}
              <ul className="mt-4 flex-1 space-y-2 text-sm text-neutral-700">
                {hasil?.split(" · ").map((h) => (
                  <li key={h} className="flex items-start gap-2">
                    <span className="text-[var(--color-accent)]">✓</span> {h}
                  </li>
                ))}
                {p.meta?.cocok_untuk && (
                  <li className="flex items-start gap-2 text-neutral-500">
                    <span className="text-[var(--color-accent)]">✓</span> {p.meta.cocok_untuk}
                  </li>
                )}
              </ul>
              <Link
                href={buyHref(p.id)}
                className={`mt-6 rounded-lg px-4 py-2.5 text-center text-sm font-semibold ${
                  popular
                    ? "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-dark)]"
                    : "border border-neutral-300 text-neutral-800 hover:bg-neutral-50"
                }`}
              >
                Pilih Paket
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function NasiBoxPackages({ packages }: { packages: Service[] }) {
  if (packages.length === 0) return null;
  return (
    <section className="bg-[var(--surface)]">
      <div className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6">
        <SectionTitle
          title="Pilihan Nasi Box"
          subtitle="Pilih paket nasi box sesuai kebutuhan dan budget keluarga Anda."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {packages.map((p, idx) => {
            const items = nasiBoxItems(p);
            const featured = idx >= packages.length - 1;
            return (
              <div
                key={p.id}
                className={`flex flex-col rounded-2xl border bg-white p-4 ${
                  featured ? "border-[var(--color-secondary)]" : "border-neutral-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-neutral-900">{shortName(p.name)}</h3>
                  {idx === 2 && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                      FAVORIT
                    </span>
                  )}
                  {featured && (
                    <span className="rounded bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700">
                      PREMIUM
                    </span>
                  )}
                </div>
                <div className="mt-1 text-lg font-bold text-[var(--color-primary)]">
                  {formatIDR(p.price)}
                  <span className="text-xs font-normal text-neutral-400"> / box</span>
                </div>
                <ul className="mt-2 flex-1 space-y-0.5 text-xs text-neutral-600">
                  {items.map((it) => (
                    <li key={it}>• {it}</li>
                  ))}
                </ul>
                <Link
                  href={buyHref(p.id)}
                  className="mt-3 rounded-lg border border-neutral-300 px-3 py-1.5 text-center text-xs font-semibold text-neutral-800 hover:bg-neutral-50"
                >
                  Pilih
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/** "Paket Favorit — Kambing Betina Super" -> "Favorit" */
function tierName(name: string): string {
  const m = name.match(/Paket\s+(\w+)/i);
  return m ? m[1] : name;
}
/** "Paket A — Nasi Kuning Basic" -> "Paket A" */
function shortName(name: string): string {
  return name.split("—")[0]?.trim() ?? name;
}

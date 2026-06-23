import type { Metadata } from "next";
import Link from "next/link";
import { getCmsPages } from "@/server/db/cms";

export const metadata: Metadata = {
  title: "Peta Situs",
  description: "Daftar seluruh halaman ImpactAqiqah untuk memudahkan navigasi dan indexing.",
  alternates: { canonical: "/sitemap" },
};

export default async function SitemapPage() {
  const pages = await getCmsPages();
  const layanan = pages.filter((p) => p.footer_group === "layanan");
  const bantuan = pages.filter((p) => p.footer_group === "bantuan");
  const other = pages.filter((p) => !p.footer_group);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold text-neutral-900">Peta Situs</h1>
      <p className="mt-2 text-sm text-neutral-500">
        Seluruh halaman ImpactAqiqah. Versi XML:{" "}
        <a href="/sitemap.xml" className="text-[var(--color-primary)] underline">
          /sitemap.xml
        </a>
        .
      </p>
      <div className="mt-6 grid gap-8 sm:grid-cols-2">
        <SitemapCol title="Beranda" links={[{ slug: "", title: "Halaman Utama" }]} />
        {layanan.length > 0 && <SitemapCol title="Layanan" links={layanan} />}
        {bantuan.length > 0 && <SitemapCol title="Bantuan" links={bantuan} />}
        {other.length > 0 && <SitemapCol title="Lainnya" links={other} />}
      </div>
    </main>
  );
}

function SitemapCol({
  title,
  links,
}: {
  title: string;
  links: { slug: string; title: string }[];
}) {
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold text-neutral-800">{title}</h2>
      <ul className="space-y-1.5 text-sm">
        {links.map((l) => (
          <li key={l.slug}>
            <Link href={`/${l.slug}`} className="text-neutral-600 hover:text-[var(--color-primary)]">
              {l.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

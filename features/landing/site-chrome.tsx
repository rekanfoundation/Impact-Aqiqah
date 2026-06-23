import Link from "next/link";
import { waUrl, WA_DEFAULT_TEXT } from "@/lib/landing";
import { buildWaLink } from "@/lib/wa";
import { getCmsPages, getSiteContact, type CmsPage } from "@/server/db/cms";
import { instagramHandle } from "@/lib/site";

// Nav header memakai anchor absolut ke landing agar berfungsi dari halaman mana pun.
const NAV = [
  { href: "/#proses", label: "Proses" },
  { href: "/#paket", label: "Paket" },
  { href: "/#galeri", label: "Galeri" },
  { href: "/#faq", label: "FAQ" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-neutral-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="text-lg font-bold tracking-tight text-neutral-900">
          Impact<span className="text-[var(--color-primary)]">Aqiqah</span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-medium text-neutral-600 md:flex">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} className="hover:text-neutral-900">
              {n.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <a
            href={waUrl(WA_DEFAULT_TEXT)}
            target="_blank"
            className="hidden items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3 py-2 text-sm font-semibold text-white hover:opacity-90 sm:inline-flex"
          >
            <span aria-hidden>💬</span> WhatsApp
          </a>
          <a
            href="/checkout"
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-primary-dark)]"
          >
            Order Now
          </a>
        </div>
      </div>
    </header>
  );
}

export function WhatsAppFab() {
  return (
    <a
      href={waUrl(WA_DEFAULT_TEXT)}
      target="_blank"
      aria-label="Chat WhatsApp"
      className="fixed bottom-5 left-5 z-40 hidden h-14 w-14 items-center justify-center rounded-full bg-[var(--color-accent)] text-2xl text-white shadow-lg shadow-green-600/30 transition hover:scale-105 md:flex"
    >
      💬
    </a>
  );
}

// Footer dinamis dari CMS (docs/27): grup Layanan/Bantuan dari cms_pages, kontak dari env/CMS.
export async function SiteFooter() {
  const [pages, contact] = await Promise.all([getCmsPages(), getSiteContact()]);
  const year = new Date().getFullYear();
  const layanan = pages.filter((p) => p.footer_group === "layanan");
  const bantuan = pages.filter((p) => p.footer_group === "bantuan");

  return (
    <footer className="border-t border-neutral-100 bg-[var(--surface)]">
      <div className="mx-auto grid max-w-[1280px] gap-8 px-4 py-12 sm:px-6 md:grid-cols-4">
        <div>
          <div className="text-lg font-bold text-neutral-900">
            Impact<span className="text-[var(--color-primary)]">Aqiqah</span>
          </div>
          <p className="mt-2 max-w-xs text-sm text-neutral-500">
            Menyediakan layanan aqiqah profesional, syar&apos;i, dan modern dengan harga
            terjangkau. Berkomitmen pada kualitas dan amanah.
          </p>
        </div>

        <FooterCol title="Layanan" pages={layanan} />
        <FooterCol title="Bantuan" pages={bantuan} extra={[{ href: "/sitemap", label: "Sitemap" }]} />

        <div>
          <h4 className="mb-3 text-sm font-semibold text-neutral-800">Kontak</h4>
          <ul className="space-y-2 text-sm text-neutral-500">
            <li>
              <a
                href={buildWaLink(contact.whatsapp, WA_DEFAULT_TEXT)}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-neutral-800"
              >
                WhatsApp
              </a>
            </li>
            <li>
              <a
                href={contact.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-neutral-800"
              >
                Instagram {instagramHandle(contact.instagram_url)}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-neutral-100 py-4 text-center text-xs text-neutral-400">
        © {year} ImpactAqiqah · Professional Islamic Ritual Services
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  pages,
  extra,
}: {
  title: string;
  pages: CmsPage[];
  extra?: { href: string; label: string }[];
}) {
  return (
    <div>
      <h4 className="mb-3 text-sm font-semibold text-neutral-800">{title}</h4>
      <ul className="space-y-2 text-sm text-neutral-500">
        {pages.map((p) => (
          <li key={p.id}>
            <Link href={`/${p.slug}`} className="hover:text-neutral-800">
              {p.nav_label || p.title}
            </Link>
          </li>
        ))}
        {extra?.map((e) => (
          <li key={e.href}>
            <Link href={e.href} className="hover:text-neutral-800">
              {e.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

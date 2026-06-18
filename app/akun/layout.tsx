import Link from "next/link";
import { requireCustomer } from "@/server/auth/session";
import { signOut } from "@/app/(auth)/login/actions";
import { TawkTo } from "@/features/integrations/tawk-to";

const NAV = [
  { href: "/akun", label: "Pesanan Saya" },
  { href: "/akun/pesan", label: "Pesan Baru" },
  { href: "/akun/affiliate", label: "Affiliate" },
];

export default async function AkunLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const profile = await requireCustomer();

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="sticky top-0 z-20 border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link href="/akun" className="font-bold text-neutral-900">
            Impact<span className="text-[var(--color-primary)]">Aqiqah</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-neutral-600 sm:inline">
              {profile.full_name ?? profile.email}
            </span>
            <form action={signOut}>
              <button className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-700 hover:bg-neutral-100">
                Keluar
              </button>
            </form>
          </div>
        </div>
        <nav className="mx-auto flex max-w-4xl gap-4 px-4 pb-2 text-sm">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="text-neutral-600 hover:text-[var(--color-primary)]">
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
      <TawkTo />
    </div>
  );
}

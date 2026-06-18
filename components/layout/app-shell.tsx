import Link from "next/link";
import type { ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { BottomNav } from "./bottom-nav";
import { navForRole, mobileNavForRole } from "@/lib/nav";
import { ROLE_LABELS, type Profile } from "@/types/auth";
import { signOut } from "@/app/(auth)/login/actions";

export function AppShell({
  profile,
  children,
}: {
  profile: Profile;
  children: ReactNode;
}) {
  const items = navForRole(profile.role);
  const mobileItems = mobileNavForRole(profile.role);

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3">
        <Link href="/dashboard" className="font-bold text-[var(--color-primary)]">
          ImpactAqiqah
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <div className="text-right">
            <div className="font-medium text-neutral-800">
              {profile.full_name ?? profile.email}
            </div>
            <div className="text-xs text-neutral-500">
              {ROLE_LABELS[profile.role]}
            </div>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg border border-neutral-300 px-3 py-1.5 text-neutral-700 transition hover:bg-neutral-100"
            >
              Keluar
            </button>
          </form>
        </div>
      </header>

      <div className="flex">
        <Sidebar items={items} />
        <main className="mx-auto w-full max-w-6xl px-4 py-6 pb-24 lg:pb-6">
          {children}
        </main>
      </div>

      <BottomNav items={mobileItems} />
    </div>
  );
}

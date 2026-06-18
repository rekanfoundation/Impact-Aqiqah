import { redirect } from "next/navigation";
import { requireProfile } from "@/server/auth/session";
import { AppShell } from "@/components/layout/app-shell";

/**
 * Layout terproteksi untuk seluruh route operasional (docs/15).
 * Defense in depth: proxy.ts menjaga sesi, layout memastikan profil + render shell + nav per role.
 * Customer (role 'user') diarahkan ke area /akun.
 */
export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const profile = await requireProfile();
  if (profile.role === "user") redirect("/akun");
  return <AppShell profile={profile}>{children}</AppShell>;
}

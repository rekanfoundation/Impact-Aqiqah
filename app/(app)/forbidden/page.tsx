import Link from "next/link";

export const metadata = { title: "Akses Ditolak" };

export default function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <div className="text-5xl">🔒</div>
      <h1 className="text-xl font-bold text-neutral-800">Akses Ditolak</h1>
      <p className="max-w-sm text-sm text-neutral-500">
        Anda tidak memiliki hak akses ke halaman ini. Hubungi administrator bila
        ini sebuah kesalahan.
      </p>
      <Link
        href="/dashboard"
        className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-dark)]"
      >
        Kembali ke Dashboard
      </Link>
    </div>
  );
}

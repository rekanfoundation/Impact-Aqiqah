import Link from "next/link";
import { waUrl, WA_DEFAULT_TEXT } from "@/lib/landing";

/**
 * MobileDock — bar navigasi melayang (floating pill) khusus mobile pada landing publik.
 * "3D" via shadow berlapis + ring highlight; tombol "Order Now" timbul (raised) sebagai CTA utama.
 * Hanya tampil < md (desktop pakai SiteHeader). Stateless → boleh server component.
 */
export function MobileDock() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
      <nav
        aria-label="Navigasi cepat"
        className="mx-auto flex max-w-md items-center justify-between gap-1 rounded-2xl border border-white/70 bg-gradient-to-b from-white to-neutral-50 px-3 py-2 shadow-[0_10px_30px_-6px_rgba(0,0,0,0.30)] ring-1 ring-black/5 backdrop-blur"
      >
        <Link
          href="/"
          className="flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-medium text-neutral-600 transition active:scale-95"
        >
          <span className="text-lg" aria-hidden>
            🏠
          </span>
          Home
        </Link>

        <a
          href="#paket"
          className="flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-medium text-neutral-600 transition active:scale-95"
        >
          <span className="text-lg" aria-hidden>
            📦
          </span>
          Paket
        </a>

        <a
          href={waUrl(WA_DEFAULT_TEXT)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-medium text-neutral-600 transition active:scale-95"
        >
          <span className="text-lg" aria-hidden>
            💬
          </span>
          WA
        </a>

        <Link
          href="/checkout"
          className="-mt-1 flex items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-3.5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-amber-500/40 transition hover:bg-[var(--color-primary-dark)] active:scale-95"
        >
          <span aria-hidden>✨</span> Order
        </Link>
      </nav>
    </div>
  );
}

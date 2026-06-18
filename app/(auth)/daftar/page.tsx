import { Suspense } from "react";
import Link from "next/link";
import { RegisterForm } from "./register-form";

export const metadata = { title: "Daftar" };

export default function DaftarPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <Link href="/" className="mb-6 block text-center">
          <span className="text-2xl font-bold text-neutral-900">
            Impact<span className="text-[var(--color-primary)]">Aqiqah</span>
          </span>
          <span className="mt-1 block text-xs text-neutral-500">
            Tunaikan Ibadah, Tebarkan Manfaat
          </span>
        </Link>
        <h1 className="mb-1 text-lg font-semibold text-neutral-800">Buat Akun</h1>
        <p className="mb-6 text-sm text-neutral-500">
          Daftar untuk memesan & memantau perjalanan pesanan aqiqah Anda.
        </p>

        <Suspense fallback={null}>
          <RegisterForm />
        </Suspense>

        <p className="mt-5 text-center text-sm text-neutral-500">
          Sudah punya akun?{" "}
          <Link href="/login" className="font-medium text-[var(--color-primary)] hover:underline">
            Masuk
          </Link>
        </p>
      </div>
    </main>
  );
}

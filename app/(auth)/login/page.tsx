import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Masuk — ImpactAqiqah",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm">
        <Link href="/" className="mb-6 block text-center">
          <span className="text-2xl font-bold text-[var(--color-primary)]">
            ImpactAqiqah
          </span>
          <span className="mt-1 block text-xs text-neutral-500">
            Tunaikan Ibadah, Tebarkan Manfaat
          </span>
        </Link>

        <h1 className="mb-1 text-lg font-semibold text-neutral-800">
          Masuk ke Command Center
        </h1>
        <p className="mb-6 text-sm text-neutral-500">
          Gunakan akun internal Zakat Sukses.
        </p>

        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}

"use client";

import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { signUp, type RegisterState } from "./actions";

const input =
  "rounded-lg border border-neutral-300 px-3 py-2 outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20";

export function RegisterForm() {
  const sp = useSearchParams();
  const paket = sp.get("paket") ?? "";
  const [state, action, pending] = useActionState<RegisterState, FormData>(
    signUp,
    undefined,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="paket" value={paket} />
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Nama Lengkap</span>
        <input name="full_name" required className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Email</span>
        <input name="email" type="email" required autoComplete="email" className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Password</span>
        <input name="password" type="password" required minLength={6} autoComplete="new-password" className={input} />
      </label>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-[var(--color-danger)]">{state.error}</p>
      )}
      {state?.info && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.info}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-lg bg-[var(--color-primary)] px-4 py-2.5 font-semibold text-white transition hover:bg-[var(--color-primary-dark)] disabled:opacity-60"
      >
        {pending ? "Memproses…" : "Daftar"}
      </button>
    </form>
  );
}

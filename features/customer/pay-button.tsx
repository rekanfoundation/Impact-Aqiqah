"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { startPaymentAction, type ActionState } from "@/server/actions/payment";
import { formatIDR } from "@/lib/utils";

function Btn({ mode, label }: { mode: "dp" | "full"; label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name="mode"
      value={mode}
      disabled={pending}
      className={
        mode === "full"
          ? "rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-primary-dark)] disabled:opacity-60"
          : "rounded-lg border border-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-[var(--color-primary)] hover:bg-amber-50 disabled:opacity-60"
      }
    >
      {pending ? "Memproses…" : label}
    </button>
  );
}

export function PayButton({
  orderId,
  remaining,
  dpAmount,
  allowDp,
}: {
  orderId: string;
  remaining: number;
  dpAmount: number;
  allowDp: boolean;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    startPaymentAction,
    undefined,
  );
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="order_id" value={orderId} />
      <div className="flex flex-wrap gap-2">
        {allowDp && dpAmount > 0 && dpAmount < remaining && (
          <Btn mode="dp" label={`Bayar DP ${formatIDR(dpAmount)}`} />
        )}
        <Btn mode="full" label={`Bayar Lunas ${formatIDR(remaining)}`} />
      </div>
      {state?.error && (
        <p className="text-xs text-[var(--color-danger)]">{state.error}</p>
      )}
      <p className="text-xs text-neutral-400">Pembayaran aman via iPaymu.</p>
    </form>
  );
}

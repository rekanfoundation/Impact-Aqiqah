"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createCustomerOrderAction, type ActionState } from "@/server/actions/customer";
import { formatIDR } from "@/lib/utils";
import { SERVICE_TYPE_LABEL } from "@/lib/packages";
import type { Service } from "@/types/db";

const input =
  "rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-dark)] disabled:opacity-60"
    >
      {pending ? "Memproses…" : "Buat Pesanan"}
    </button>
  );
}

export function CustomerOrderForm({
  packages,
  preselect,
}: {
  packages: Service[];
  preselect?: string;
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    createCustomerOrderAction,
    undefined,
  );
  const [serviceId, setServiceId] = useState(
    preselect && packages.some((p) => p.id === preselect) ? preselect : packages[0]?.id ?? "",
  );
  const [qty, setQty] = useState(1);

  const selected = packages.find((p) => p.id === serviceId);
  const total = (selected?.price ?? 0) * qty;

  return (
    <form action={action} className="flex max-w-lg flex-col gap-4">
      <input type="hidden" name="service_id" value={serviceId} />
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Pilih Paket</span>
        <select
          value={serviceId}
          onChange={(e) => setServiceId(e.target.value)}
          className={input}
        >
          {packages.map((p) => (
            <option key={p.id} value={p.id}>
              [{SERVICE_TYPE_LABEL[p.type]}] {p.name} — {formatIDR(p.price)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Jumlah</span>
        <input
          name="qty"
          type="number"
          min={1}
          value={qty}
          onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
          className={`${input} w-28`}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Catatan</span>
        <textarea name="notes" rows={2} className={input} placeholder="mis. atas nama, preferensi…" />
      </label>

      <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm">
        Total estimasi: <span className="font-bold text-[var(--color-primary)]">{formatIDR(total)}</span>
        <p className="mt-1 text-xs text-neutral-500">
          Tim kami akan menghubungi Anda untuk konfirmasi pembayaran & jadwal.
        </p>
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-[var(--color-danger)]">{state.error}</p>
      )}

      <Submit />
    </form>
  );
}

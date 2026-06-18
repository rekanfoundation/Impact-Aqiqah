"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createOrderAction, type ActionState } from "@/server/actions/orders";
import { formatIDR } from "@/lib/utils";
import type { Branch, Service } from "@/types/db";

const input =
  "rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]";

interface Item {
  service_id: string;
  qty: number;
  unit_price: number;
  on_behalf_of: string;
}
interface AnimalRow {
  species: "kambing" | "domba" | "sapi";
  on_behalf_of: string;
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-dark)] disabled:opacity-60"
    >
      {pending ? "Menyimpan…" : "Buat Order"}
    </button>
  );
}

export function NewOrderForm({
  branches,
  services,
}: {
  branches: Branch[];
  services: Service[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(
    createOrderAction,
    undefined,
  );
  const priceOf = (id: string) => services.find((s) => s.id === id)?.price ?? 0;
  const [items, setItems] = useState<Item[]>([
    {
      service_id: services[0]?.id ?? "",
      qty: 1,
      unit_price: services[0]?.price ?? 0,
      on_behalf_of: "",
    },
  ]);
  const [animals, setAnimals] = useState<AnimalRow[]>([]);

  const total = items.reduce((s, i) => s + i.qty * i.unit_price, 0);

  return (
    <form action={action} className="flex max-w-2xl flex-col gap-5">
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      <input type="hidden" name="animals" value={JSON.stringify(animals)} />

      <fieldset className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Nama Peserta *</span>
          <input name="participant_name" required className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">No. WhatsApp</span>
          <input name="participant_phone" className={input} placeholder="6281…" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Email</span>
          <input name="participant_email" type="email" className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Cabang *</span>
          <select name="branch_id" required className={input} defaultValue="">
            <option value="" disabled>
              Pilih cabang
            </option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      </fieldset>

      {/* Items */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-neutral-700">Layanan</span>
          <button
            type="button"
            onClick={() =>
              setItems((p) => [
                ...p,
                {
                  service_id: services[0]?.id ?? "",
                  qty: 1,
                  unit_price: services[0]?.price ?? 0,
                  on_behalf_of: "",
                },
              ])
            }
            className="text-sm text-[var(--color-primary)] hover:underline"
          >
            + Tambah layanan
          </button>
        </div>
        {items.map((it, idx) => (
          <div key={idx} className="flex flex-wrap items-center gap-2">
            <select
              className={input}
              value={it.service_id}
              onChange={(e) =>
                setItems((p) =>
                  p.map((x, i) =>
                    i === idx
                      ? { ...x, service_id: e.target.value, unit_price: priceOf(e.target.value) }
                      : x,
                  ),
                )
              }
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={it.qty}
              onChange={(e) =>
                setItems((p) =>
                  p.map((x, i) => (i === idx ? { ...x, qty: Number(e.target.value) } : x)),
                )
              }
              className={`${input} w-20`}
            />
            <input
              type="number"
              min={0}
              placeholder="Harga satuan"
              value={it.unit_price}
              onChange={(e) =>
                setItems((p) =>
                  p.map((x, i) => (i === idx ? { ...x, unit_price: Number(e.target.value) } : x)),
                )
              }
              className={`${input} w-36`}
            />
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}
                className="text-sm text-[var(--color-danger)]"
              >
                Hapus
              </button>
            )}
          </div>
        ))}
        <p className="text-sm text-neutral-600">
          Total: <span className="font-semibold">{formatIDR(total)}</span>
        </p>
      </div>

      {/* Animals */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-neutral-700">
            Hewan ({animals.length})
          </span>
          <button
            type="button"
            onClick={() =>
              setAnimals((p) => [...p, { species: "kambing", on_behalf_of: "" }])
            }
            className="text-sm text-[var(--color-primary)] hover:underline"
          >
            + Tambah hewan
          </button>
        </div>
        {animals.map((a, idx) => (
          <div key={idx} className="flex flex-wrap items-center gap-2">
            <select
              className={input}
              value={a.species}
              onChange={(e) =>
                setAnimals((p) =>
                  p.map((x, i) =>
                    i === idx ? { ...x, species: e.target.value as AnimalRow["species"] } : x,
                  ),
                )
              }
            >
              <option value="kambing">Kambing</option>
              <option value="domba">Domba</option>
              <option value="sapi">Sapi</option>
            </select>
            <input
              placeholder="Atas nama"
              value={a.on_behalf_of}
              onChange={(e) =>
                setAnimals((p) =>
                  p.map((x, i) => (i === idx ? { ...x, on_behalf_of: e.target.value } : x)),
                )
              }
              className={input}
            />
            <button
              type="button"
              onClick={() => setAnimals((p) => p.filter((_, i) => i !== idx))}
              className="text-sm text-[var(--color-danger)]"
            >
              Hapus
            </button>
          </div>
        ))}
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Catatan</span>
        <textarea name="notes" rows={2} className={input} />
      </label>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-[var(--color-danger)]">
          {state.error}
        </p>
      )}

      <Submit />
    </form>
  );
}

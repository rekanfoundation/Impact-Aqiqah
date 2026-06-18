"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  createServiceAction,
  updateServiceAction,
  type ActionState,
} from "@/server/actions/services";
import { SERVICE_TYPES, SERVICE_TYPE_LABEL } from "@/lib/packages";
import type { Service, ServiceType } from "@/types/db";

const input =
  "rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-dark)] disabled:opacity-60"
    >
      {pending ? "Menyimpan…" : label}
    </button>
  );
}

export function ServiceForm({ service }: { service?: Service }) {
  const isEdit = !!service;
  const action = isEdit ? updateServiceAction : createServiceAction;
  const [state, formAction] = useActionState<ActionState, FormData>(action, undefined);

  const [type, setType] = useState<ServiceType>(service?.type ?? "aqiqah");
  const [items, setItems] = useState<string[]>(
    Array.isArray(service?.meta?.items) ? (service!.meta.items as string[]) : [""],
  );

  const k = service?.meta ?? {};
  const h = k.hasil ?? {};

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-4">
      {isEdit && <input type="hidden" name="id" value={service!.id} />}
      <input type="hidden" name="items" value={JSON.stringify(items)} />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Jenis Layanan *</span>
          <select
            name="type"
            value={type}
            onChange={(e) => setType(e.target.value as ServiceType)}
            className={input}
          >
            {SERVICE_TYPES.map((t) => (
              <option key={t} value={t}>
                {SERVICE_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-neutral-700">Harga Jual (Rp) *</span>
          <input name="price" type="number" min={0} defaultValue={service?.price ?? 0} className={input} required />
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Nama Paket *</span>
        <input name="name" defaultValue={service?.name ?? ""} className={input} required />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-neutral-700">Deskripsi</span>
        <textarea name="description" rows={2} defaultValue={service?.description ?? ""} className={input} />
      </label>

      {/* Detail Kambing (Aqiqah) */}
      {type === "aqiqah" && (
        <fieldset className="rounded-lg border border-neutral-200 p-3">
          <legend className="px-1 text-sm font-semibold text-neutral-700">Rincian Kambing</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-neutral-600">Harga Kambing (Rp)</span>
              <input name="harga_kambing" type="number" min={0} defaultValue={k.harga_kambing ?? 0} className={input} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-neutral-600">Biaya Masak (Rp)</span>
              <input name="biaya_masak" type="number" min={0} defaultValue={k.biaya_masak ?? 0} className={input} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-neutral-600">Sate (tusuk)</span>
              <input name="sate_tusuk" type="number" min={0} defaultValue={h.sate_tusuk ?? 0} className={input} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-neutral-600">Olahan (porsi)</span>
              <input name="olahan_porsi" type="number" min={0} defaultValue={h.olahan_porsi ?? 0} className={input} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-neutral-600">Semur/Rendang (porsi)</span>
              <input name="semur_porsi" type="number" min={0} defaultValue={h.semur_porsi ?? 0} className={input} />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-neutral-600">Gulai/Sop (porsi)</span>
              <input name="gulai_porsi" type="number" min={0} defaultValue={h.gulai_porsi ?? 0} className={input} />
            </label>
          </div>
          <label className="mt-3 flex flex-col gap-1 text-sm">
            <span className="text-neutral-600">Cocok untuk</span>
            <input name="cocok_untuk" defaultValue={k.cocok_untuk ?? ""} className={input} />
          </label>
        </fieldset>
      )}

      {/* Daftar isi Nasi Box */}
      {type === "nasi_box" && (
        <fieldset className="rounded-lg border border-neutral-200 p-3">
          <legend className="px-1 text-sm font-semibold text-neutral-700">Isi Nasi Box</legend>
          <div className="flex flex-col gap-2">
            {items.map((it, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  value={it}
                  onChange={(e) =>
                    setItems((p) => p.map((x, i) => (i === idx ? e.target.value : x)))
                  }
                  placeholder="mis. Nasi kuning"
                  className={`${input} flex-1`}
                />
                <button
                  type="button"
                  onClick={() => setItems((p) => p.filter((_, i) => i !== idx))}
                  className="text-sm text-[var(--color-danger)]"
                >
                  Hapus
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setItems((p) => [...p, ""])}
              className="self-start text-sm text-[var(--color-primary)] hover:underline"
            >
              + Tambah item
            </button>
          </div>
        </fieldset>
      )}

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_active" defaultChecked={service?.is_active ?? true} />
        <span className="text-neutral-700">Aktif (tampil saat membuat order)</span>
      </label>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-[var(--color-danger)]">{state.error}</p>
      )}

      <Submit label={isEdit ? "Simpan Perubahan" : "Tambah Paket"} />
    </form>
  );
}

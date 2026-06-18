"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  transitionStatusAction,
  addPaymentAction,
  setScheduleAction,
  recordSlaughterAction,
  recordDistributionAction,
  createIssueAction,
  resolveIssueAction,
  type ActionState,
} from "@/server/actions/orders";
import { ORDER_TRANSITIONS, ORDER_STATUS, type OrderStatus } from "@/lib/status";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[var(--color-primary-dark)] disabled:opacity-60"
    >
      {pending ? "Memproses…" : label}
    </button>
  );
}

function Feedback({ state }: { state: ActionState }) {
  if (!state) return null;
  if (state.error)
    return <p className="text-xs text-[var(--color-danger)]">{state.error}</p>;
  if (state.ok)
    return <p className="text-xs text-[var(--color-success)]">Tersimpan.</p>;
  return null;
}

const input =
  "rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]";

export function StatusControl({
  orderId,
  current,
}: {
  orderId: string;
  current: OrderStatus;
}) {
  const [state, action] = useActionState(transitionStatusAction, undefined);
  const options = ORDER_TRANSITIONS[current] ?? [];
  if (options.length === 0)
    return <p className="text-sm text-neutral-500">Status final.</p>;

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="order_id" value={orderId} />
      <select name="to" className={input} defaultValue={options[0]}>
        {options.map((o) => (
          <option key={o} value={o}>
            {ORDER_STATUS[o].label}
          </option>
        ))}
      </select>
      <SubmitButton label="Ubah Status" />
      <Feedback state={state} />
    </form>
  );
}

export function PaymentForm({ orderId }: { orderId: string }) {
  const [state, action] = useActionState(addPaymentAction, undefined);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="order_id" value={orderId} />
      <input name="amount" type="number" min={1} placeholder="Jumlah (Rp)" className={input} required />
      <input name="method" placeholder="Metode" defaultValue="transfer" className={input} />
      <SubmitButton label="Catat Pembayaran" />
      <Feedback state={state} />
    </form>
  );
}

export function ScheduleForm({
  orderId,
  locations,
  petugas,
}: {
  orderId: string;
  locations: { id: string; name: string }[];
  petugas: { id: string; full_name: string | null }[];
}) {
  const [state, action] = useActionState(setScheduleAction, undefined);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="order_id" value={orderId} />
      <select name="location_id" className={input} required defaultValue="">
        <option value="" disabled>
          Pilih lokasi
        </option>
        {locations.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>
      <select name="pic_user_id" className={input} required defaultValue="">
        <option value="" disabled>
          Pilih PIC
        </option>
        {petugas.map((p) => (
          <option key={p.id} value={p.id}>
            {p.full_name ?? p.id}
          </option>
        ))}
      </select>
      <input name="scheduled_date" type="date" className={input} required />
      <input name="scheduled_time" type="time" className={input} />
      <SubmitButton label="Simpan Jadwal" />
      <Feedback state={state} />
    </form>
  );
}

export function SlaughterButton({
  orderId,
  animalId,
}: {
  orderId: string;
  animalId: string;
}) {
  const [state, action] = useActionState(recordSlaughterAction, undefined);
  return (
    <form action={action} className="inline-flex items-center gap-2">
      <input type="hidden" name="order_id" value={orderId} />
      <input type="hidden" name="animal_id" value={animalId} />
      <button
        type="submit"
        className="rounded-lg border border-neutral-300 px-2.5 py-1 text-xs text-neutral-700 hover:bg-neutral-100"
      >
        Catat Potong
      </button>
      <Feedback state={state} />
    </form>
  );
}

export function DistributionForm({ orderId }: { orderId: string }) {
  const [state, action] = useActionState(recordDistributionAction, undefined);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="order_id" value={orderId} />
      <input name="recipient_name" placeholder="Penerima/titik" className={input} required />
      <input name="recipient_area" placeholder="Area" className={input} />
      <input name="packages_count" type="number" min={0} placeholder="Paket" className={input} />
      <SubmitButton label="Catat Distribusi" />
      <Feedback state={state} />
    </form>
  );
}

export function IssueForm({ orderId }: { orderId: string }) {
  const [state, action] = useActionState(createIssueAction, undefined);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="order_id" value={orderId} />
      <input name="title" placeholder="Judul kendala" className={input} required />
      <select name="severity" className={input} defaultValue="medium">
        <option value="low">Rendah</option>
        <option value="medium">Sedang</option>
        <option value="high">Tinggi</option>
      </select>
      <input name="description" placeholder="Deskripsi" className={input} />
      <SubmitButton label="Lapor Kendala" />
      <Feedback state={state} />
    </form>
  );
}

export function ResolveIssueButton({
  orderId,
  issueId,
}: {
  orderId: string;
  issueId: string;
}) {
  const [state, action] = useActionState(resolveIssueAction, undefined);
  return (
    <form action={action} className="inline">
      <input type="hidden" name="order_id" value={orderId} />
      <input type="hidden" name="issue_id" value={issueId} />
      <button
        type="submit"
        className="text-xs text-[var(--color-primary)] hover:underline"
      >
        Tandai selesai
      </button>
      <Feedback state={state} />
    </form>
  );
}

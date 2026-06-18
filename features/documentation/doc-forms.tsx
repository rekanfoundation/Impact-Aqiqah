"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  uploadDocumentationAction,
  reviewDocumentationAction,
  type ActionState,
} from "@/server/actions/documentation";

const input =
  "rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]";

function Submit({ label }: { label: string }) {
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
  if (state.error) return <p className="text-xs text-[var(--color-danger)]">{state.error}</p>;
  if (state.ok) return <p className="text-xs text-[var(--color-success)]">Tersimpan.</p>;
  return null;
}

export function MediaUploader({ orderId }: { orderId: string }) {
  const [state, action] = useActionState(uploadDocumentationAction, undefined);
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="order_id" value={orderId} />
      <select name="type" className={input} defaultValue="photo">
        <option value="photo">Foto</option>
        <option value="video">Video</option>
        <option value="note">Catatan</option>
      </select>
      <select name="stage" className={input} defaultValue="slaughter">
        <option value="slaughter">Pemotongan</option>
        <option value="distribution">Distribusi</option>
        <option value="general">Umum</option>
      </select>
      {/* capture=environment membuka kamera belakang di mobile (docs/13) */}
      <input
        name="file"
        type="file"
        accept="image/*,video/*"
        capture="environment"
        className="text-sm"
      />
      <input name="caption" placeholder="Catatan…" className={input} />
      <Submit label="Unggah" />
      <Feedback state={state} />
    </form>
  );
}

export function ReviewControls({
  docId,
  orderId,
}: {
  docId: string;
  orderId: string;
}) {
  const [state, action] = useActionState(reviewDocumentationAction, undefined);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="doc_id" value={docId} />
      <input type="hidden" name="order_id" value={orderId} />
      <input name="note" placeholder="Alasan (jika tolak)" className={input} />
      <button
        type="submit"
        name="decision"
        value="approve"
        className="rounded-lg bg-[var(--color-success)] px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
      >
        Setujui
      </button>
      <button
        type="submit"
        name="decision"
        value="reject"
        className="rounded-lg bg-[var(--color-danger)] px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
      >
        Tolak
      </button>
      <Feedback state={state} />
    </form>
  );
}

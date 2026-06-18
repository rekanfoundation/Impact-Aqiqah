"use client";

import { useActionState } from "react";
import { toggleServiceActiveAction, type ActionState } from "@/server/actions/services";

export function ToggleActive({ id, active }: { id: string; active: boolean }) {
  const [, action] = useActionState<ActionState, FormData>(
    toggleServiceActiveAction,
    undefined,
  );
  return (
    <form action={action} className="inline">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="active" value={String(active)} />
      <button type="submit" className="text-xs text-neutral-500 hover:underline">
        {active ? "Nonaktifkan" : "Aktifkan"}
      </button>
    </form>
  );
}

"use client";

import { useState } from "react";

export function CopyLink({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* abaikan */
    }
  }
  return (
    <div className="flex items-stretch gap-2">
      <input
        readOnly
        value={link}
        className="flex-1 rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm"
      />
      <button
        onClick={copy}
        className="rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-white hover:bg-[var(--color-primary-dark)]"
      >
        {copied ? "Tersalin ✓" : "Salin"}
      </button>
    </div>
  );
}

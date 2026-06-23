"use client";

import { useState, useTransition } from "react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { updateSiteContact } from "@/server/actions/cms";
import type { SiteContact } from "@/server/db/cms";

const field =
  "mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]";
const label = "block text-sm font-medium text-neutral-700";

export function ContactSettings({ contact }: { contact: SiteContact }) {
  const [whatsapp, setWhatsapp] = useState(contact.whatsapp);
  const [instagram, setInstagram] = useState(contact.instagram_url);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function save() {
    setMsg(null);
    start(async () => {
      const res = await updateSiteContact({ whatsapp: whatsapp.trim(), instagram_url: instagram.trim() });
      setMsg(res.ok ? "Tersimpan." : (res.error ?? "Gagal"));
    });
  }

  return (
    <Card>
      <CardHeader title="Kontak Footer" />
      <CardBody className="flex flex-col gap-4">
        <p className="text-xs text-neutral-500">
          Override kontak yang tampil di footer. Bila dikosongkan, sistem memakai environment variable
          (NEXT_PUBLIC_WHATSAPP_NUMBER / NEXT_PUBLIC_INSTAGRAM_URL).
        </p>
        <div>
          <label className={label}>Nomor WhatsApp</label>
          <input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="cth: 628123456789" className={field} />
        </div>
        <div>
          <label className={label}>URL Instagram</label>
          <input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="https://instagram.com/zakatsukses" className={field} />
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={pending}
            className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "Menyimpan…" : "Simpan Kontak"}
          </button>
          {msg && <span className="text-sm text-neutral-600">{msg}</span>}
        </div>
      </CardBody>
    </Card>
  );
}

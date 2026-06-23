"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { LandingMediaItem, LandingSection } from "@/lib/landing-media-defaults";
import {
  uploadLandingMedia,
  replaceLandingMedia,
  deleteLandingMedia,
  toggleLandingVisibility,
  moveLandingMedia,
  updateLandingPartner,
  type ActionState,
} from "@/server/actions/landing-media";

const SECTION_LABEL: Record<LandingSection, string> = {
  hero: "Hero",
  gallery: "Galeri",
  kambing: "Gambar Kambing",
  olahan: "Olahan Aqiqah",
  nasi_box: "Nasi Box",
  sertifikat: "Sertifikat",
  partner: "Partner",
};

const MULTI: LandingSection[] = ["gallery", "partner"]; // boleh banyak + reorder

export function LandingCms({ items }: { items: LandingMediaItem[] }) {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run(fn: () => Promise<ActionState>) {
    setMsg(null);
    start(async () => {
      const res = await fn();
      if (res?.error) setMsg(res.error);
      else router.refresh();
    });
  }

  const order: LandingSection[] = ["hero", "gallery", "kambing", "olahan", "nasi_box", "sertifikat", "partner"];

  return (
    <div className="flex flex-col gap-8">
      {msg && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{msg}</p>}
      {order.map((section) => {
        const list = items.filter((i) => i.section === section).sort((a, b) => a.sort_order - b.sort_order);
        const multi = MULTI.includes(section);
        return (
          <section key={section} className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-neutral-800">{SECTION_LABEL[section]}</h2>
              {!multi && list.length > 0 && <span className="text-xs text-neutral-400">1 gambar</span>}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((it) => (
                <MediaCard
                  key={it.id}
                  item={it}
                  multi={multi}
                  isPartner={section === "partner"}
                  pending={pending}
                  run={run}
                />
              ))}
            </div>

            {/* Upload: section single hanya bila kosong; multi selalu bisa tambah */}
            {(multi || list.length === 0) && (
              <UploadForm section={section} isPartner={section === "partner"} pending={pending} run={run} />
            )}
          </section>
        );
      })}
    </div>
  );
}

function MediaCard({
  item,
  multi,
  isPartner,
  pending,
  run,
}: {
  item: LandingMediaItem;
  multi: boolean;
  isPartner: boolean;
  pending: boolean;
  run: (fn: () => Promise<ActionState>) => void;
}) {
  const replaceRef = useRef<HTMLInputElement>(null);
  const id = item.id!;

  return (
    <div className={`rounded-lg border p-2 ${item.is_visible ? "border-neutral-200" : "border-dashed border-neutral-300 opacity-60"}`}>
      <div className="relative aspect-video overflow-hidden rounded bg-neutral-100">
        <Image src={item.url} alt={item.alt ?? ""} fill sizes="240px" className="object-contain" />
      </div>

      {isPartner && (
        <PartnerFields id={id} alt={item.alt ?? ""} linkUrl={item.link_url ?? ""} pending={pending} run={run} />
      )}

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <button
          onClick={() => replaceRef.current?.click()}
          disabled={pending}
          className="rounded border border-neutral-300 px-2 py-1 hover:bg-neutral-50"
        >
          Ganti
        </button>
        <input
          ref={replaceRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const fd = new FormData();
            fd.set("id", id);
            fd.set("file", f);
            run(() => replaceLandingMedia(fd));
          }}
        />
        <button
          onClick={() => run(() => toggleLandingVisibility(id, item.is_visible))}
          disabled={pending}
          className="rounded border border-neutral-300 px-2 py-1 hover:bg-neutral-50"
        >
          {item.is_visible ? "Sembunyikan" : "Tampilkan"}
        </button>
        {multi && (
          <>
            <button onClick={() => run(() => moveLandingMedia(id, "up"))} disabled={pending} className="rounded border border-neutral-300 px-2 py-1 hover:bg-neutral-50">↑</button>
            <button onClick={() => run(() => moveLandingMedia(id, "down"))} disabled={pending} className="rounded border border-neutral-300 px-2 py-1 hover:bg-neutral-50">↓</button>
          </>
        )}
        <button
          onClick={() => run(() => deleteLandingMedia(id))}
          disabled={pending}
          className="rounded border border-red-200 px-2 py-1 text-red-600 hover:bg-red-50"
        >
          Hapus
        </button>
      </div>
    </div>
  );
}

function PartnerFields({
  id,
  alt,
  linkUrl,
  pending,
  run,
}: {
  id: string;
  alt: string;
  linkUrl: string;
  pending: boolean;
  run: (fn: () => Promise<ActionState>) => void;
}) {
  const [name, setName] = useState(alt);
  const [url, setUrl] = useState(linkUrl);
  return (
    <div className="mt-2 space-y-1.5">
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama partner" className="w-full rounded border border-neutral-300 px-2 py-1 text-xs" />
      <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://website-partner" className="w-full rounded border border-neutral-300 px-2 py-1 text-xs" />
      <button
        onClick={() => run(() => updateLandingPartner(id, name, url))}
        disabled={pending}
        className="rounded bg-neutral-800 px-2 py-1 text-xs text-white hover:bg-neutral-700"
      >
        Simpan
      </button>
    </div>
  );
}

function UploadForm({
  section,
  isPartner,
  pending,
  run,
}: {
  section: LandingSection;
  isPartner: boolean;
  pending: boolean;
  run: (fn: () => Promise<ActionState>) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [alt, setAlt] = useState("");
  const [link, setLink] = useState("");

  function submit() {
    const f = fileRef.current?.files?.[0];
    if (!f) return;
    const fd = new FormData();
    fd.set("section", section);
    fd.set("file", f);
    fd.set("alt", alt);
    if (isPartner) fd.set("link_url", link);
    run(() => uploadLandingMedia(fd));
    setAlt("");
    setLink("");
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="mt-3 flex flex-wrap items-end gap-2 border-t border-neutral-100 pt-3 text-sm">
      <input ref={fileRef} type="file" accept="image/*" className="text-xs" />
      <input value={alt} onChange={(e) => setAlt(e.target.value)} placeholder={isPartner ? "Nama partner" : "Alt text"} className="rounded border border-neutral-300 px-2 py-1 text-xs" />
      {isPartner && (
        <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://website" className="rounded border border-neutral-300 px-2 py-1 text-xs" />
      )}
      <button onClick={submit} disabled={pending} className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[var(--color-primary-dark)] disabled:opacity-60">
        {pending ? "Mengunggah…" : "+ Upload"}
      </button>
    </div>
  );
}

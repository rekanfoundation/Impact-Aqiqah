"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import {
  upsertCmsPage,
  deleteCmsPage,
  toggleCmsPage,
  moveCmsPage,
  uploadCmsImage,
  type CmsPageInput,
} from "@/server/actions/cms";
import type { CmsPage } from "@/server/db/cms";

type Draft = CmsPageInput;

const PAGE_TYPES = ["content", "packages", "gallery", "faq"] as const;
const GROUPS = [
  { value: "", label: "— tanpa footer —" },
  { value: "layanan", label: "Layanan" },
  { value: "bantuan", label: "Bantuan" },
];

const emptyDraft: Draft = {
  slug: "",
  title: "",
  page_type: "content",
  content: "",
  footer_group: null,
  nav_label: "",
  sort_order: 0,
  is_active: true,
  seo_title: "",
  seo_description: "",
  seo_keywords: "",
  og_image_url: "",
  featured_image_url: "",
  video_url: "",
};

const field =
  "mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]";
const label = "block text-xs font-medium text-neutral-600";

export function PagesManager({ pages }: { pages: CmsPage[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function openNew() {
    setEditId(null);
    setDraft({ ...emptyDraft });
    setMsg(null);
  }
  function openEdit(p: CmsPage) {
    setEditId(p.id);
    setDraft({
      slug: p.slug,
      title: p.title,
      page_type: p.page_type,
      content: p.content ?? "",
      footer_group: p.footer_group,
      nav_label: p.nav_label ?? "",
      sort_order: p.sort_order,
      is_active: p.is_active,
      seo_title: p.seo_title ?? "",
      seo_description: p.seo_description ?? "",
      seo_keywords: p.seo_keywords ?? "",
      og_image_url: p.og_image_url ?? "",
      featured_image_url: p.featured_image_url ?? "",
      video_url: p.video_url ?? "",
    });
    setMsg(null);
  }

  function save() {
    if (!draft) return;
    setMsg(null);
    start(async () => {
      const res = await upsertCmsPage({ ...draft, id: editId ?? undefined });
      if (res.ok) {
        setDraft(null);
        setEditId(null);
        router.refresh();
      } else setMsg(res.error ?? "Gagal menyimpan");
    });
  }

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setMsg(null);
    start(async () => {
      const res = await fn();
      if (res.ok) router.refresh();
      else setMsg(res.error ?? "Gagal");
    });
  }

  async function uploadImage(file: File, target: "featured_image_url" | "og_image_url") {
    if (!draft) return;
    const fd = new FormData();
    fd.set("file", file);
    fd.set("slug", draft.slug || draft.title || "page");
    setMsg("Mengunggah…");
    const res = await uploadCmsImage(fd);
    if (res.ok && res.url) {
      setDraft({ ...draft, [target]: res.url });
      setMsg(null);
    } else setMsg(res.error ?? "Gagal unggah");
  }

  return (
    <Card>
      <CardHeader
        title="Halaman (Page Builder)"
        action={
          <button
            onClick={openNew}
            className="rounded-lg bg-[var(--color-primary)] px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
          >
            + Tambah Halaman
          </button>
        }
      />
      <CardBody className="flex flex-col gap-4">
        {msg && <p className="rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">{msg}</p>}

        {/* Editor */}
        {draft && (
          <div className="rounded-xl border border-[var(--color-primary)]/30 bg-amber-50/40 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className={label}>Judul</label>
                <input
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  className={field}
                />
              </div>
              <div>
                <label className={label}>Slug (URL) — boleh diubah</label>
                <input
                  value={draft.slug}
                  onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                  placeholder="mis. proses"
                  className={field}
                />
              </div>
              <div>
                <label className={label}>Tipe Halaman</label>
                <select
                  value={draft.page_type}
                  onChange={(e) => setDraft({ ...draft, page_type: e.target.value as Draft["page_type"] })}
                  className={field}
                >
                  {PAGE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label}>Grup Footer</label>
                <select
                  value={draft.footer_group ?? ""}
                  onChange={(e) =>
                    setDraft({ ...draft, footer_group: (e.target.value || null) as Draft["footer_group"] })
                  }
                  className={field}
                >
                  {GROUPS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label}>Label Footer (opsional)</label>
                <input
                  value={draft.nav_label ?? ""}
                  onChange={(e) => setDraft({ ...draft, nav_label: e.target.value })}
                  className={field}
                />
              </div>
              <div>
                <label className={label}>Urutan</label>
                <input
                  type="number"
                  value={draft.sort_order ?? 0}
                  onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })}
                  className={field}
                />
              </div>
            </div>

            <div className="mt-3">
              <label className={label}>Konten (Markdown)</label>
              <textarea
                value={draft.content ?? ""}
                onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                rows={8}
                className={`${field} font-mono`}
                placeholder="## Judul&#10;Teks… gunakan **tebal**, - daftar, [link](https://...)"
              />
            </div>

            {/* SEO */}
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <label className={label}>SEO Meta Title</label>
                <input
                  value={draft.seo_title ?? ""}
                  onChange={(e) => setDraft({ ...draft, seo_title: e.target.value })}
                  className={field}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={label}>SEO Meta Description</label>
                <input
                  value={draft.seo_description ?? ""}
                  onChange={(e) => setDraft({ ...draft, seo_description: e.target.value })}
                  className={field}
                />
              </div>
              <div className="sm:col-span-3">
                <label className={label}>SEO Keywords (pisah koma)</label>
                <input
                  value={draft.seo_keywords ?? ""}
                  onChange={(e) => setDraft({ ...draft, seo_keywords: e.target.value })}
                  className={field}
                />
              </div>
            </div>

            {/* Media */}
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <ImageField
                label="Featured Image"
                value={draft.featured_image_url ?? ""}
                onUpload={(f) => uploadImage(f, "featured_image_url")}
                onClear={() => setDraft({ ...draft, featured_image_url: "" })}
              />
              <ImageField
                label="Open Graph Image (SEO share)"
                value={draft.og_image_url ?? ""}
                onUpload={(f) => uploadImage(f, "og_image_url")}
                onClear={() => setDraft({ ...draft, og_image_url: "" })}
              />
              <div className="sm:col-span-2">
                <label className={label}>Video URL (embed, mis. YouTube) — utk galeri</label>
                <input
                  value={draft.video_url ?? ""}
                  onChange={(e) => setDraft({ ...draft, video_url: e.target.value })}
                  className={field}
                />
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  checked={draft.is_active ?? true}
                  onChange={(e) => setDraft({ ...draft, is_active: e.target.checked })}
                  className="h-4 w-4 accent-[var(--color-primary)]"
                />
                Publish
              </label>
              <button
                onClick={save}
                disabled={pending}
                className="ml-auto rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                {pending ? "Menyimpan…" : editId ? "Simpan Perubahan" : "Buat Halaman"}
              </button>
              <button
                onClick={() => {
                  setDraft(null);
                  setEditId(null);
                }}
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-600"
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {/* List */}
        <div className="flex flex-col divide-y divide-neutral-100">
          {pages.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-neutral-800">{p.title}</span>
                  <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] text-neutral-500">
                    /{p.slug}
                  </span>
                  {p.footer_group && (
                    <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] text-amber-700">
                      {p.footer_group}
                    </span>
                  )}
                  {!p.is_active && <span className="text-[11px] text-red-500">draft</span>}
                </div>
                <div className="text-[11px] text-neutral-400">{p.page_type} · urutan {p.sort_order}</div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button onClick={() => run(() => moveCmsPage(p.id, "up"))} disabled={pending} className="rounded border border-neutral-300 px-1.5 py-1 text-xs">↑</button>
                <button onClick={() => run(() => moveCmsPage(p.id, "down"))} disabled={pending} className="rounded border border-neutral-300 px-1.5 py-1 text-xs">↓</button>
                <button onClick={() => run(() => toggleCmsPage(p.id, p.is_active))} disabled={pending} className="rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-100">
                  {p.is_active ? "Draft" : "Publish"}
                </button>
                <button onClick={() => openEdit(p)} className="rounded border border-neutral-300 px-2 py-1 text-xs text-neutral-700 hover:bg-neutral-100">Edit</button>
                <button onClick={() => run(() => deleteCmsPage(p.id))} disabled={pending} className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50">Hapus</button>
              </div>
            </div>
          ))}
          {pages.length === 0 && <p className="py-4 text-center text-sm text-neutral-400">Belum ada halaman.</p>}
        </div>
      </CardBody>
    </Card>
  );
}

function ImageField({
  label: lbl,
  value,
  onUpload,
  onClear,
}: {
  label: string;
  value: string;
  onUpload: (f: File) => void;
  onClear: () => void;
}) {
  return (
    <div>
      <label className={label}>{lbl}</label>
      <div className="mt-1 flex items-center gap-2">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-12 w-20 rounded object-cover" />
        ) : (
          <div className="flex h-12 w-20 items-center justify-center rounded bg-neutral-100 text-[11px] text-neutral-400">
            kosong
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
            e.target.value = "";
          }}
          className="text-xs"
        />
        {value && (
          <button onClick={onClear} className="text-xs text-red-500 hover:underline">
            hapus
          </button>
        )}
      </div>
    </div>
  );
}

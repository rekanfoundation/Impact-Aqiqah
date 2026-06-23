"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/server/auth/session";
import { BUCKET, extFromMime } from "@/lib/storage";

export type ActionState = { ok: boolean; error?: string; url?: string; path?: string };
const ok = (extra?: { url?: string; path?: string }): ActionState => ({ ok: true, ...extra });
const fail = (error: string): ActionState => ({ ok: false, error });

const ROLE = ["manager_program"] as const;

function revalidateAll(slug?: string) {
  revalidatePath("/");
  revalidatePath("/cms");
  revalidatePath("/sitemap.xml");
  if (slug) revalidatePath(`/${slug}`);
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ---------- CMS Pages ----------
export interface CmsPageInput {
  id?: string;
  slug: string;
  title: string;
  page_type?: "content" | "packages" | "gallery" | "faq";
  content?: string | null;
  footer_group?: "layanan" | "bantuan" | null;
  nav_label?: string | null;
  sort_order?: number;
  is_active?: boolean;
  seo_title?: string | null;
  seo_description?: string | null;
  seo_keywords?: string | null;
  og_image_url?: string | null;
  featured_image_url?: string | null;
  video_url?: string | null;
}

export async function upsertCmsPage(input: CmsPageInput): Promise<ActionState> {
  await requireRole([...ROLE]);
  const slug = slugify(input.slug || input.title);
  if (!slug) return fail("Slug tidak valid");
  if (!input.title?.trim()) return fail("Judul wajib diisi");

  const supabase = await createClient();
  const row = {
    slug,
    title: input.title.trim(),
    page_type: input.page_type ?? "content",
    content: input.content ?? null,
    footer_group: input.footer_group ?? null,
    nav_label: input.nav_label?.trim() || null,
    sort_order: input.sort_order ?? 0,
    is_active: input.is_active ?? true,
    seo_title: input.seo_title?.trim() || null,
    seo_description: input.seo_description?.trim() || null,
    seo_keywords: input.seo_keywords?.trim() || null,
    og_image_url: input.og_image_url?.trim() || null,
    featured_image_url: input.featured_image_url?.trim() || null,
    video_url: input.video_url?.trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = input.id
    ? await supabase.from("cms_pages").update(row).eq("id", input.id)
    : await supabase.from("cms_pages").insert(row);
  if (error) {
    if (error.code === "23505") return fail("Slug sudah dipakai halaman lain");
    return fail(error.message);
  }
  revalidateAll(slug);
  return ok();
}

export async function deleteCmsPage(id: string): Promise<ActionState> {
  await requireRole([...ROLE]);
  if (!id) return fail("ID tidak valid");
  const supabase = await createClient();
  const { error } = await supabase.from("cms_pages").delete().eq("id", id);
  if (error) return fail(error.message);
  revalidateAll();
  return ok();
}

export async function toggleCmsPage(id: string, active: boolean): Promise<ActionState> {
  await requireRole([...ROLE]);
  const supabase = await createClient();
  const { error } = await supabase.from("cms_pages").update({ is_active: !active }).eq("id", id);
  if (error) return fail(error.message);
  revalidateAll();
  return ok();
}

/** Tukar urutan dengan tetangga dalam footer_group yang sama. */
export async function moveCmsPage(id: string, dir: "up" | "down"): Promise<ActionState> {
  await requireRole([...ROLE]);
  const supabase = await createClient();
  const { data: cur } = await supabase
    .from("cms_pages")
    .select("id, footer_group, sort_order")
    .eq("id", id)
    .maybeSingle();
  const c = cur as { id: string; footer_group: string | null; sort_order: number } | null;
  if (!c) return fail("Halaman tidak ditemukan");

  let base = supabase.from("cms_pages").select("id, sort_order");
  base = c.footer_group ? base.eq("footer_group", c.footer_group) : base.is("footer_group", null);
  const q =
    dir === "up"
      ? base.lt("sort_order", c.sort_order).order("sort_order", { ascending: false })
      : base.gt("sort_order", c.sort_order).order("sort_order", { ascending: true });
  const { data: nb } = await q.limit(1).maybeSingle();
  const n = nb as { id: string; sort_order: number } | null;
  if (!n) return ok();

  await supabase.from("cms_pages").update({ sort_order: n.sort_order }).eq("id", c.id);
  await supabase.from("cms_pages").update({ sort_order: c.sort_order }).eq("id", n.id);
  revalidateAll();
  return ok();
}

/** Upload gambar (featured / OG) ke public-assets, kembalikan URL publik. */
export async function uploadCmsImage(formData: FormData): Promise<ActionState> {
  await requireRole([...ROLE]);
  const file = formData.get("file") as File | null;
  const slug = slugify(String(formData.get("slug") ?? "page")) || "page";
  if (!file || file.size === 0) return fail("File belum dipilih");
  if (!file.type.startsWith("image/")) return fail("File harus berupa gambar");

  const admin = createAdminClient();
  const ext = extFromMime(file.type);
  const path = `cms/${slug}/${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await admin.storage
    .from(BUCKET.publicAssets)
    .upload(path, buffer, { contentType: file.type, upsert: true });
  if (upErr) return fail(`Gagal unggah: ${upErr.message}`);
  const { data: pub } = admin.storage.from(BUCKET.publicAssets).getPublicUrl(path);
  return ok({ url: pub.publicUrl, path });
}

// ---------- FAQ ----------
export interface FaqInput {
  id?: string;
  category: string;
  question: string;
  answer: string;
  sort_order?: number;
  is_active?: boolean;
}

export async function upsertFaq(input: FaqInput): Promise<ActionState> {
  await requireRole([...ROLE]);
  if (!input.question?.trim() || !input.answer?.trim()) return fail("Pertanyaan & jawaban wajib diisi");
  const supabase = await createClient();
  const row = {
    category: input.category?.trim() || "Umum",
    question: input.question.trim(),
    answer: input.answer.trim(),
    sort_order: input.sort_order ?? 0,
    is_active: input.is_active ?? true,
    updated_at: new Date().toISOString(),
  };
  const { error } = input.id
    ? await supabase.from("faqs").update(row).eq("id", input.id)
    : await supabase.from("faqs").insert(row);
  if (error) return fail(error.message);
  revalidatePath("/");
  revalidatePath("/faq");
  revalidatePath("/cms");
  return ok();
}

export async function deleteFaq(id: string): Promise<ActionState> {
  await requireRole([...ROLE]);
  if (!id) return fail("ID tidak valid");
  const supabase = await createClient();
  const { error } = await supabase.from("faqs").delete().eq("id", id);
  if (error) return fail(error.message);
  revalidatePath("/");
  revalidatePath("/faq");
  revalidatePath("/cms");
  return ok();
}

export async function toggleFaq(id: string, active: boolean): Promise<ActionState> {
  await requireRole([...ROLE]);
  const supabase = await createClient();
  const { error } = await supabase.from("faqs").update({ is_active: !active }).eq("id", id);
  if (error) return fail(error.message);
  revalidatePath("/");
  revalidatePath("/faq");
  revalidatePath("/cms");
  return ok();
}

export async function moveFaq(id: string, dir: "up" | "down"): Promise<ActionState> {
  await requireRole([...ROLE]);
  const supabase = await createClient();
  const { data: cur } = await supabase
    .from("faqs")
    .select("id, category, sort_order")
    .eq("id", id)
    .maybeSingle();
  const c = cur as { id: string; category: string; sort_order: number } | null;
  if (!c) return fail("FAQ tidak ditemukan");
  const base = supabase.from("faqs").select("id, sort_order").eq("category", c.category);
  const q =
    dir === "up"
      ? base.lt("sort_order", c.sort_order).order("sort_order", { ascending: false })
      : base.gt("sort_order", c.sort_order).order("sort_order", { ascending: true });
  const { data: nb } = await q.limit(1).maybeSingle();
  const n = nb as { id: string; sort_order: number } | null;
  if (!n) return ok();
  await supabase.from("faqs").update({ sort_order: n.sort_order }).eq("id", c.id);
  await supabase.from("faqs").update({ sort_order: c.sort_order }).eq("id", n.id);
  revalidatePath("/");
  revalidatePath("/faq");
  revalidatePath("/cms");
  return ok();
}

// ---------- Kontak situs ----------
export async function updateSiteContact(input: {
  whatsapp?: string;
  instagram_url?: string;
}): Promise<ActionState> {
  await requireRole([...ROLE]);
  const supabase = await createClient();
  const { error } = await supabase.from("app_settings").upsert(
    {
      key: "site_contact",
      value: {
        whatsapp: input.whatsapp?.trim() || "",
        instagram_url: input.instagram_url?.trim() || "",
      },
      description: "Override kontak footer (docs/27): WhatsApp & Instagram.",
    },
    { onConflict: "key" },
  );
  if (error) return fail(error.message);
  revalidateAll();
  return ok();
}

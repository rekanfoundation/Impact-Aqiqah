import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { whatsappNumber, instagramUrl } from "@/lib/site";

// Data CMS (docs/27): halaman footer + FAQ + kontak situs.
// Baca publik via RPC SECURITY DEFINER (anon). Tulis/manage via client RLS (manager_program).

export interface CmsPage {
  id: string;
  slug: string;
  title: string;
  page_type: "content" | "packages" | "gallery" | "faq";
  content: string | null;
  footer_group: "layanan" | "bantuan" | null;
  nav_label: string | null;
  sort_order: number;
  is_active: boolean;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  og_image_url: string | null;
  og_image_path: string | null;
  featured_image_url: string | null;
  featured_image_path: string | null;
  video_url: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Faq {
  id: string;
  category: string;
  question: string;
  answer: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SiteContact {
  whatsapp: string;
  instagram_url: string;
}

const PAGE_COLS =
  "id, slug, title, page_type, content, footer_group, nav_label, sort_order, is_active, seo_title, seo_description, seo_keywords, og_image_url, og_image_path, featured_image_url, featured_image_path, video_url, created_at, updated_at";

/** Semua halaman aktif (publik, untuk footer & sitemap). Resilient. */
export async function getCmsPages(): Promise<CmsPage[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.rpc("get_cms_pages");
    return (data ?? []) as CmsPage[];
  } catch {
    return [];
  }
}

/** Satu halaman aktif by slug (publik). Null bila tak ada / draft. */
export async function getCmsPageBySlug(slug: string): Promise<CmsPage | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.rpc("get_cms_page", { p_slug: slug });
    const rows = (data ?? []) as CmsPage[];
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

/** FAQ aktif (publik). Resilient. */
export async function getFaqs(): Promise<Faq[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase.rpc("get_faqs");
    return (data ?? []) as Faq[];
  } catch {
    return [];
  }
}

/** Slug halaman aktif (untuk middleware allowlist & sitemap). Service role, resilient. */
export async function getPublicPageSlugs(): Promise<string[]> {
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("cms_pages").select("slug").eq("is_active", true);
    return ((data ?? []) as { slug: string }[]).map((r) => r.slug);
  } catch {
    return [];
  }
}

/** Semua halaman (admin, termasuk draft) via client RLS. */
export async function getAllCmsPages(): Promise<CmsPage[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("cms_pages")
      .select(PAGE_COLS)
      .order("footer_group", { ascending: true, nullsFirst: false })
      .order("sort_order", { ascending: true });
    return (data ?? []) as CmsPage[];
  } catch {
    return [];
  }
}

/** Semua FAQ (admin, termasuk nonaktif) via client RLS. */
export async function getAllFaqs(): Promise<Faq[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("faqs")
      .select("id, category, question, answer, sort_order, is_active, created_at, updated_at")
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true });
    return (data ?? []) as Faq[];
  } catch {
    return [];
  }
}

/** Kontak situs: env + override CMS (app_settings.site_contact). Resilient. */
export async function getSiteContact(): Promise<SiteContact> {
  const base: SiteContact = { whatsapp: whatsappNumber(), instagram_url: instagramUrl() };
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("app_settings")
      .select("value")
      .eq("key", "site_contact")
      .maybeSingle();
    const v = (data?.value ?? {}) as Partial<SiteContact>;
    return {
      whatsapp: v.whatsapp?.trim() || base.whatsapp,
      instagram_url: v.instagram_url?.trim() || base.instagram_url,
    };
  } catch {
    return base;
  }
}

import type { MetadataRoute } from "next";
import { getCmsPages } from "@/server/db/cms";
import { getPublicPackages } from "@/server/db/public";
import { appUrl } from "@/lib/site";

// XML Sitemap otomatis (docs/27 + docs/28): landing + halaman CMS + program (slug).
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = appUrl().replace(/\/$/, "");
  const [pages, packages] = await Promise.all([getCmsPages(), getPublicPackages()]);

  const now = new Date();
  const entries: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/sitemap`, lastModified: now, changeFrequency: "monthly", priority: 0.3 },
  ];

  for (const p of pages) {
    entries.push({
      url: `${base}/${p.slug}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : now,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  // Halaman program (paket) by slug.
  for (const s of packages) {
    if (!s.slug) continue;
    entries.push({
      url: `${base}/${s.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  return entries;
}

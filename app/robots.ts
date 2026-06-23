import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/site";

// robots.txt otomatis (docs/27). Izinkan crawl publik; blokir area privat; tautkan sitemap.
export default function robots(): MetadataRoute.Robots {
  const base = appUrl().replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/akun/", "/dashboard", "/orders", "/reports", "/settings", "/cms", "/checkout/sukses"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}

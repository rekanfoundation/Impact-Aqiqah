import type { MetadataRoute } from "next";

// PWA Web App Manifest (docs/13). Di-route Next sebagai /manifest.webmanifest.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ImpactAqiqah",
    short_name: "ImpactAqiqah",
    description:
      "Aqiqah berkah & profesional — Tunaikan Ibadah, Tebarkan Manfaat.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#f59e0b",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

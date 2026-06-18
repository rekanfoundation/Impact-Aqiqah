import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SwRegister } from "@/features/pwa/sw-register";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ImpactAqiqah — Aqiqah Berkah untuk Buah Hati Tercinta",
    template: "%s — ImpactAqiqah",
  },
  description:
    "Layanan aqiqah profesional & syar'i: pemilihan kambing, penyembelihan, masak higienis, hingga distribusi & laporan. Tunaikan Ibadah, Tebarkan Manfaat.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ImpactAqiqah",
  },
};

export const viewport: Viewport = {
  themeColor: "#f59e0b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={inter.variable}>
      <body className="antialiased">
        {children}
        <SwRegister />
      </body>
    </html>
  );
}

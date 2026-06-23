import { SiteHeader, SiteFooter, WhatsAppFab } from "@/features/landing/site-chrome";
import { MobileDock } from "@/features/landing/mobile-dock";
import { OrganizationJsonLd, WebsiteJsonLd } from "@/features/seo/json-ld";
import { getSiteContact } from "@/server/db/cms";

// Chrome bersama untuk halaman publik (landing + halaman CMS footer). docs/27.
export default async function SiteLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const contact = await getSiteContact();

  return (
    <>
      <OrganizationJsonLd instagramUrl={contact.instagram_url} whatsapp={contact.whatsapp} />
      <WebsiteJsonLd />
      <SiteHeader />
      {children}
      <SiteFooter />
      {/* spacer agar footer tak tertutup floating dock di mobile */}
      <div aria-hidden className="h-24 md:hidden" />
      <MobileDock />
      <WhatsAppFab />
    </>
  );
}

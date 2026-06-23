import { SiteHeader, SiteFooter, WhatsAppFab } from "@/features/landing/site-chrome";
import {
  Hero,
  Why,
  Gallery,
  AnimalSection,
  FoodSection,
  CertificateSection,
  PartnersSection,
  Steps,
  Testimonials,
  Faq,
  CtaBanner,
} from "@/features/landing/sections";
import { KambingPackages, NasiBoxPackages } from "@/features/landing/packages";
import { MobileDock } from "@/features/landing/mobile-dock";
import { getPublicPackages, splitPackages } from "@/server/db/public";
import { getLandingMedia } from "@/server/db/landing-media";

export const metadata = {
  title: "ImpactAqiqah — Aqiqah Berkah untuk Buah Hati Tercinta",
};

export default async function LandingPage() {
  const [all, media] = await Promise.all([getPublicPackages(), getLandingMedia()]);
  const { kambing, nasiBox } = splitPackages(all);

  return (
    <>
      <SiteHeader />
      <main>
        <Hero image={media.hero} />
        <Why />
        <AnimalSection image={media.kambing} />
        <KambingPackages packages={kambing} />
        <FoodSection olahan={media.olahan} nasiBox={media.nasiBox} />
        <NasiBoxPackages packages={nasiBox} />
        <Gallery images={media.gallery} />
        <CertificateSection image={media.sertifikat} />
        <Steps />
        <Testimonials />
        <PartnersSection partners={media.partners} />
        <Faq />
        <CtaBanner />
      </main>
      <SiteFooter />
      {/* spacer agar footer tak tertutup floating dock di mobile */}
      <div aria-hidden className="h-24 md:hidden" />
      <MobileDock />
      <WhatsAppFab />
    </>
  );
}

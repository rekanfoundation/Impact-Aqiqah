import { SiteHeader, SiteFooter, WhatsAppFab } from "@/features/landing/site-chrome";
import {
  Hero,
  Why,
  Gallery,
  Steps,
  Testimonials,
  Faq,
  CtaBanner,
} from "@/features/landing/sections";
import { KambingPackages, NasiBoxPackages } from "@/features/landing/packages";
import { TawkTo } from "@/features/integrations/tawk-to";
import { getPublicPackages, splitPackages } from "@/server/db/public";

export const metadata = {
  title: "ImpactAqiqah — Aqiqah Berkah untuk Buah Hati Tercinta",
};

export default async function LandingPage() {
  const all = await getPublicPackages();
  const { kambing, nasiBox } = splitPackages(all);

  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <Why />
        <KambingPackages packages={kambing} />
        <NasiBoxPackages packages={nasiBox} />
        <Gallery />
        <Steps />
        <Testimonials />
        <Faq />
        <CtaBanner />
      </main>
      <SiteFooter />
      <WhatsAppFab />
      <TawkTo />
    </>
  );
}

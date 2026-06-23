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
import { getPublicPackages, splitPackages } from "@/server/db/public";
import { getLandingMedia } from "@/server/db/landing-media";
import { getFaqs } from "@/server/db/cms";

export const metadata = {
  title: { absolute: "ImpactAqiqah — Aqiqah Berkah untuk Buah Hati Tercinta" },
  description:
    "Layanan aqiqah, qurban & sedekah daging profesional dan syar'i. Pesan online, bayar via sistem, terima laporan & dokumentasi. Tunaikan Ibadah, Tebarkan Manfaat.",
  alternates: { canonical: "/" },
};

export default async function LandingPage() {
  const [all, media, faqs] = await Promise.all([
    getPublicPackages(),
    getLandingMedia(),
    getFaqs(),
  ]);
  const { kambing, nasiBox } = splitPackages(all);

  return (
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
      <Faq items={faqs.slice(0, 6).map((f) => ({ q: f.question, a: f.answer }))} />
      <CtaBanner />
    </main>
  );
}

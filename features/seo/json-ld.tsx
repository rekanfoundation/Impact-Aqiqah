import { appUrl, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";

// Structured data JSON-LD (docs/27 GEO/AI Search). Render <script type="application/ld+json">.
// Konten dibangun server-side dari data tepercaya → aman untuk dangerouslySetInnerHTML.

function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function OrganizationJsonLd({
  instagramUrl,
  whatsapp,
}: {
  instagramUrl: string;
  whatsapp: string;
}) {
  const base = appUrl();
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Organization",
        name: SITE_NAME,
        url: base,
        logo: `${base}/icon.svg`,
        description: SITE_DESCRIPTION,
        sameAs: [instagramUrl].filter(Boolean),
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer service",
          telephone: `+${whatsapp.replace(/\D/g, "")}`,
          areaServed: "ID",
          availableLanguage: ["id"],
        },
      }}
    />
  );
}

export function WebsiteJsonLd() {
  const base = appUrl();
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: SITE_NAME,
        url: base,
        inLanguage: "id-ID",
      }}
    />
  );
}

export function BreadcrumbJsonLd({ items }: { items: { name: string; path: string }[] }) {
  const base = appUrl();
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((it, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: it.name,
          item: `${base}${it.path}`,
        })),
      }}
    />
  );
}

export function FaqJsonLd({ items }: { items: { question: string; answer: string }[] }) {
  if (items.length === 0) return null;
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: items.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      }}
    />
  );
}

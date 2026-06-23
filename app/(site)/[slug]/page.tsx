import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCmsPageBySlug, getFaqs } from "@/server/db/cms";
import { getPublicPackages, splitPackages } from "@/server/db/public";
import { getLandingMedia } from "@/server/db/landing-media";
import { renderMarkdown } from "@/lib/markdown";
import { KambingPackages, NasiBoxPackages } from "@/features/landing/packages";
import { Gallery } from "@/features/landing/sections";
import { FaqView } from "@/features/cms/faq-view";
import { BreadcrumbJsonLd, FaqJsonLd } from "@/features/seo/json-ld";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const page = await getCmsPageBySlug(slug);
  if (!page) return { title: "Halaman tidak ditemukan" };

  const title = page.seo_title || page.title;
  const description = page.seo_description || undefined;
  const image = page.og_image_url || page.featured_image_url || undefined;

  return {
    title: { absolute: title },
    description,
    keywords: page.seo_keywords || undefined,
    alternates: { canonical: `/${page.slug}` },
    openGraph: {
      title,
      description,
      url: `/${page.slug}`,
      type: "website",
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function CmsPage({ params }: Props) {
  const { slug } = await params;
  const page = await getCmsPageBySlug(slug);
  if (!page) notFound();

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <BreadcrumbJsonLd
        items={[
          { name: "Beranda", path: "/" },
          { name: page.title, path: `/${page.slug}` },
        ]}
      />
      <nav className="mb-3 text-sm text-neutral-400">
        <Link href="/" className="hover:text-neutral-700">
          Beranda
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-neutral-600">{page.title}</span>
      </nav>
      <h1 className="text-3xl font-bold text-neutral-900">{page.title}</h1>

      {page.featured_image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={page.featured_image_url}
          alt={page.title}
          className="mt-5 w-full rounded-2xl object-cover"
        />
      )}

      <div className="mt-6">
        <PageBody slug={page.slug} type={page.page_type} content={page.content} videoUrl={page.video_url} />
      </div>
    </main>
  );
}

async function PageBody({
  type,
  content,
  videoUrl,
}: {
  slug: string;
  type: "content" | "packages" | "gallery" | "faq";
  content: string | null;
  videoUrl: string | null;
}) {
  const intro = content ? (
    <div
      className="cms-prose mb-8"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  ) : null;

  if (type === "packages") {
    const all = await getPublicPackages();
    const { kambing, nasiBox } = splitPackages(all);
    return (
      <>
        {intro}
        <KambingPackages packages={kambing} />
        <NasiBoxPackages packages={nasiBox} />
      </>
    );
  }

  if (type === "gallery") {
    const media = await getLandingMedia();
    return (
      <>
        {intro}
        <Gallery images={media.gallery} />
        {videoUrl && (
          <div className="mt-6 aspect-video w-full overflow-hidden rounded-2xl">
            <iframe
              src={videoUrl}
              title="Video kegiatan"
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}
      </>
    );
  }

  if (type === "faq") {
    const faqs = await getFaqs();
    return (
      <>
        {intro}
        <FaqJsonLd items={faqs.map((f) => ({ question: f.question, answer: f.answer }))} />
        <FaqView faqs={faqs} />
      </>
    );
  }

  // content
  return intro ?? <p className="text-neutral-500">Konten belum tersedia.</p>;
}

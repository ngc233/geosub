import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  formatArticleDate,
  getArticleTypeLabel,
  getPublishedArticleBySlug,
  renderArticleMarkdown,
} from "../../../../lib/articles";
import { stripGeoSubTitleSuffix } from "../../../../lib/pricing-routes";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://geosub.org";

function absoluteUrl(path: string) {
  return new URL(path, siteUrl).toString();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [article, chineseArticle] = await Promise.all([
    getPublishedArticleBySlug(slug, "EN"),
    getPublishedArticleBySlug(slug, "ZH"),
  ]);

  if (!article) return { title: "Guide not found" };

  const title = stripGeoSubTitleSuffix(
    article.seoTitle || article.ogTitle || article.title,
  );
  const description =
    article.seoDescription || article.ogDescription || article.excerpt || undefined;
  const path = `/en/guides/${article.slug}`;
  const url = article.canonicalUrl || absoluteUrl(path);
  const image = article.ogImageUrl || article.coverImageUrl || undefined;

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: chineseArticle
        ? {
            "zh-CN": `/zh/guides/${chineseArticle.slug}`,
            en: path,
            "x-default": path,
          }
        : undefined,
    },
    robots: {
      index: !article.noindex,
      follow: !article.nofollow,
    },
    openGraph: {
      type: "article",
      title: stripGeoSubTitleSuffix(article.ogTitle || title),
      description,
      url,
      images: image ? [{ url: image }] : undefined,
      publishedTime: article.publishedAt?.toISOString(),
      modifiedTime: article.updatedAt.toISOString(),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function EnglishGuideArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getPublishedArticleBySlug(slug, "EN");

  if (!article) notFound();

  const html = article.bodyHtml || renderArticleMarkdown(article.bodyMarkdown);
  const url = article.canonicalUrl || absoluteUrl(`/en/guides/${article.slug}`);
  const image = article.ogImageUrl || article.coverImageUrl || undefined;
  const structuredData =
    article.structuredDataType === "NONE"
      ? null
      : {
          "@context": "https://schema.org",
          "@type": article.structuredDataType.replace("_", ""),
          headline: article.title,
          description: article.seoDescription || article.excerpt || undefined,
          image,
          datePublished: article.publishedAt?.toISOString(),
          dateModified: article.updatedAt.toISOString(),
          author: {
            "@type": "Organization",
            name: article.authorName || "GeoSub Editorial",
          },
          publisher: {
            "@type": "Organization",
            "@id": `${siteUrl}/#organization`,
            name: "GeoSub",
            logo: {
              "@type": "ImageObject",
              url: `${siteUrl}/logo.png`,
            },
          },
          mainEntityOfPage: url,
        };

  return (
    <main className="min-h-screen bg-[#faf8f2] px-5 py-12">
      {structuredData ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      ) : null}

      <article className="mx-auto max-w-3xl">
        <Link href="/en/guides" className="text-sm font-black text-blue-700 hover:text-blue-900">
          Back to guides
        </Link>

        <header className="mt-8">
          <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-zinc-500">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
              {getArticleTypeLabel(article.articleType, "en")}
            </span>
            <span>{formatArticleDate(article.publishedAt, "en")}</span>
            <span>{article.readingTime || 1} min read</span>
            {article.category ? <span>{article.category.name}</span> : null}
          </div>

          <h1 className="mt-5 text-4xl font-black tracking-tight text-zinc-950 md:text-5xl">
            {article.title}
          </h1>

          {article.subtitle || article.excerpt ? (
            <p className="mt-5 text-lg leading-8 text-zinc-600">
              {article.subtitle || article.excerpt}
            </p>
          ) : null}
        </header>

        {article.coverImageUrl ? (
          <Image
            src={article.coverImageUrl}
            alt={article.title}
            width={1200}
            height={675}
            unoptimized
            className="mt-10 aspect-[16/9] w-full rounded-xl object-cover"
          />
        ) : null}

        <div
          className="article-body mt-10 rounded-xl border border-zinc-200 bg-white p-7 text-zinc-700 shadow-sm shadow-zinc-950/[0.03] md:p-9"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {article.relations.length > 0 ? (
          <aside className="mt-8 rounded-xl border border-zinc-200 bg-white p-6">
            <h2 className="text-base font-black text-zinc-950">Related reading</h2>
            <div className="mt-4 grid gap-3">
              {article.relations.map((relation) => {
                const href = relation.relatedArticle
                  ? `/en/guides/${relation.relatedArticle.slug}`
                  : relation.product
                    ? `/en/${relation.product.category === "STREAMING" ? "streaming-pricing" : "ai-pricing"}/${relation.product.slug}`
                    : null;

                if (!href) return null;

                return (
                  <Link
                    key={relation.id}
                    href={href}
                    className="rounded-lg border border-zinc-200 px-4 py-3 transition hover:border-blue-200 hover:bg-blue-50"
                  >
                    <div className="font-bold text-zinc-950">
                      {relation.title || relation.relatedArticle?.title || relation.product?.name}
                    </div>
                    {relation.description ? (
                      <div className="mt-1 text-sm text-zinc-500">{relation.description}</div>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </aside>
        ) : null}
      </article>
    </main>
  );
}

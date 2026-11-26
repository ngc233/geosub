import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import GuideArticle from "../../../../components/GuideArticle";
import {
  formatArticleDate,
  getArticleTypeLabel,
  getPublishedArticleBySlug,
  renderArticleMarkdown,
} from "../../../../lib/articles";
import { getArticleSchemaOrgType } from "../../../../lib/article-structured-data";
import { sanitizeArticleHtml } from "../../../../lib/content-safety";
import { getGuideArticleUiCopy, getGuideHubCopy } from "../../../../lib/guide-hub-copy";
import { serializeJsonLd } from "../../../../lib/json-ld";
import { stripGeoSubTitleSuffix } from "../../../../lib/pricing-routes";
import {
  getLocaleRobotsPolicy,
  isSeoIndexableLocale,
} from "../../../../lib/seo-indexing-policy";

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
  const article = await getPublishedArticleBySlug(slug, "ES");
  const baseRobots = getLocaleRobotsPolicy("es");

  if (!article) {
    return {
      title: "Guía no encontrada",
      robots: baseRobots,
    };
  }

  const title = stripGeoSubTitleSuffix(
    article.seoTitle || article.ogTitle || article.title,
  );
  const description =
    article.seoDescription || article.ogDescription || article.excerpt || undefined;
  const path = `/es/guides/${article.slug}`;
  const url = article.canonicalUrl || absoluteUrl(path);
  const image = article.ogImageUrl || article.coverImageUrl || undefined;

  return {
    title,
    description,
    alternates: {
      canonical: url,
      ...(isSeoIndexableLocale("es") ? { languages: { es: path } } : {}),
    },
    robots: {
      index: baseRobots.index && !article.noindex,
      follow: baseRobots.follow && !article.nofollow,
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

export default async function SpanishGuideArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getPublishedArticleBySlug(slug, "ES");

  if (!article) notFound();

  const copy = getGuideHubCopy("es");
  const uiCopy = getGuideArticleUiCopy("es");
  const html = sanitizeArticleHtml(
    article.bodyHtml || renderArticleMarkdown(article.bodyMarkdown),
  );
  const url = article.canonicalUrl || absoluteUrl(`/es/guides/${article.slug}`);
  const image = article.ogImageUrl || article.coverImageUrl || undefined;
  const schemaOrgType = getArticleSchemaOrgType(article.structuredDataType);
  const structuredData =
    schemaOrgType === null
      ? null
      : {
          "@context": "https://schema.org",
          "@type": schemaOrgType,
          headline: article.title,
          description: article.seoDescription || article.excerpt || undefined,
          image,
          datePublished: article.publishedAt?.toISOString(),
          dateModified: article.updatedAt.toISOString(),
          author: {
            "@type": "Organization",
            name: article.authorName || uiCopy.editorialAuthor,
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

  const relatedLinks = article.relations.flatMap((relation) => {
    const href = relation.relatedArticle
      ? `/es/guides/${relation.relatedArticle.slug}`
      : relation.product
        ? `/es/${relation.product.category === "STREAMING" ? "streaming-pricing" : "ai-pricing"}/${relation.product.slug}`
        : null;
    return href
      ? [
          {
            href,
            title: relation.title || relation.relatedArticle?.title || relation.product?.name || "",
            description: relation.description,
          },
        ]
      : [];
  });

  const typeLabel = getArticleTypeLabel(article.articleType, "es");

  return (
    <>
      {structuredData ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
        />
      ) : null}
      <GuideArticle
        locale="es"
        eyebrow={article.category?.name || typeLabel}
        title={article.title}
        description={article.subtitle || article.excerpt}
        relatedLinks={relatedLinks}
        relatedLabel={uiCopy.relatedReading}
        tocEnabled={article.tocEnabled}
        metadata={
          <>
            <span>{typeLabel}</span>
            <span>{formatArticleDate(article.publishedAt, "es")}</span>
            <span>{copy.minutesLabel(article.readingTime || 1)}</span>
          </>
        }
      >
        {article.coverImageUrl ? (
          <Image
            src={article.coverImageUrl}
            alt={article.title}
            width={1200}
            height={675}
            unoptimized
            className="gs-guide-cover"
          />
        ) : null}
        <div className="gs-guide-prose" data-guide-body dangerouslySetInnerHTML={{ __html: html }} />
      </GuideArticle>
    </>
  );
}

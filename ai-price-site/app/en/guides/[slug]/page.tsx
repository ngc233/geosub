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
import { sanitizeArticleHtml } from "../../../../lib/content-safety";
import { getArticleSchemaOrgType } from "../../../../lib/article-structured-data";
import { serializeJsonLd } from "../../../../lib/json-ld";
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

  const html = sanitizeArticleHtml(
    article.bodyHtml || renderArticleMarkdown(article.bodyMarkdown),
  );
  const url = article.canonicalUrl || absoluteUrl(`/en/guides/${article.slug}`);
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

  const relatedLinks = article.relations.flatMap((relation) => {
    const href = relation.relatedArticle
      ? `/en/guides/${relation.relatedArticle.slug}`
      : relation.product
        ? `/en/${relation.product.category === "STREAMING" ? "streaming-pricing" : "ai-pricing"}/${relation.product.slug}`
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

  const typeLabel = getArticleTypeLabel(article.articleType, "en");

  return (
    <>
      {structuredData ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
        />
      ) : null}
      <GuideArticle
        locale="en"
        eyebrow={article.category?.name || typeLabel}
        title={article.title}
        description={article.subtitle || article.excerpt}
        relatedLinks={relatedLinks}
        relatedLabel="Related reading"
        tocEnabled={article.tocEnabled}
        metadata={
          <>
            <span>{typeLabel}</span>
            <span>{formatArticleDate(article.publishedAt, "en")}</span>
            <span>{article.readingTime || 1} min read</span>
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

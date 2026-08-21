import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublicGuidePage from "./PublicGuidePage";
import { getArticleTypeLabel } from "../lib/articles";
import { loadCoreGuideCmsState } from "../lib/core-guide-cms";
import {
  getCoreGuideDefinition,
  parseCoreGuideMarkdown,
  type CoreGuideDefinition,
  type CoreGuideLocale,
  type CoreGuideSlug,
} from "../lib/core-guide-content";
import { stripGeoSubTitleSuffix } from "../lib/pricing-routes";
import { serializeJsonLd } from "../lib/json-ld";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://geosub.org").replace(/\/$/, "");

function routePath(locale: CoreGuideLocale, slug: CoreGuideSlug) {
  return `/${locale}/guides/${slug}`;
}

function absoluteUrl(path: string) {
  return new URL(path, `${siteUrl}/`).toString();
}

function resolveSeoDescription(
  definition: CoreGuideDefinition,
  ...candidates: Array<string | null | undefined>
) {
  const candidate = candidates.find((value) => value?.trim())?.trim();

  if (
    !candidate ||
    definition.previousSeoDescriptions?.includes(candidate)
  ) {
    return definition.seoDescription;
  }

  return candidate;
}

export async function getCoreGuideMetadata({
  locale,
  slug,
}: {
  locale: CoreGuideLocale;
  slug: CoreGuideSlug;
}): Promise<Metadata> {
  const definition = getCoreGuideDefinition(locale, slug);
  const state = await loadCoreGuideCmsState(locale, slug);
  const article = state.article;
  const path = routePath(locale, slug);
  const title = stripGeoSubTitleSuffix(
    article?.seoTitle || article?.ogTitle || article?.title || definition.seoTitle,
  );
  const description = resolveSeoDescription(
    definition,
    article?.seoDescription,
    article?.ogDescription,
    article?.excerpt,
  );
  const canonical = article?.canonicalUrl || absoluteUrl(path);
  const image = article?.ogImageUrl || article?.coverImageUrl || undefined;
  const isUnavailableInCms = state.managed && !article;

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        "zh-CN": routePath("zh", slug),
        en: routePath("en", slug),
        "x-default": routePath("en", slug),
      },
    },
    robots: {
      index: !isUnavailableInCms && !article?.noindex,
      follow: !article?.nofollow,
    },
    openGraph: {
      type: "article",
      title,
      description,
      url: canonical,
      images: image ? [{ url: image }] : undefined,
      publishedTime: article?.publishedAt?.toISOString(),
      modifiedTime: article?.updatedAt.toISOString(),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function CmsBackedGuidePage({
  locale,
  slug,
}: {
  locale: CoreGuideLocale;
  slug: CoreGuideSlug;
}) {
  const definition = getCoreGuideDefinition(locale, slug);
  const state = await loadCoreGuideCmsState(locale, slug);

  if (state.managed && !state.article) notFound();

  const article = state.article;
  const parsed = parseCoreGuideMarkdown(article?.bodyMarkdown, definition);
  const title = article?.title || definition.title;
  const description = article?.subtitle || article?.excerpt || definition.description;
  const canonical = article?.canonicalUrl || absoluteUrl(routePath(locale, slug));
  const relatedLinks = (article?.relations || []).flatMap((relation) => {
    const href = relation.relatedArticle
      ? `/${locale}/guides/${relation.relatedArticle.slug}`
      : relation.product
        ? `/${locale}/${relation.product.category === "STREAMING" ? "streaming-pricing" : "ai-pricing"}/${relation.product.slug}`
        : null;

    if (!href) return [];

    return [
      {
        href,
        title:
          relation.title ||
          relation.relatedArticle?.title ||
          relation.product?.name ||
          "",
        description: relation.description,
      },
    ];
  });
  const structuredData = {
    "@context": "https://schema.org",
    "@type": article?.structuredDataType === "NONE" ? "WebPage" : "Article",
    headline: title,
    description: resolveSeoDescription(definition, article?.seoDescription),
    ...(article?.publishedAt ? { datePublished: article.publishedAt.toISOString() } : {}),
    ...(article?.updatedAt ? { dateModified: article.updatedAt.toISOString() } : {}),
    author: {
      "@type": "Organization",
      name: article?.authorName || (locale === "zh" ? "GeoSub 编辑部" : "GeoSub Editorial"),
    },
    publisher: {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "GeoSub",
    },
    mainEntityOfPage: canonical,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />
      <PublicGuidePage
        eyebrow={
          article
            ? getArticleTypeLabel(article.articleType, locale)
            : definition.eyebrow
        }
        title={title}
        description={description}
        sections={parsed.sections}
        note={parsed.note}
        relatedLabel={locale === "zh" ? "相关阅读" : "Related reading"}
        relatedLinks={relatedLinks}
      />
    </>
  );
}

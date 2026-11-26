import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PublicGuidePage from "./PublicGuidePage";
import { getArticleTypeLabel, formatArticleDate } from "../lib/articles";
import type { CanvasLocale } from "../lib/canvas-ui-copy";
import { loadCoreGuideCmsState } from "../lib/core-guide-cms";
import {
  getCoreGuideDefinition,
  parseCoreGuideMarkdown,
  type CoreGuideDefinition,
  type CoreGuideSlug,
} from "../lib/core-guide-content";
import { stripGeoSubTitleSuffix } from "../lib/pricing-routes";
import { serializeJsonLd } from "../lib/json-ld";
import { isUnifiedPublicLocale } from "../lib/public-style-rollout";
import {
  getLocaleRobotsPolicy,
  isSeoIndexableLocale,
} from "../lib/seo-indexing-policy";
import {
  getDefaultArticleQuickTools,
  getGuideArticleUiCopy,
  getGuideHubCopy,
  getSiblingCoreGuideLinks,
  type FoundationalGuideKey,
} from "../lib/guide-hub-copy";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://geosub.org").replace(/\/$/, "");

function routePath(locale: CanvasLocale, slug: CoreGuideSlug) {
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
  locale: CanvasLocale;
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
  const baseRobots = getLocaleRobotsPolicy(locale);

  return {
    title,
    description,
    alternates: {
      canonical,
      ...(isSeoIndexableLocale(locale)
        ? {
            languages: {
              "zh-CN": routePath("zh", slug),
              en: routePath("en", slug),
              "x-default": routePath("en", slug),
            },
          }
        : {}),
    },
    robots: {
      index: baseRobots.index && !isUnavailableInCms && !article?.noindex,
      follow: baseRobots.follow && !article?.nofollow,
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
  locale: CanvasLocale;
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
  const copy = getGuideHubCopy(locale);
  const uiCopy = getGuideArticleUiCopy(locale);
  const focusKey: FoundationalGuideKey | "general" =
    slug === "gift-card-guide" ? "general" : slug;
  const cmsRelatedLinks = (article?.relations || []).flatMap((relation) => {
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
  const relatedLinks =
    cmsRelatedLinks.length > 0 || focusKey === "general"
      ? cmsRelatedLinks
      : getSiblingCoreGuideLinks(locale, focusKey);
  const relatedLabel =
    cmsRelatedLinks.length > 0 ? uiCopy.relatedReading : copy.articleContinueTitle;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": article?.structuredDataType === "NONE" ? "WebPage" : "Article",
    headline: title,
    description: resolveSeoDescription(definition, article?.seoDescription),
    ...(article?.publishedAt ? { datePublished: article.publishedAt.toISOString() } : {}),
    ...(article?.updatedAt ? { dateModified: article.updatedAt.toISOString() } : {}),
    author: {
      "@type": "Organization",
      name: article?.authorName || uiCopy.editorialAuthor,
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
        canvas={isUnifiedPublicLocale(locale)}
        locale={locale}
        metadata={
          article ? (
            <>
              <span>{formatArticleDate(article.publishedAt, locale)}</span>
              {article.readingTime ? (
                <span>{copy.minutesLabel(article.readingTime)}</span>
              ) : null}
            </>
          ) : (
            <span>{copy.coreArticleMeta(parsed.sections.length, 3)}</span>
          )
        }
        eyebrow={
          article
            ? getArticleTypeLabel(article.articleType, locale)
            : definition.eyebrow
        }
        title={title}
        description={description}
        sections={parsed.sections}
        note={parsed.note}
        relatedLabel={relatedLabel}
        relatedLinks={relatedLinks}
        quickTools={getDefaultArticleQuickTools(locale, focusKey)}
      />
    </>
  );
}

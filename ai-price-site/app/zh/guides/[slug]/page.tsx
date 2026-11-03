import type { Metadata } from "next";
import Image from "next/image";
import GuideArticleLayout from "../../../../components/GuideArticleLayout";
import {guideContentsFromHtml,publicGuideTypeLabel} from "../../../../lib/guide-display";
import { notFound } from "next/navigation";
import {
  articleTypeLabels,
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
  const [article, englishArticle] = await Promise.all([
    getPublishedArticleBySlug(slug, "ZH"),
    getPublishedArticleBySlug(slug, "EN"),
  ]);

  if (!article) {
    return {
      title: "文章不存在",
    };
  }

  const title = stripGeoSubTitleSuffix(
    article.seoTitle || article.ogTitle || article.title,
  );
  const description = article.seoDescription || article.ogDescription || article.excerpt || undefined;
  const url = article.canonicalUrl || absoluteUrl(`/zh/guides/${article.slug}`);
  const image = article.ogImageUrl || article.coverImageUrl || undefined;

  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: englishArticle
        ? {
            "zh-CN": `/zh/guides/${article.slug}`,
            en: `/en/guides/${englishArticle.slug}`,
            "x-default": `/zh/guides/${article.slug}`,
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

export default async function GuideArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await getPublishedArticleBySlug(slug, "ZH");

  if (!article) {
    notFound();
  }

  const html = sanitizeArticleHtml(
    article.bodyHtml || renderArticleMarkdown(article.bodyMarkdown),
  );
  const url = article.canonicalUrl || absoluteUrl(`/zh/guides/${article.slug}`);
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
            name: article.authorName || "GeoSub 编辑部",
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

  const prepared=guideContentsFromHtml(html);
  const relatedLinks=article.relations.flatMap(relation=>{
    const href=relation.relatedArticle ? `/zh/guides/${relation.relatedArticle.slug}` : relation.product ? `/zh/${relation.product.category==="STREAMING" ? "streaming-pricing" : "ai-pricing"}/${relation.product.slug}` : null;
    return href ? [{href,title:relation.title||relation.relatedArticle?.title||relation.product?.name||"",description:relation.description}] : [];
  });
  return <>
    {structuredData && <script type="application/ld+json" dangerouslySetInnerHTML={{__html:serializeJsonLd(structuredData)}} />}
    <GuideArticleLayout title={article.title} label={publicGuideTypeLabel(article.articleType,articleTypeLabels[article.articleType])} contextLabel={article.category?.name||publicGuideTypeLabel(article.articleType,articleTypeLabels[article.articleType])} summary={article.subtitle||article.excerpt} updated={article.updatedAt.toISOString().slice(0,10)} readingTime={article.readingTime||1} contents={prepared.items} relatedLinks={relatedLinks}>
      {article.coverImageUrl && <Image src={article.coverImageUrl} alt={article.title} width={1200} height={675} unoptimized className="gs-guide-cover" />}
      <div className="article-body" dangerouslySetInnerHTML={{__html:prepared.html}} />
    </GuideArticleLayout>
  </>;
}

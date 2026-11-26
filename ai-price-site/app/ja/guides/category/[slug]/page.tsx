import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArticleCollectionView from "../../../../../components/ArticleCollectionView";
import {
  getPublishedArticleCategoryBySlug,
  getPublishedArticlesByCategorySlug,
} from "../../../../../lib/articles";
import { stripGeoSubTitleSuffix } from "../../../../../lib/pricing-routes";
import { getLocaleRobotsPolicy } from "../../../../../lib/seo-indexing-policy";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = await getPublishedArticleCategoryBySlug(slug, "JA");
  const robots = getLocaleRobotsPolicy("ja");

  if (!category) return { title: "カテゴリーが見つかりません", robots };

  return {
    title: stripGeoSubTitleSuffix(category.seoTitle || `${category.name} ガイド`),
    description:
      category.seoDescription ||
      category.description ||
      `${category.name}に関するGeoSubの料金比較ガイド・検証記事一覧。`,
    alternates: { canonical: `/ja/guides/category/${category.slug}` },
    robots,
  };
}

export default async function JapaneseGuideCategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [category, articles] = await Promise.all([
    getPublishedArticleCategoryBySlug(slug, "JA"),
    getPublishedArticlesByCategorySlug(slug, "JA"),
  ]);

  if (!category) notFound();

  return (
    <ArticleCollectionView
      eyebrow="カテゴリー"
      title={category.name}
      description={category.description || `${category.name}に関するガイドと分析記事です。`}
      articles={articles}
      emptyText="このカテゴリーには公開済みの記事がまだありません。"
      locale="ja"
    />
  );
}

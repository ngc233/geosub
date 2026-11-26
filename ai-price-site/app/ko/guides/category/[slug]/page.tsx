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
  const category = await getPublishedArticleCategoryBySlug(slug, "KO");
  const robots = getLocaleRobotsPolicy("ko");

  if (!category) return { title: "카테고리를 찾을 수 없습니다", robots };

  return {
    title: stripGeoSubTitleSuffix(category.seoTitle || `${category.name} 가이드`),
    description:
      category.seoDescription ||
      category.description ||
      `${category.name} 주제의 GeoSub 구독 가격 비교 및 방법론 가이드 모음입니다.`,
    alternates: { canonical: `/ko/guides/category/${category.slug}` },
    robots,
  };
}

export default async function KoreanGuideCategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [category, articles] = await Promise.all([
    getPublishedArticleCategoryBySlug(slug, "KO"),
    getPublishedArticlesByCategorySlug(slug, "KO"),
  ]);

  if (!category) notFound();

  return (
    <ArticleCollectionView
      eyebrow="카테고리"
      title={category.name}
      description={category.description || `${category.name} 카테고리의 가이드 및 분석 글입니다.`}
      articles={articles}
      emptyText="이 카테고리에는 아직 게시된 글이 없습니다."
      locale="ko"
    />
  );
}

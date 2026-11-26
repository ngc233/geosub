import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArticleCollectionView from "../../../../../components/ArticleCollectionView";
import {
  getPublishedArticlesByTagSlug,
  getPublishedArticleTagBySlug,
} from "../../../../../lib/articles";
import { getLocaleRobotsPolicy } from "../../../../../lib/seo-indexing-policy";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tag = await getPublishedArticleTagBySlug(slug, "KO");
  const robots = getLocaleRobotsPolicy("ko");

  if (!tag) return { title: "태그를 찾을 수 없습니다", robots };

  return {
    title: `${tag.name} 가이드`,
    description:
      tag.description ||
      `${tag.name} 태그가 지정된 지역별 가격 및 결제 가이드 모음입니다.`,
    alternates: { canonical: `/ko/guides/tag/${tag.slug}` },
    robots,
  };
}

export default async function KoreanGuideTagPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [tag, articles] = await Promise.all([
    getPublishedArticleTagBySlug(slug, "KO"),
    getPublishedArticlesByTagSlug(slug, "KO"),
  ]);

  if (!tag) notFound();

  return (
    <ArticleCollectionView
      eyebrow="태그"
      title={tag.name}
      description={tag.description || `#${tag.name} 관련 가이드 모음입니다.`}
      articles={articles}
      emptyText="이 태그에는 아직 게시된 글이 없습니다."
      locale="ko"
    />
  );
}

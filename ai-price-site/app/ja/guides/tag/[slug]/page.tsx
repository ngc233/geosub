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
  const tag = await getPublishedArticleTagBySlug(slug, "JA");
  const robots = getLocaleRobotsPolicy("ja");

  if (!tag) return { title: "タグが見つかりません", robots };

  return {
    title: `${tag.name} ガイド`,
    description:
      tag.description ||
      `${tag.name}に関連する地域別料金・決済ガイド記事一覧。`,
    alternates: { canonical: `/ja/guides/tag/${tag.slug}` },
    robots,
  };
}

export default async function JapaneseGuideTagPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [tag, articles] = await Promise.all([
    getPublishedArticleTagBySlug(slug, "JA"),
    getPublishedArticlesByTagSlug(slug, "JA"),
  ]);

  if (!tag) notFound();

  return (
    <ArticleCollectionView
      eyebrow="タグ"
      title={tag.name}
      description={tag.description || `「${tag.name}」タグが付いたガイド記事です。`}
      articles={articles}
      emptyText="このタグには公開済みの記事がまだありません。"
      locale="ja"
    />
  );
}

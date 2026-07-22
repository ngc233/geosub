import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArticleCollectionView from "../../../../../components/ArticleCollectionView";
import {
  getPublishedArticlesByTagSlug,
  getPublishedArticleTagBySlug,
} from "../../../../../lib/articles";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tag = await getPublishedArticleTagBySlug(slug, "EN");

  if (!tag) return { title: "Guide tag not found" };

  return {
    title: `${tag.name} Guides`,
    description:
      tag.description ||
      `Read GeoSub guides, regional pricing and payment articles tagged ${tag.name}.`,
    alternates: { canonical: `/en/guides/tag/${tag.slug}` },
  };
}

export default async function EnglishGuideTagPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [tag, articles] = await Promise.all([
    getPublishedArticleTagBySlug(slug, "EN"),
    getPublishedArticlesByTagSlug(slug, "EN"),
  ]);

  if (!tag) notFound();

  return (
    <ArticleCollectionView
      eyebrow="Tag"
      title={tag.name}
      description={tag.description || `GeoSub content tagged ${tag.name}.`}
      articles={articles}
      emptyText="No published articles are available under this tag yet."
      locale="en"
    />
  );
}

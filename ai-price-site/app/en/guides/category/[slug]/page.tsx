import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArticleCollectionView from "../../../../../components/ArticleCollectionView";
import {
  getPublishedArticleCategoryBySlug,
  getPublishedArticlesByCategorySlug,
} from "../../../../../lib/articles";
import { stripGeoSubTitleSuffix } from "../../../../../lib/pricing-routes";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = await getPublishedArticleCategoryBySlug(slug, "EN");

  if (!category) return { title: "Guide category not found" };

  return {
    title: stripGeoSubTitleSuffix(category.seoTitle || `${category.name} Guides`),
    description:
      category.seoDescription || category.description ||
      `Read GeoSub guides, pricing analysis and methodology about ${category.name}.`,
    alternates: { canonical: `/en/guides/category/${category.slug}` },
  };
}

export default async function EnglishGuideCategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [category, articles] = await Promise.all([
    getPublishedArticleCategoryBySlug(slug, "EN"),
    getPublishedArticlesByCategorySlug(slug, "EN"),
  ]);

  if (!category) notFound();

  return (
    <ArticleCollectionView
      eyebrow="Category"
      title={category.name}
      description={category.description || "GeoSub guides and analysis in this category."}
      articles={articles}
      emptyText="No published articles are available in this category yet."
      locale="en"
    />
  );
}

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
  const category = await getPublishedArticleCategoryBySlug(slug, "ES");
  const robots = getLocaleRobotsPolicy("es");

  if (!category) return { title: "Categoría de guías no encontrada", robots };

  return {
    title: stripGeoSubTitleSuffix(category.seoTitle || `Guías de ${category.name}`),
    description:
      category.seoDescription ||
      category.description ||
      `Lee guías de GeoSub, análisis de precios y metodología sobre ${category.name}.`,
    alternates: { canonical: `/es/guides/category/${category.slug}` },
    robots,
  };
}

export default async function SpanishGuideCategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [category, articles] = await Promise.all([
    getPublishedArticleCategoryBySlug(slug, "ES"),
    getPublishedArticlesByCategorySlug(slug, "ES"),
  ]);

  if (!category) notFound();

  return (
    <ArticleCollectionView
      eyebrow="Categoría"
      title={category.name}
      description={category.description || `Guías y análisis de GeoSub en la categoría ${category.name}.`}
      articles={articles}
      emptyText="Todavía no hay artículos publicados en esta categoría."
      locale="es"
    />
  );
}

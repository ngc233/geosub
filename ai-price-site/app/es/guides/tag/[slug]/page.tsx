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
  const tag = await getPublishedArticleTagBySlug(slug, "ES");
  const robots = getLocaleRobotsPolicy("es");

  if (!tag) return { title: "Etiqueta de guías no encontrada", robots };

  return {
    title: `Guías sobre ${tag.name}`,
    description:
      tag.description ||
      `Lee guías de GeoSub sobre precios regionales y pagos etiquetadas con ${tag.name}.`,
    alternates: { canonical: `/es/guides/tag/${tag.slug}` },
    robots,
  };
}

export default async function SpanishGuideTagPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [tag, articles] = await Promise.all([
    getPublishedArticleTagBySlug(slug, "ES"),
    getPublishedArticlesByTagSlug(slug, "ES"),
  ]);

  if (!tag) notFound();

  return (
    <ArticleCollectionView
      eyebrow="Etiqueta"
      title={tag.name}
      description={tag.description || `Contenido de GeoSub etiquetado con ${tag.name}.`}
      articles={articles}
      emptyText="Todavía no hay artículos publicados bajo esta etiqueta."
      locale="es"
    />
  );
}

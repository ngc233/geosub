import type { Metadata } from "next";
import Link from "next/link";
import GuideCollection from "../../../components/GuideCollection";
import { guideHubExcludedArticleSlugs } from "../../../components/CoreGuideHub";
import {
  formatArticleDate,
  getArticleTypeLabel,
  getPublishedArticleCategories,
  getPublishedArticleTags,
  getPublishedArticles,
} from "../../../lib/articles";
import { loadCoreGuideHubStates } from "../../../lib/core-guide-cms";
import {
  buildFoundationalGuideSteps,
  getGuideHubCopy,
} from "../../../lib/guide-hub-copy";
import { getLocaleRobotsPolicy } from "../../../lib/seo-indexing-policy";

export const metadata: Metadata = {
  title: "Guías de suscripciones y precios regionales",
  description:
    "Consulta guías prácticas sobre suscripciones digitales, precios regionales, tipos de cambio, impuestos, pagos, cuentas y evaluación de herramientas.",
  robots: getLocaleRobotsPolicy("es"),
};

export default async function SpanishGuidesPage() {
  const [articles, categories, tags, states] = await Promise.all([
    getPublishedArticles("ES"),
    getPublishedArticleCategories("ES"),
    getPublishedArticleTags("ES"),
    loadCoreGuideHubStates("es"),
  ]);
  const copy = getGuideHubCopy("es");
  const editorialArticles = articles.filter(
    (article) => !guideHubExcludedArticleSlugs.has(article.slug),
  );

  const core = buildFoundationalGuideSteps("es", (slug) => {
    const state = states.get(slug);
    return !state?.managed || state.published;
  });

  const cards = editorialArticles.map((article) => ({
    href: `/es/guides/${article.slug}`,
    title: article.title,
    description: article.excerpt,
    category: article.category?.name || getArticleTypeLabel(article.articleType, "es"),
    date: formatArticleDate(article.publishedAt, "es"),
    minutes: article.readingTime,
  }));

  const hasTaxonomy = categories.length > 0 || tags.length > 0;

  return (
    <GuideCollection
      locale="es"
      eyebrow={copy.hubEyebrow}
      title={copy.hubTitle}
      description={copy.hubDescription}
      cards={cards}
      steps={core}
      emptyText="Todavía no hay guías editoriales adicionales publicadas en español."
      showBack={false}
      navigation={
        hasTaxonomy ? (
          <section className="gs-guide-taxonomy p-4.5 md:p-5 flex flex-col gap-3">
            {categories.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="gs-guide-taxonomy-label">{copy.taxonomyCategoriesLabel}</span>
                {categories.map((category) => (
                  <Link
                    key={category.id}
                    href={`/es/guides/category/${category.slug}`}
                    className="gs-guide-taxonomy-pill"
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            )}
            {tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="gs-guide-taxonomy-label">{copy.taxonomyTagsLabel}</span>
                {tags.slice(0, 18).map((tag) => (
                  <Link
                    key={tag.id}
                    href={`/es/guides/tag/${tag.slug}`}
                    className="gs-guide-taxonomy-tag"
                  >
                    #{tag.name}
                  </Link>
                ))}
              </div>
            )}
          </section>
        ) : undefined
      }
    />
  );
}

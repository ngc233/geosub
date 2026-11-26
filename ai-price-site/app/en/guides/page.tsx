import type { Metadata } from "next";
import Link from "next/link";
import GuideCollection from "../../../components/GuideCollection";
import { loadCoreGuideHubStates } from "../../../lib/core-guide-cms";
import { guideHubExcludedArticleSlugs } from "../../../components/CoreGuideHub";
import {
  formatArticleDate,
  getArticleTypeLabel,
  getPublishedArticleCategories,
  getPublishedArticleTags,
  getPublishedArticles,
} from "../../../lib/articles";
import {
  buildFoundationalGuideSteps,
  getGuideHubCopy,
} from "../../../lib/guide-hub-copy";

export const metadata: Metadata = {
  title: "Subscription and Pricing Guides",
  description:
    "Read practical guides about digital subscriptions, regional pricing, payments, accounts and tool comparisons.",
};

export default async function EnglishGuidesPage() {
  const [articles, categories, tags, states] = await Promise.all([
    getPublishedArticles("EN"),
    getPublishedArticleCategories("EN"),
    getPublishedArticleTags("EN"),
    loadCoreGuideHubStates("en"),
  ]);
  const copy = getGuideHubCopy("en");
  const editorialArticles = articles.filter(
    (article) => !guideHubExcludedArticleSlugs.has(article.slug),
  );

  const core = buildFoundationalGuideSteps("en", (slug) => {
    const state = states.get(slug);
    return !state?.managed || state.published;
  });

  const cards = editorialArticles.map((article) => ({
    href: `/en/guides/${article.slug}`,
    title: article.title,
    description: article.excerpt,
    category: article.category?.name || getArticleTypeLabel(article.articleType, "en"),
    date: formatArticleDate(article.publishedAt, "en"),
    minutes: article.readingTime,
  }));

  const hasTaxonomy = categories.length > 0 || tags.length > 0;

  return (
    <GuideCollection
      locale="en"
      eyebrow={copy.hubEyebrow}
      title={copy.hubTitle}
      description={copy.hubDescription}
      cards={cards}
      steps={core}
      emptyText="No additional English guides have been published yet."
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
                    href={`/en/guides/category/${category.slug}`}
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
                    href={`/en/guides/tag/${tag.slug}`}
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

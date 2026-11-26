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
  title: "サブスクリプション料金・契約ガイド",
  description:
    "地域別サブスクリプション価格の見方、為替基準、税制、決済方法、アカウント条件、ツール比較の実践ガイド。",
  robots: getLocaleRobotsPolicy("ja"),
};

export default async function JapaneseGuidesPage() {
  const [articles, categories, tags, states] = await Promise.all([
    getPublishedArticles("JA"),
    getPublishedArticleCategories("JA"),
    getPublishedArticleTags("JA"),
    loadCoreGuideHubStates("ja"),
  ]);
  const copy = getGuideHubCopy("ja");
  const editorialArticles = articles.filter(
    (article) => !guideHubExcludedArticleSlugs.has(article.slug),
  );

  const core = buildFoundationalGuideSteps("ja", (slug) => {
    const state = states.get(slug);
    return !state?.managed || state.published;
  });

  const cards = editorialArticles.map((article) => ({
    href: `/ja/guides/${article.slug}`,
    title: article.title,
    description: article.excerpt,
    category: article.category?.name || getArticleTypeLabel(article.articleType, "ja"),
    date: formatArticleDate(article.publishedAt, "ja"),
    minutes: article.readingTime,
  }));

  const hasTaxonomy = categories.length > 0 || tags.length > 0;

  return (
    <GuideCollection
      locale="ja"
      eyebrow={copy.hubEyebrow}
      title={copy.hubTitle}
      description={copy.hubDescription}
      cards={cards}
      steps={core}
      emptyText="現在公開されている追加の日本語ガイドはありません。"
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
                    href={`/ja/guides/category/${category.slug}`}
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
                    href={`/ja/guides/tag/${tag.slug}`}
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

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
  title: "数字订阅价格、支付与账号指南",
  description:
    "阅读数字订阅价格、跨区支付与账号地区指南，了解汇率、税费和购买限制，并查看 GeoSub 的数据核验方法与 AI 工具测评。",
};

export default async function GuidesPage() {
  const [articles, categories, tags, states] = await Promise.all([
    getPublishedArticles("ZH"),
    getPublishedArticleCategories("ZH"),
    getPublishedArticleTags("ZH"),
    loadCoreGuideHubStates("zh"),
  ]);
  const copy = getGuideHubCopy("zh");
  const editorialArticles = articles.filter(
    (article) => !guideHubExcludedArticleSlugs.has(article.slug),
  );

  const core = buildFoundationalGuideSteps("zh", (slug) => {
    const state = states.get(slug);
    return !state?.managed || state.published;
  });

  const zhCategoryName = (name?: string | null) =>
    !name ? undefined : /^guides?$/i.test(name.trim()) ? "订阅指南" : name;

  const cards = editorialArticles.map((article) => ({
    href: `/zh/guides/${article.slug}`,
    title: article.title,
    description: article.excerpt,
    category:
      zhCategoryName(article.category?.name) || getArticleTypeLabel(article.articleType, "zh"),
    date: formatArticleDate(article.publishedAt, "zh"),
    minutes: article.readingTime,
  }));

  const hasTaxonomy = categories.length > 0 || tags.length > 0;

  return (
    <GuideCollection
      locale="zh"
      eyebrow={copy.hubEyebrow}
      title={copy.hubTitle}
      description={copy.hubDescription}
      cards={cards}
      steps={core}
      emptyText="暂无其他已发布内容。"
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
                    href={`/zh/guides/category/${category.slug}`}
                    className="gs-guide-taxonomy-pill"
                  >
                    {zhCategoryName(category.name) ?? category.name}
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
                    href={`/zh/guides/tag/${tag.slug}`}
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

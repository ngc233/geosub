import type { Metadata } from "next";
import GuideCollection from "../../../components/GuideCollection";
import Link from "next/link";
import { getCoreGuideDefinition } from "../../../lib/core-guide-content";
import { loadCoreGuideHubStates } from "../../../lib/core-guide-cms";
import { formatArticleDate, getArticleTypeLabel } from "../../../lib/articles";
import {
  guideHubExcludedArticleSlugs,
} from "../../../components/CoreGuideHub";
import {
  getPublishedArticleCategories,
  getPublishedArticleTags,
  getPublishedArticles,
} from "../../../lib/articles";

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
  const editorialArticles = articles.filter(
    (article) => !guideHubExcludedArticleSlugs.has(article.slug),
  );

  const core = (["price-guide", "payment-account", "methodology"] as const).filter(slug => { const state = states.get(slug); return !state?.managed || state.published; }).map(slug => {
    const definition = getCoreGuideDefinition("zh", slug);
    return { href: `/zh/guides/${slug}`, title: definition.eyebrow, description: definition.description, category: definition.eyebrow };
  });
  const cards = [...core, { href: "/zh/guides/tool-review", title: "工具测评", description: "从真实用途、能力边界、持续成本与证据日期判断工具是否值得订阅。", category: "工具测评" }, ...editorialArticles.map(article => ({ href: `/zh/guides/${article.slug}`, title: article.title, description: article.excerpt, category: article.category?.name || getArticleTypeLabel(article.articleType, "zh"), date: formatArticleDate(article.publishedAt, "zh"), minutes: article.readingTime }))];
  return <GuideCollection eyebrow="Guides" title="GeoSub 指南" description="用数据解释全球数字订阅价格差异，整理 AI 工具、支付方式、地区订阅和价格方法论。" cards={cards} steps={core} emptyText="暂无其他已发布内容。" showBack={false} navigation={<div className="gs-guide-taxonomy gap-y-2 gap-x-4 flex flex-wrap">{categories.map(category => <Link key={category.id} href={`/zh/guides/category/${category.slug}`}>{category.name}</Link>)}{tags.slice(0, 18).map(tag => <Link key={tag.id} href={`/zh/guides/tag/${tag.slug}`}>#{tag.name}</Link>)}</div>}/>;
}

import type { Metadata } from "next";
import ArticleCollectionView from "../../../components/ArticleCollectionView";
import CoreGuideHub, {
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
    "阅读数字订阅价格、跨区支付、账号地区与礼品卡指南，了解汇率、税费和购买限制，并查看 GeoSub 的数据核验方法与 AI 工具测评。",
};

export default async function GuidesPage() {
  const [articles, categories, tags] = await Promise.all([
    getPublishedArticles("ZH"),
    getPublishedArticleCategories("ZH"),
    getPublishedArticleTags("ZH"),
  ]);
  const editorialArticles = articles.filter(
    (article) => !guideHubExcludedArticleSlugs.has(article.slug),
  );

  return (
    <ArticleCollectionView
      eyebrow="Guides"
      title="GeoSub 指南"
      description="用数据解释全球数字订阅价格差异，整理 AI 工具、支付方式、地区订阅和价格方法论。"
      articles={editorialArticles}
      categories={categories}
      tags={tags}
      emptyText="暂无其他已发布内容。"
      locale="zh"
      showBack={false}
      beforeArticles={<CoreGuideHub locale="zh" />}
    />
  );
}

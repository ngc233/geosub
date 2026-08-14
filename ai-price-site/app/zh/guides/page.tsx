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
    "GeoSub 指南汇总数字订阅价格、地区订阅、礼品卡、支付方式、账号注册和 AI 工具测评内容。",
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

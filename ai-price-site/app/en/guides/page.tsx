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
  title: "Subscription and Pricing Guides",
  description:
    "Read practical guides about digital subscriptions, regional pricing, gift cards, payments, accounts and tool comparisons.",
};

export default async function EnglishGuidesPage() {
  const [articles, categories, tags] = await Promise.all([
    getPublishedArticles("EN"),
    getPublishedArticleCategories("EN"),
    getPublishedArticleTags("EN"),
  ]);
  const editorialArticles = articles.filter(
    (article) => !guideHubExcludedArticleSlugs.has(article.slug),
  );

  return (
    <ArticleCollectionView
      eyebrow="Guides"
      title="Subscription and Pricing Guides"
      description="Practical explanations of regional subscription pricing, payment restrictions, account setup and digital service availability."
      articles={editorialArticles}
      categories={categories}
      tags={tags}
      emptyText="No English guides have been published yet."
      locale="en"
      showBack={false}
      beforeArticles={<CoreGuideHub locale="en" />}
    />
  );
}

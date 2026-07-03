import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArticleCollectionView from "../../../../../components/ArticleCollectionView";
import {
  getPublishedArticleCategoryBySlug,
  getPublishedArticlesByCategorySlug,
} from "../../../../../lib/articles";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://geosub.org";

function absoluteUrl(path: string) {
  return new URL(path, siteUrl).toString();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getPublishedArticleCategoryBySlug(slug, "ZH");

  if (!category) {
    return {
      title: "文章分类不存在 - GeoSub",
    };
  }

  return {
    title: category.seoTitle || `${category.name} - GeoSub 指南`,
    description:
      category.seoDescription ||
      category.description ||
      `阅读 GeoSub 关于${category.name}的指南、价格分析和方法论内容。`,
    alternates: {
      canonical: absoluteUrl(`/zh/guides/category/${category.slug}`),
    },
  };
}

export default async function GuideCategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [category, articles] = await Promise.all([
    getPublishedArticleCategoryBySlug(slug, "ZH"),
    getPublishedArticlesByCategorySlug(slug, "ZH"),
  ]);

  if (!category) {
    notFound();
  }

  return (
    <ArticleCollectionView
      eyebrow="Category"
      title={category.name}
      description={category.description || "这个分类下汇总了 GeoSub 的相关指南和分析内容。"}
      articles={articles}
      emptyText="这个分类下暂时还没有已发布文章。"
    />
  );
}

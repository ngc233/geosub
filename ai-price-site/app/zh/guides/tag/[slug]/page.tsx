import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArticleCollectionView from "../../../../../components/ArticleCollectionView";
import {
  getPublishedArticleTagBySlug,
  getPublishedArticlesByTagSlug,
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
  const tag = await getPublishedArticleTagBySlug(slug, "ZH");

  if (!tag) {
    return {
      title: "文章标签不存在 - GeoSub",
    };
  }

  return {
    title: `${tag.name} - GeoSub 指南标签`,
    description:
      tag.description ||
      `阅读 GeoSub 关于${tag.name}的指南、价格分析、地区订阅和支付方法内容。`,
    alternates: {
      canonical: absoluteUrl(`/zh/guides/tag/${tag.slug}`),
    },
  };
}

export default async function GuideTagPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [tag, articles] = await Promise.all([
    getPublishedArticleTagBySlug(slug, "ZH"),
    getPublishedArticlesByTagSlug(slug, "ZH"),
  ]);

  if (!tag) {
    notFound();
  }

  return (
    <ArticleCollectionView
      eyebrow="Tag"
      title={tag.name}
      description={tag.description || `这个标签下汇总了与 ${tag.name} 相关的内容。`}
      articles={articles}
      emptyText="这个标签下暂时还没有已发布文章。"
    />
  );
}

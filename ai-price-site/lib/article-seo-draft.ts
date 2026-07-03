import "server-only";

import { ArticleType, StructuredDataType } from "@prisma/client";
import { prisma } from "./prisma";

export type ArticleSeoDraft = {
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  ogTitle: string;
  ogDescription: string;
  canonicalUrl: string;
  structuredDataType: StructuredDataType;
  score: number;
  issues: string[];
  strengths: string[];
  relatedProductCount: number;
  relatedArticleCount: number;
};

function stripMarkdown(value: string | null | undefined) {
  return String(value || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[#>*_~\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateText(value: string, maxLength: number) {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).replace(/[，。；、\s]+$/g, "")}…`;
}

function uniqueText(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const text = String(value || "").trim();
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    result.push(text);
  }

  return result;
}

function structuredDataTypeForArticle(articleType: ArticleType): StructuredDataType {
  if (articleType === "HOW_TO") return "HOW_TO";
  if (articleType === "NEWS") return "NEWS_ARTICLE";
  return "ARTICLE";
}

function scoreDraft(draft: Omit<ArticleSeoDraft, "score" | "issues" | "strengths">) {
  let score = 100;
  const issues: string[] = [];
  const strengths: string[] = [];
  const titleLength = draft.seoTitle.length;
  const descriptionLength = draft.seoDescription.length;
  const keywordCount = draft.seoKeywords.split(",").filter((item) => item.trim()).length;

  if (titleLength < 18) {
    score -= 18;
    issues.push("SEO 标题偏短，搜索结果里可能表达不完整。");
  } else if (titleLength > 62) {
    score -= 14;
    issues.push("SEO 标题偏长，搜索结果里可能被截断。");
  } else {
    strengths.push("SEO 标题长度合适。");
  }

  if (descriptionLength < 70) {
    score -= 18;
    issues.push("SEO 描述偏短，建议补足文章价值点和适用场景。");
  } else if (descriptionLength > 160) {
    score -= 10;
    issues.push("SEO 描述偏长，搜索结果里可能被截断。");
  } else {
    strengths.push("SEO 描述长度合适。");
  }

  if (keywordCount < 4) {
    score -= 10;
    issues.push("关键词数量偏少，建议补充产品、国家、订阅或价格相关词。");
  } else {
    strengths.push("关键词覆盖了标签、产品或栏目主题。");
  }

  if (!draft.canonicalUrl) {
    score -= 12;
    issues.push("缺少 canonical 地址。");
  } else {
    strengths.push("已生成 canonical 地址。");
  }

  if (draft.relatedProductCount === 0) {
    score -= 6;
    issues.push("暂未关联产品页，文章到价格页的内链价值较弱。");
  } else {
    strengths.push(`已关联 ${draft.relatedProductCount} 个产品页。`);
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    issues,
    strengths,
  };
}

export async function getArticleSeoDraft(articleId: string) {
  const article = await prisma.article.findUnique({
    where: {
      id: articleId,
    },
    include: {
      category: true,
      tagLinks: {
        include: {
          tag: true,
        },
      },
      relations: {
        where: {
          status: "PUBLISHED",
        },
        include: {
          product: true,
          relatedArticle: true,
        },
        orderBy: {
          sortOrder: "asc",
        },
      },
    },
  });

  if (!article) {
    return null;
  }

  const relatedProducts = article.relations
    .map((relation) => relation.product)
    .filter(Boolean);
  const relatedArticles = article.relations
    .map((relation) => relation.relatedArticle)
    .filter(Boolean);
  const tagNames = article.tagLinks.map((link) => link.tag.name);
  const productNames = relatedProducts.map((product) => product?.name);
  const categoryName = article.category?.name;
  const bodyText = stripMarkdown(article.bodyMarkdown);
  const fallbackDescription =
    article.excerpt ||
    article.subtitle ||
    bodyText ||
    `阅读 GeoSub 关于 ${article.title} 的指南、价格分析和订阅方法。`;

  const titleTail = categoryName ? `｜${categoryName}` : "｜GeoSub 指南";
  const seoTitle = truncateText(`${article.title}${titleTail}`, 58);
  const seoDescription = truncateText(
    `${fallbackDescription} ${
      productNames.length > 0
        ? `关联 ${productNames.slice(0, 3).join("、")} 等价格页。`
        : "覆盖订阅价格、地区差异和购买决策信息。"
    }`,
    155,
  );
  const keywords = uniqueText([
    ...tagNames,
    ...productNames,
    categoryName,
    article.title,
    "GeoSub",
    "订阅价格",
    "地区订阅",
  ]).slice(0, 12);

  const draft = {
    seoTitle,
    seoDescription,
    seoKeywords: keywords.join(", "),
    ogTitle: seoTitle,
    ogDescription: seoDescription,
    canonicalUrl: `/zh/guides/${article.slug}`,
    structuredDataType: structuredDataTypeForArticle(article.articleType),
    relatedProductCount: relatedProducts.length,
    relatedArticleCount: relatedArticles.length,
  };
  const score = scoreDraft(draft);

  return {
    ...draft,
    ...score,
  } satisfies ArticleSeoDraft;
}

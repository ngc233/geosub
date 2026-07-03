import "server-only";

import type { Article, ArticleCategory, ArticleStatus, ArticleTag, ArticleType, Locale } from "@prisma/client";
import { prisma } from "./prisma";

export type ArticleListItem = Article & {
  category: ArticleCategory | null;
};

export type ArticleTagListItem = ArticleTag & {
  _count?: {
    articleLinks: number;
  };
};

export type ArticleDetail = ArticleListItem & {
  tagLinks: Array<{
    tag: {
      id: string;
      slug: string;
      name: string;
    };
  }>;
  relations: Array<{
    id: string;
    relationType: string;
    title: string | null;
    description: string | null;
    product: {
      slug: string;
      name: string;
    } | null;
    relatedArticle: {
      slug: string;
      title: string;
    } | null;
  }>;
};

export const articleTypeLabels: Record<ArticleType, string> = {
  GUIDE: "指南",
  HOW_TO: "教程",
  COMPARISON: "对比",
  RANKING: "榜单",
  NEWS: "更新",
  METHODOLOGY: "方法论",
  FAQ_HUB: "问答合集",
  REVIEW: "测评",
  ANNOUNCEMENT: "公告",
  OTHER: "其他",
};

export const articleStatusLabels: Record<ArticleStatus, string> = {
  DRAFT: "草稿",
  REVIEW: "待审核",
  PUBLISHED: "已发布",
  SCHEDULED: "定时发布",
  ARCHIVED: "已归档",
};

export function normalizeArticleSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

export function estimateReadingTime(markdown: string | null | undefined) {
  const text = String(markdown || "").replace(/[#>*_[\]()`-]/g, " ");
  const latinWords = text.match(/[A-Za-z0-9]+/g)?.length || 0;
  const cjkChars = text.match(/[\u3400-\u9fff]/g)?.length || 0;
  const units = latinWords + Math.ceil(cjkChars / 2);

  return Math.max(1, Math.ceil(units / 220));
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderInlineMarkdown(value: string) {
  return escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" rel="nofollow noopener" target="_blank">$1</a>')
    .replace(/\[([^\]]+)\]\((\/[^)\s]+)\)/g, '<a href="$2">$1</a>');
}

export function renderArticleMarkdown(markdown: string | null | undefined) {
  const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
  const html: string[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];

  function flushParagraph() {
    if (paragraph.length === 0) return;
    html.push(`<p>${renderInlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  }

  function flushList() {
    if (listItems.length === 0) return;
    html.push(`<ul>${listItems.map((item) => `<li>${renderInlineMarkdown(item)}</li>`).join("")}</ul>`);
    listItems = [];
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = line.match(/^(#{2,4})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      html.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    const list = line.match(/^[-*]\s+(.+)$/);
    if (list) {
      flushParagraph();
      listItems.push(list[1]);
      continue;
    }

    flushList();
    paragraph.push(line);
  }

  flushParagraph();
  flushList();

  return html.join("\n");
}

export async function getPublishedArticles(locale: Locale = "ZH") {
  const now = new Date();

  return prisma.article.findMany({
    where: {
      locale,
      noindex: false,
      deletedAt: null,
      OR: [
        {
          status: "PUBLISHED",
        },
        {
          status: "SCHEDULED",
          scheduledAt: {
            lte: now,
          },
        },
      ],
    },
    include: {
      category: true,
    },
    orderBy: [
      {
        isFeatured: "desc",
      },
      {
        publishedAt: "desc",
      },
      {
        updatedAt: "desc",
      },
    ],
  });
}

function publishedArticleWhere(locale: Locale = "ZH") {
  const now = new Date();

  return {
    locale,
    noindex: false,
    deletedAt: null,
    OR: [
      {
        status: "PUBLISHED" as const,
      },
      {
        status: "SCHEDULED" as const,
        scheduledAt: {
          lte: now,
        },
      },
    ],
  };
}

export async function getPublishedArticleBySlug(slug: string, locale: Locale = "ZH") {
  return prisma.article.findFirst({
    where: {
      slug,
      ...publishedArticleWhere(locale),
    },
    include: {
      category: true,
      tagLinks: {
        include: {
          tag: {
            select: {
              id: true,
              slug: true,
              name: true,
            },
          },
        },
      },
      relations: {
        where: {
          status: "PUBLISHED",
        },
        include: {
          product: {
            select: {
              slug: true,
              name: true,
            },
          },
          relatedArticle: {
            select: {
              slug: true,
              title: true,
            },
          },
        },
        orderBy: {
          sortOrder: "asc",
        },
      },
    },
  });
}

export async function getPublishedArticleCategoryBySlug(slug: string, locale: Locale = "ZH") {
  return prisma.articleCategory.findFirst({
    where: {
      slug,
      locale,
      status: "PUBLISHED",
    },
  });
}

export async function getPublishedArticlesByCategorySlug(slug: string, locale: Locale = "ZH") {
  return prisma.article.findMany({
    where: {
      ...publishedArticleWhere(locale),
      category: {
        slug,
        locale,
        status: "PUBLISHED",
      },
    },
    include: {
      category: true,
    },
    orderBy: [
      {
        isFeatured: "desc",
      },
      {
        publishedAt: "desc",
      },
      {
        updatedAt: "desc",
      },
    ],
  });
}

export async function getPublishedArticleTagBySlug(slug: string, locale: Locale = "ZH") {
  return prisma.articleTag.findFirst({
    where: {
      slug,
      locale,
      status: "PUBLISHED",
    },
    include: {
      _count: {
        select: {
          articleLinks: true,
        },
      },
    },
  });
}

export async function getPublishedArticlesByTagSlug(slug: string, locale: Locale = "ZH") {
  return prisma.article.findMany({
    where: {
      ...publishedArticleWhere(locale),
      tagLinks: {
        some: {
          tag: {
            slug,
            locale,
            status: "PUBLISHED",
          },
        },
      },
    },
    include: {
      category: true,
    },
    orderBy: [
      {
        isFeatured: "desc",
      },
      {
        publishedAt: "desc",
      },
      {
        updatedAt: "desc",
      },
    ],
  });
}

export async function getPublishedArticleCategories(locale: Locale = "ZH") {
  return prisma.articleCategory.findMany({
    where: {
      locale,
      status: "PUBLISHED",
      articles: {
        some: publishedArticleWhere(locale),
      },
    },
    include: {
      _count: {
        select: {
          articles: true,
        },
      },
    },
    orderBy: [
      {
        sortOrder: "asc",
      },
      {
        name: "asc",
      },
    ],
  });
}

export async function getPublishedArticleTags(locale: Locale = "ZH") {
  return prisma.articleTag.findMany({
    where: {
      locale,
      status: "PUBLISHED",
      articleLinks: {
        some: {
          article: publishedArticleWhere(locale),
        },
      },
    },
    include: {
      _count: {
        select: {
          articleLinks: true,
        },
      },
    },
    orderBy: [
      {
        name: "asc",
      },
    ],
  });
}

export async function getArticleCategories(locale: Locale = "ZH") {
  return prisma.articleCategory.findMany({
    where: {
      locale,
      status: {
        in: ["DRAFT", "PUBLISHED"],
      },
    },
    orderBy: [
      {
        sortOrder: "asc",
      },
      {
        name: "asc",
      },
    ],
  });
}

export async function getArticleTags(locale: Locale = "ZH") {
  return prisma.articleTag.findMany({
    where: {
      locale,
      status: {
        in: ["DRAFT", "PUBLISHED"],
      },
    },
    orderBy: [
      {
        name: "asc",
      },
    ],
  });
}

export async function getAdminArticles({
  trashed = false,
}: { trashed?: boolean } = {}) {
  return prisma.article.findMany({
    where: {
      deletedAt: trashed
        ? {
            not: null,
          }
        : null,
    },
    include: {
      category: true,
    },
    orderBy: [
      {
        updatedAt: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
  });
}

export function formatArticleDate(value: Date | null | undefined) {
  if (!value) return "未发布";

  return value.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

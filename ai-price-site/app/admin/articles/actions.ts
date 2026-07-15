"use server";

import { ArticleStatus, ArticleType, Locale, StructuredDataType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "../../../lib/admin-auth";
import { getArticleSeoDraft } from "../../../lib/article-seo-draft";
import { estimateReadingTime, normalizeArticleSlug } from "../../../lib/articles";
import { prisma } from "../../../lib/prisma";

function cleanText(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

function cleanOptionalText(value: FormDataEntryValue | null) {
  const text = cleanText(value);
  return text.length > 0 ? text : null;
}

function parseLocale(value: FormDataEntryValue | null): Locale {
  return cleanText(value) === "EN" ? "EN" : "ZH";
}

function parseArticleType(value: FormDataEntryValue | null): ArticleType {
  const text = cleanText(value);
  const allowed: ArticleType[] = [
    "GUIDE",
    "HOW_TO",
    "COMPARISON",
    "RANKING",
    "NEWS",
    "METHODOLOGY",
    "FAQ_HUB",
    "REVIEW",
    "ANNOUNCEMENT",
    "OTHER",
  ];

  return allowed.includes(text as ArticleType) ? (text as ArticleType) : "GUIDE";
}

function parseStatus(value: FormDataEntryValue | null): ArticleStatus {
  const text = cleanText(value);
  const allowed: ArticleStatus[] = ["DRAFT", "REVIEW", "PUBLISHED", "SCHEDULED", "ARCHIVED"];

  return allowed.includes(text as ArticleStatus) ? (text as ArticleStatus) : "DRAFT";
}

function parseStructuredDataType(value: FormDataEntryValue | null): StructuredDataType {
  const text = cleanText(value);
  const allowed: StructuredDataType[] = [
    "ARTICLE",
    "BLOG_POSTING",
    "HOW_TO",
    "FAQ_PAGE",
    "NEWS_ARTICLE",
    "TECH_ARTICLE",
    "NONE",
  ];

  return allowed.includes(text as StructuredDataType) ? (text as StructuredDataType) : "ARTICLE";
}

function parseDate(value: FormDataEntryValue | null) {
  const text = cleanText(value);
  if (!text) return null;

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function revalidateArticlePaths(slug?: string | null) {
  revalidatePath("/zh/guides");
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin/articles");
  revalidatePath("/admin/articles/trash");

  if (slug) {
    revalidatePath(`/zh/guides/${slug}`);
  }
}

async function getArticleForAdminAction(id: string) {
  if (!id) return null;

  return prisma.article.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      deletedAt: true,
    },
  });
}

function parseTagIds(formData: FormData) {
  return formData
    .getAll("tagIds")
    .map((value) => cleanText(value))
    .filter(Boolean);
}

function parseIds(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map((value) => cleanText(value))
    .filter(Boolean);
}

async function syncArticleTags(articleId: string, tagIds: string[]) {
  await prisma.articleTagLink.deleteMany({
    where: {
      articleId,
    },
  });

  if (tagIds.length === 0) {
    return;
  }

  await prisma.articleTagLink.createMany({
    data: tagIds.map((tagId) => ({
      articleId,
      tagId,
    })),
    skipDuplicates: true,
  });
}

async function syncArticleRelations({
  articleId,
  productIds,
  relatedArticleIds,
}: {
  articleId: string;
  productIds: string[];
  relatedArticleIds: string[];
}) {
  await prisma.articleRelation.deleteMany({
    where: {
      articleId,
      relationType: {
        in: ["RELATED_PRODUCT", "RELATED_ARTICLE"],
      },
    },
  });

  const rows = [
    ...productIds.map((productId, index) => ({
      articleId,
      relationType: "RELATED_PRODUCT" as const,
      productId,
      sortOrder: index,
      status: "PUBLISHED" as const,
    })),
    ...relatedArticleIds.map((relatedArticleId, index) => ({
      articleId,
      relationType: "RELATED_ARTICLE" as const,
      relatedArticleId,
      sortOrder: productIds.length + index,
      status: "PUBLISHED" as const,
    })),
  ];

  if (rows.length === 0) {
    return;
  }

  await prisma.articleRelation.createMany({
    data: rows,
  });
}

function getArticleData(formData: FormData) {
  const title = cleanText(formData.get("title"));
  const slug = normalizeArticleSlug(cleanText(formData.get("slug")));
  const locale = parseLocale(formData.get("locale"));
  const status = parseStatus(formData.get("status"));
  const bodyMarkdown = cleanOptionalText(formData.get("bodyMarkdown"));
  const scheduledAt = parseDate(formData.get("scheduledAt"));
  const publishedAt = parseDate(formData.get("publishedAt"));

  return {
    title,
    slug,
    locale,
    subtitle: cleanOptionalText(formData.get("subtitle")),
    excerpt: cleanOptionalText(formData.get("excerpt")),
    articleType: parseArticleType(formData.get("articleType")),
    categoryId: cleanOptionalText(formData.get("categoryId")),
    coverImageUrl: cleanOptionalText(formData.get("coverImageUrl")),
    authorName: cleanOptionalText(formData.get("authorName")) || "GeoSub 编辑部",
    bodyMarkdown,
    status,
    isFeatured: formData.get("isFeatured") === "on",
    readingTime: estimateReadingTime(bodyMarkdown),
    publishedAt:
      status === "PUBLISHED" ? publishedAt || new Date() : publishedAt,
    scheduledAt: status === "SCHEDULED" ? scheduledAt : null,
    canonicalUrl: cleanOptionalText(formData.get("canonicalUrl")),
    seoTitle: cleanOptionalText(formData.get("seoTitle")),
    seoDescription: cleanOptionalText(formData.get("seoDescription")),
    seoKeywords: cleanOptionalText(formData.get("seoKeywords")),
    ogTitle: cleanOptionalText(formData.get("ogTitle")),
    ogDescription: cleanOptionalText(formData.get("ogDescription")),
    ogImageUrl: cleanOptionalText(formData.get("ogImageUrl")),
    structuredDataType: parseStructuredDataType(formData.get("structuredDataType")),
    tocEnabled: formData.get("tocEnabled") === "on",
    noindex: formData.get("noindex") === "on",
    nofollow: formData.get("nofollow") === "on",
  };
}

export async function createArticleAction(formData: FormData) {
  const admin = await requireAdmin();
  const data = getArticleData(formData);
  const tagIds = parseTagIds(formData);
  const productIds = parseIds(formData, "relatedProductIds");
  const relatedArticleIds = parseIds(formData, "relatedArticleIds");

  if (!data.title || !data.slug) {
    redirect("/admin/articles/new?error=missing");
  }

  const exists = await prisma.article.findUnique({
    where: {
      slug_locale: {
        slug: data.slug,
        locale: data.locale,
      },
    },
  });

  if (exists) {
    redirect("/admin/articles/new?error=slug");
  }

  const article = await prisma.article.create({
    data,
  });

  await syncArticleTags(article.id, tagIds);
  await syncArticleRelations({
    articleId: article.id,
    productIds,
    relatedArticleIds: relatedArticleIds.filter((id) => id !== article.id),
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "create",
      targetType: "article",
      targetId: article.id,
      newValue: {
        title: article.title,
        slug: article.slug,
        status: article.status,
      },
      note: "Created article from GeoSub Admin.",
    },
  });

  revalidateArticlePaths(article.slug);
  redirect(`/admin/articles/${article.id}/edit?created=1`);
}

export async function updateArticleAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = cleanText(formData.get("id"));
  const data = getArticleData(formData);
  const tagIds = parseTagIds(formData);
  const productIds = parseIds(formData, "relatedProductIds");
  const relatedArticleIds = parseIds(formData, "relatedArticleIds").filter(
    (relatedId) => relatedId !== id,
  );

  if (!id || !data.title || !data.slug) {
    redirect("/admin/articles?error=missing");
  }

  const current = await prisma.article.findUnique({
    where: {
      id,
    },
  });

  if (!current) {
    redirect("/admin/articles?error=not-found");
  }

  const slugOwner = await prisma.article.findUnique({
    where: {
      slug_locale: {
        slug: data.slug,
        locale: data.locale,
      },
    },
  });

  if (slugOwner && slugOwner.id !== id) {
    redirect(`/admin/articles/${id}/edit?error=slug`);
  }

  const updated = await prisma.article.update({
    where: {
      id,
    },
    data,
  });

  await syncArticleTags(updated.id, tagIds);
  await syncArticleRelations({
    articleId: updated.id,
    productIds,
    relatedArticleIds,
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "update",
      targetType: "article",
      targetId: updated.id,
      oldValue: {
        title: current.title,
        slug: current.slug,
        status: current.status,
      },
      newValue: {
        title: updated.title,
        slug: updated.slug,
        status: updated.status,
      },
      note: "Updated article from GeoSub Admin.",
    },
  });

  revalidateArticlePaths(current.slug);
  revalidateArticlePaths(updated.slug);
  redirect(`/admin/articles/${updated.id}/edit?saved=1`);
}

export async function archiveArticleAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = cleanText(formData.get("id"));
  const article = await getArticleForAdminAction(id);

  if (!article || article.deletedAt) {
    redirect("/admin/articles?error=not-found");
  }

  const updated = await prisma.article.update({
    where: {
      id: article.id,
    },
    data: {
      status: "ARCHIVED",
      noindex: true,
      scheduledAt: null,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "archive",
      targetType: "article",
      targetId: article.id,
      oldValue: {
        title: article.title,
        slug: article.slug,
        status: article.status,
      },
      newValue: {
        title: updated.title,
        slug: updated.slug,
        status: updated.status,
      },
      note: "Archived article from GeoSub Admin.",
    },
  });

  revalidateArticlePaths(article.slug);
  redirect("/admin/articles?archived=1");
}

export async function moveArticleToTrashAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = cleanText(formData.get("id"));
  const article = await getArticleForAdminAction(id);

  if (!article || article.deletedAt) {
    redirect("/admin/articles?error=not-found");
  }

  const updated = await prisma.article.update({
    where: {
      id: article.id,
    },
    data: {
      status: "ARCHIVED",
      noindex: true,
      scheduledAt: null,
      deletedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "trash",
      targetType: "article",
      targetId: article.id,
      oldValue: {
        title: article.title,
        slug: article.slug,
        status: article.status,
      },
      newValue: {
        title: updated.title,
        slug: updated.slug,
        status: updated.status,
        deletedAt: updated.deletedAt,
      },
      note: "Moved article to trash from GeoSub Admin.",
    },
  });

  revalidateArticlePaths(article.slug);
  redirect("/admin/articles?trashed=1");
}

export async function restoreArticleFromTrashAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = cleanText(formData.get("id"));
  const article = await getArticleForAdminAction(id);

  if (!article || !article.deletedAt) {
    redirect("/admin/articles/trash?error=not-found");
  }

  const updated = await prisma.article.update({
    where: {
      id: article.id,
    },
    data: {
      deletedAt: null,
      status: "DRAFT",
      noindex: false,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "restore",
      targetType: "article",
      targetId: article.id,
      oldValue: {
        title: article.title,
        slug: article.slug,
        status: article.status,
        deletedAt: article.deletedAt,
      },
      newValue: {
        title: updated.title,
        slug: updated.slug,
        status: updated.status,
        deletedAt: updated.deletedAt,
      },
      note: "Restored article from trash as draft.",
    },
  });

  revalidateArticlePaths(article.slug);
  redirect("/admin/articles/trash?restored=1");
}

export async function permanentlyDeleteArticleAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = cleanText(formData.get("id"));
  const article = await getArticleForAdminAction(id);

  if (!article || !article.deletedAt) {
    redirect("/admin/articles/trash?error=not-found");
  }

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "delete",
      targetType: "article",
      targetId: article.id,
      oldValue: {
        title: article.title,
        slug: article.slug,
        status: article.status,
        deletedAt: article.deletedAt,
      },
      note: "Permanently deleted article from trash.",
    },
  });

  await prisma.article.delete({
    where: {
      id: article.id,
    },
  });

  revalidateArticlePaths(article.slug);
  redirect("/admin/articles/trash?deleted=1");
}

export async function generateArticleSeoDraftAction(formData: FormData) {
  const admin = await requireAdmin();
  const id = cleanText(formData.get("id"));

  if (!id) {
    redirect("/admin/articles?error=missing");
  }

  const draft = await getArticleSeoDraft(id);

  if (!draft) {
    redirect("/admin/articles?error=not-found");
  }

  const draftArticle = await prisma.article.findUnique({
    where: {
      id,
    },
  });

  if (!draftArticle || draftArticle.deletedAt) {
    redirect("/admin/articles?error=not-found");
  }

  const draftUpdated = await prisma.article.update({
    where: {
      id,
    },
    data: {
      seoTitle: draft.seoTitle,
      seoDescription: draft.seoDescription,
      seoKeywords: draft.seoKeywords,
      ogTitle: draft.ogTitle,
      ogDescription: draft.ogDescription,
      canonicalUrl: draft.canonicalUrl,
      structuredDataType: draft.structuredDataType,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "generate",
      targetType: "article_seo_draft",
      targetId: draftUpdated.id,
      newValue: {
        seoTitle: draft.seoTitle,
        seoDescription: draft.seoDescription,
        seoKeywords: draft.seoKeywords,
        score: draft.score,
        issues: draft.issues,
        relatedProductCount: draft.relatedProductCount,
        relatedArticleCount: draft.relatedArticleCount,
      },
      note: "Applied article SEO draft after preview.",
    },
  });

  revalidateArticlePaths(draftUpdated.slug);
  redirect(`/admin/articles/${draftUpdated.id}/edit?seoDrafted=1`);
}

export async function createArticleCategoryAction(formData: FormData) {
  const admin = await requireAdmin();
  const name = cleanText(formData.get("name"));
  const slug = normalizeArticleSlug(cleanText(formData.get("slug")) || name);
  const locale = parseLocale(formData.get("locale"));

  if (!name || !slug) {
    redirect("/admin/articles/taxonomy?error=missing");
  }

  const exists = await prisma.articleCategory.findUnique({
    where: {
      slug_locale: {
        slug,
        locale,
      },
    },
  });

  if (exists) {
    redirect("/admin/articles/taxonomy?error=category-slug");
  }

  const category = await prisma.articleCategory.create({
    data: {
      name,
      slug,
      locale,
      description: cleanOptionalText(formData.get("description")),
      seoTitle: cleanOptionalText(formData.get("seoTitle")),
      seoDescription: cleanOptionalText(formData.get("seoDescription")),
      status: "PUBLISHED",
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "create",
      targetType: "article_category",
      targetId: category.id,
      newValue: {
        name: category.name,
        slug: category.slug,
      },
      note: "Created article category from GeoSub Admin.",
    },
  });

  revalidatePath("/admin/articles/taxonomy");
  redirect("/admin/articles/taxonomy?created=category");
}

export async function createArticleTagAction(formData: FormData) {
  const admin = await requireAdmin();
  const name = cleanText(formData.get("name"));
  const slug = normalizeArticleSlug(cleanText(formData.get("slug")) || name);
  const locale = parseLocale(formData.get("locale"));

  if (!name || !slug) {
    redirect("/admin/articles/taxonomy?error=missing");
  }

  const exists = await prisma.articleTag.findUnique({
    where: {
      slug_locale: {
        slug,
        locale,
      },
    },
  });

  if (exists) {
    redirect("/admin/articles/taxonomy?error=tag-slug");
  }

  const tag = await prisma.articleTag.create({
    data: {
      name,
      slug,
      locale,
      description: cleanOptionalText(formData.get("description")),
      status: "PUBLISHED",
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "create",
      targetType: "article_tag",
      targetId: tag.id,
      newValue: {
        name: tag.name,
        slug: tag.slug,
      },
      note: "Created article tag from GeoSub Admin.",
    },
  });

  revalidatePath("/admin/articles/taxonomy");
  redirect("/admin/articles/taxonomy?created=tag");
}

export async function toggleArticleCategoryStatusAction(formData: FormData) {
  await requireAdmin();
  const id = cleanText(formData.get("id"));

  const category = await prisma.articleCategory.findUnique({
    where: {
      id,
    },
  });

  if (!category) {
    redirect("/admin/articles/taxonomy?error=not-found");
  }

  await prisma.articleCategory.update({
    where: {
      id,
    },
    data: {
      status: category.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
    },
  });

  revalidatePath("/admin/articles/taxonomy");
  redirect("/admin/articles/taxonomy");
}

export async function toggleArticleTagStatusAction(formData: FormData) {
  await requireAdmin();
  const id = cleanText(formData.get("id"));

  const tag = await prisma.articleTag.findUnique({
    where: {
      id,
    },
  });

  if (!tag) {
    redirect("/admin/articles/taxonomy?error=not-found");
  }

  await prisma.articleTag.update({
    where: {
      id,
    },
    data: {
      status: tag.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED",
    },
  });

  revalidatePath("/admin/articles/taxonomy");
  redirect("/admin/articles/taxonomy");
}

"use server";
import { safeAdminReturnTo } from "@/lib/admin-workflow-context";

import { type Prisma, ArticleStatus, ArticleType, Locale, StructuredDataType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "../../../lib/admin-auth";
import { linkSearchOpportunity } from "../../../lib/admin-search-opportunities";
import { getArticleSeoDraft } from "../../../lib/article-seo-draft";
import { estimateReadingTime, normalizeArticleSlug } from "../../../lib/articles";
import { prisma } from "../../../lib/prisma";

import { attemptAdminSave, assertAdminVersion, adminRecordVersion, AdminSaveConflict } from "../../../lib/admin-save";

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
  revalidatePath("/en/guides");
  revalidatePath("/sitemap.xml");
  revalidatePath("/admin/articles");
  revalidatePath("/admin/articles/trash");

  if (slug) {
    revalidatePath(`/zh/guides/${slug}`);
    revalidatePath(`/en/guides/${slug}`);
  }
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

async function syncArticleTags(prisma: Prisma.TransactionClient, articleId: string, tagIds: string[]) {
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

async function syncArticleRelations(prisma: Prisma.TransactionClient, {
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
  const admin = await requireAdmin("manage");
  const data = getArticleData(formData);
  const tagIds = parseTagIds(formData);
  const productIds = parseIds(formData, "relatedProductIds");
  const relatedArticleIds = parseIds(formData, "relatedArticleIds");

  if (!data.title || !data.slug) {
    return { error: "请填写标题和网址标识。输入仍保留。" };
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
    return { error: "此语言下的网址标识已存在，请更换。输入仍保留。" };
  }

  const result = await attemptAdminSave(prisma, async (prisma) => {
  const article = await prisma.article.create({
    data,
  });

  await syncArticleTags(prisma, article.id, tagIds);
  await syncArticleRelations(prisma, {
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

  await linkSearchOpportunity({
    query: cleanText(formData.get("searchOpportunityQuery")),
    articleId: article.id,
    adminId: admin.id,
  }, prisma);

    return article;
  });
  if (!result.ok) return { error: result.error };
  const article = result.value;

  revalidateArticlePaths(article.slug);
  revalidatePath("/admin/search-demand");
  return {redirectTo:formData.get("saveIntent")==="return"
    ? safeAdminReturnTo(formData.get("returnTo"),"/admin/articles")
    : `/admin/articles/${article.id}/edit?created=1&returnTo=${
      encodeURIComponent(safeAdminReturnTo(formData.get("returnTo"),"/admin/articles"))
    }`
  };
}

export async function updateArticleAction(formData: FormData) {
  const admin = await requireAdmin("manage");
  const id = cleanText(formData.get("id"));
  const data = getArticleData(formData);
  const tagIds = parseTagIds(formData);
  const productIds = parseIds(formData, "relatedProductIds");
  const relatedArticleIds = parseIds(formData, "relatedArticleIds").filter(
    (relatedId) => relatedId !== id,
  );

  if (!id || !data.title || !data.slug) {
    return { error: "必填资料不完整，请检查后重试。输入仍保留。" };
  }

  const result = await attemptAdminSave(prisma, async (prisma) => {
    await prisma.$queryRaw`SELECT id FROM articles WHERE id = ${id}::uuid FOR UPDATE`;
  const current = await prisma.article.findUnique({
    where: {
      id,
    },
  });

  if (!current) {
    throw new AdminSaveConflict("文章已不存在，请保留输入并返回文章列表核对。");
  }

  assertAdminVersion(current, formData.get("recordVersion"));
  if (current.deletedAt) throw new AdminSaveConflict("文章已移入回收站，请先核对状态。");

  const slugOwner = await prisma.article.findUnique({
    where: {
      slug_locale: {
        slug: data.slug,
        locale: data.locale,
      },
    },
  });

  if (slugOwner && slugOwner.id !== id) {
    throw new AdminSaveConflict("此语言下的网址标识已存在，请更换后保存。");
  }

  const updated = await prisma.article.update({
    where: {
      id,
    },
    data,
  });

  await syncArticleTags(prisma, updated.id, tagIds);
  await syncArticleRelations(prisma, {
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

    return { current, updated };
  });
  if (!result.ok) return { error: result.error };
  const { current, updated } = result.value;

  revalidateArticlePaths(current.slug);
  revalidateArticlePaths(updated.slug);
  return { recordVersion: adminRecordVersion(updated) };
}

export async function archiveArticleAction(formData: FormData) {
  const admin = await requireAdmin("manage");
  const id = cleanText(formData.get("id"));
  const result = await attemptAdminSave(prisma, async (prisma) => {
    await prisma.$queryRaw`SELECT id FROM articles WHERE id = ${id}::uuid FOR UPDATE`;
  const article = await prisma.article.findUnique({ where: { id } });

  if (!article || article.deletedAt) {
    throw new AdminSaveConflict("文章已不存在或状态已变化，请刷新列表核对。");
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

    return article;
  });
  if (!result.ok) return { error: result.error };
  const article = result.value;

  revalidateArticlePaths(article.slug);
  redirect("/admin/articles?archived=1");
}

export async function moveArticleToTrashAction(formData: FormData) {
  const admin = await requireAdmin("manage");
  const id = cleanText(formData.get("id"));
  const result = await attemptAdminSave(prisma, async (prisma) => {
    await prisma.$queryRaw`SELECT id FROM articles WHERE id = ${id}::uuid FOR UPDATE`;
  const article = await prisma.article.findUnique({ where: { id } });

  if (!article || article.deletedAt) {
    throw new AdminSaveConflict("文章已不存在或状态已变化，请刷新列表核对。");
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

    return article;
  });
  if (!result.ok) return { error: result.error };
  const article = result.value;

  revalidateArticlePaths(article.slug);
  redirect("/admin/articles?trashed=1");
}

export async function restoreArticleFromTrashAction(formData: FormData) {
  const admin = await requireAdmin("manage");
  const id = cleanText(formData.get("id"));
  const result = await attemptAdminSave(prisma, async (prisma) => {
    await prisma.$queryRaw`SELECT id FROM articles WHERE id = ${id}::uuid FOR UPDATE`;
  const article = await prisma.article.findUnique({ where: { id } });

  if (!article || !article.deletedAt) {
    throw new AdminSaveConflict("文章已不存在或状态已变化，请刷新列表核对。");
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

    return article;
  });
  if (!result.ok) return { error: result.error };
  const article = result.value;

  revalidateArticlePaths(article.slug);
  redirect("/admin/articles/trash?restored=1");
}

export async function permanentlyDeleteArticleAction(formData: FormData) {
  const admin = await requireAdmin("manage");
  const id = cleanText(formData.get("id"));
  if (formData.get("confirmDelete") !== "on") return { error: "请先确认永久删除，此操作不可恢复。" };
  const result = await attemptAdminSave(prisma, async (prisma) => {
    await prisma.$queryRaw`SELECT id FROM articles WHERE id = ${id}::uuid FOR UPDATE`;
  const article = await prisma.article.findUnique({ where: { id } });

  if (!article || !article.deletedAt) {
    throw new AdminSaveConflict("文章已恢复或删除，请刷新回收站核对。");
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

    return article;
  });
  if (!result.ok) return { error: result.error };
  const article = result.value;

  revalidateArticlePaths(article.slug);
  redirect("/admin/articles/trash?deleted=1");
}

export async function generateArticleSeoDraftAction(formData: FormData) {
  const admin = await requireAdmin("manage");
  const id = cleanText(formData.get("id"));

  if (!id) {
    return { error: "必填资料不完整，请检查后重试。输入仍保留。" };
  }

  const before = await prisma.article.findUnique({where:{id}});
  if (!before || before.deletedAt || adminRecordVersion(before) !== String(formData.get("recordVersion") || "")) return {error:"文章已改变，请重新打开页面核对后再应用草稿。"};
  const draft = await getArticleSeoDraft(id);

  if (!draft) {
    return {error:"文章草稿不可用，请重新打开页面核对。"};
  }

  const result = await attemptAdminSave(prisma, async (prisma) => {
  await prisma.$queryRaw`SELECT id FROM articles WHERE id = ${id}::uuid FOR UPDATE`;
  const draftArticle = await prisma.article.findUnique({
    where: {
      id,
    },
  });

  if (!draftArticle || draftArticle.deletedAt) {
    throw new AdminSaveConflict("文章已不存在或已移入回收站。");
  }

  assertAdminVersion(draftArticle, formData.get("recordVersion"));
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

  return draftUpdated;
  });
  if (!result.ok) return {error:result.error};
  const draftUpdated = result.value;
  revalidateArticlePaths(draftUpdated.slug);
  redirect(`/admin/articles/${draftUpdated.id}/edit?seoDrafted=1`);
}

export async function createArticleCategoryAction(formData: FormData) {
  const admin = await requireAdmin("manage");
  const name = cleanText(formData.get("name"));
  const slug = normalizeArticleSlug(cleanText(formData.get("slug")) || name);
  const locale = parseLocale(formData.get("locale"));

  if (!name || !slug) {
    redirect(`/admin/articles/taxonomy?locale=${locale}&error=missing`);
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
    redirect(`/admin/articles/taxonomy?locale=${locale}&error=category-slug`);
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

  revalidateArticlePaths();
  revalidatePath("/admin/articles/taxonomy");
  redirect(`/admin/articles/taxonomy?locale=${locale}&created=category`);
}

export async function createArticleTagAction(formData: FormData) {
  const admin = await requireAdmin("manage");
  const name = cleanText(formData.get("name"));
  const slug = normalizeArticleSlug(cleanText(formData.get("slug")) || name);
  const locale = parseLocale(formData.get("locale"));

  if (!name || !slug) {
    redirect(`/admin/articles/taxonomy?locale=${locale}&error=missing`);
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
    redirect(`/admin/articles/taxonomy?locale=${locale}&error=tag-slug`);
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

  revalidateArticlePaths();
  revalidatePath("/admin/articles/taxonomy");
  redirect(`/admin/articles/taxonomy?locale=${locale}&created=tag`);
}

export async function toggleArticleCategoryStatusAction(formData: FormData) {
  await requireAdmin("manage");
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

  revalidateArticlePaths();
  revalidatePath("/admin/articles/taxonomy");
  redirect(`/admin/articles/taxonomy?locale=${category.locale}`);
}

export async function toggleArticleTagStatusAction(formData: FormData) {
  await requireAdmin("manage");
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

  revalidateArticlePaths();
  revalidatePath("/admin/articles/taxonomy");
  redirect(`/admin/articles/taxonomy?locale=${tag.locale}`);
}

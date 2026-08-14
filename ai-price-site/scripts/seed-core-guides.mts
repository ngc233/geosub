#!/usr/bin/env node

await import("dotenv/config");

const [{ prisma }, content, relations] = await Promise.all([
  import("../lib/prisma.ts"),
  import("../lib/core-guide-content.ts"),
  import("../lib/core-guide-relations.ts"),
]);

const { coreGuideToMarkdown, getAllCoreGuideDefinitions } = content;
const {
  getCoreGuideArticleRelationDescription,
  getCoreGuideCluster,
  getCoreGuideProductRelationCopy,
} = relations;
const dryRun = process.argv.includes("--dry-run");
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://geosub.org").replace(/\/$/, "");
const publishedAt = new Date("2026-08-14T00:00:00.000Z");

function databaseLocale(locale: "zh" | "en") {
  return locale === "zh" ? ("ZH" as const) : ("EN" as const);
}

function readingTime(markdown: string, locale: "zh" | "en") {
  const count = locale === "zh"
    ? markdown.match(/[\u3400-\u9fff]/g)?.length || 0
    : markdown.match(/[A-Za-z0-9]+/g)?.length || 0;
  return Math.max(1, Math.ceil(count / (locale === "zh" ? 420 : 220)));
}

async function ensureCategory(locale: "zh" | "en") {
  const localeValue = databaseLocale(locale);
  const existing = await prisma.articleCategory.findUnique({
    where: { slug_locale: { slug: "guides", locale: localeValue } },
  });

  if (existing || dryRun) return existing;

  return prisma.articleCategory.create({
    data: {
      slug: "guides",
      locale: localeValue,
      name: locale === "zh" ? "指南" : "Guides",
      description:
        locale === "zh"
          ? "帮助读者理解地区订阅价格、付款条件与数据方法。"
          : "Guides to regional subscription pricing, payment conditions and data methodology.",
      status: "PUBLISHED",
      sortOrder: 10,
    },
  });
}

let created = 0;
let skipped = 0;
let relationsCreated = 0;
let relationsExisting = 0;
let missingTargets = 0;
let metadataUpdated = 0;

try {
  const definitions = getAllCoreGuideDefinitions();
  const articleIds = new Map<string, string>();

  for (const definition of definitions) {
    const locale = databaseLocale(definition.locale);
    const existing = await prisma.article.findUnique({
      where: { slug_locale: { slug: definition.slug, locale } },
      select: {
        id: true,
        status: true,
        excerpt: true,
        seoDescription: true,
        seoKeywords: true,
        ogDescription: true,
      },
    });

    if (existing) {
      skipped += 1;
      articleIds.set(`${definition.locale}:${definition.slug}`, existing.id);
      const previousDescriptions = definition.previousSeoDescriptions || [];
      const metadataPatch: {
        excerpt?: string;
        seoDescription?: string;
        seoKeywords?: string;
        ogDescription?: string;
      } = {};

      if (!existing.seoKeywords) {
        metadataPatch.seoKeywords = definition.seoKeywords;
      }
      if (
        existing.seoDescription &&
        previousDescriptions.includes(existing.seoDescription)
      ) {
        metadataPatch.seoDescription = definition.seoDescription;
      }
      if (existing.excerpt && previousDescriptions.includes(existing.excerpt)) {
        metadataPatch.excerpt = definition.seoDescription;
      }
      if (
        existing.ogDescription &&
        previousDescriptions.includes(existing.ogDescription)
      ) {
        metadataPatch.ogDescription = definition.seoDescription;
      }

      if (Object.keys(metadataPatch).length > 0) {
        console.log(
          `${dryRun ? "WOULD UPDATE" : "UPDATE"} metadata ${definition.locale}/${definition.slug}`,
        );
        if (!dryRun) {
          await prisma.article.update({
            where: { id: existing.id },
            data: metadataPatch,
          });
        }
        metadataUpdated += 1;
      }
      console.log(`SKIP ${definition.locale}/${definition.slug} (${existing.status})`);
      continue;
    }

    const category = await ensureCategory(definition.locale);
    const markdown = coreGuideToMarkdown(definition);
    console.log(`${dryRun ? "WOULD CREATE" : "CREATE"} ${definition.locale}/${definition.slug}`);

    if (!dryRun) {
      const article = await prisma.article.create({
        data: {
          slug: definition.slug,
          locale,
          title: definition.title,
          subtitle: definition.description,
          excerpt: definition.seoDescription,
          articleType: definition.articleType,
          categoryId: category?.id,
          authorName: definition.locale === "zh" ? "GeoSub 编辑部" : "GeoSub Editorial",
          bodyMarkdown: markdown,
          status: "PUBLISHED",
          readingTime: readingTime(markdown, definition.locale),
          publishedAt,
          canonicalUrl: `${siteUrl}/${definition.locale}/guides/${definition.slug}`,
          seoTitle: definition.seoTitle,
          seoDescription: definition.seoDescription,
          seoKeywords: definition.seoKeywords,
          ogTitle: definition.seoTitle,
          ogDescription: definition.seoDescription,
          structuredDataType: "ARTICLE",
          tocEnabled: false,
          noindex: false,
          nofollow: false,
        },
      });
      articleIds.set(`${definition.locale}:${definition.slug}`, article.id);
    }

    created += 1;
  }

  const requestedProductSlugs = [
    ...new Set(
      definitions.flatMap((definition) =>
        [...getCoreGuideCluster(definition.slug).productSlugs],
      ),
    ),
  ];
  const products = await prisma.product.findMany({
    where: {
      slug: { in: requestedProductSlugs },
      status: "PUBLISHED",
    },
    select: { id: true, slug: true, name: true },
  });
  const productsBySlug = new Map(products.map((product) => [product.slug, product]));

  for (const definition of definitions) {
    const articleId = articleIds.get(`${definition.locale}:${definition.slug}`);
    const cluster = getCoreGuideCluster(definition.slug);

    console.log(
      `${dryRun ? "WOULD SYNC" : "SYNC"} ${definition.locale}/${definition.slug}: ` +
        `${cluster.productSlugs.length} products, ${cluster.relatedGuideSlugs.length} guides`,
    );

    if (dryRun || !articleId) continue;

    const existingRelations = await prisma.articleRelation.findMany({
      where: {
        articleId,
        relationType: { in: ["RELATED_PRODUCT", "RELATED_ARTICLE"] },
      },
      select: {
        productId: true,
        relatedArticleId: true,
      },
    });
    const existingKeys = new Set(
      existingRelations.flatMap((relation) => [
        ...(relation.productId ? [`product:${relation.productId}`] : []),
        ...(relation.relatedArticleId ? [`article:${relation.relatedArticleId}`] : []),
      ]),
    );
    const rows: Array<{
      articleId: string;
      relationType: "RELATED_PRODUCT" | "RELATED_ARTICLE";
      productId?: string;
      relatedArticleId?: string;
      title?: string;
      description: string;
      sortOrder: number;
      status: "PUBLISHED";
    }> = [];

    for (const [index, productSlug] of cluster.productSlugs.entries()) {
      const product = productsBySlug.get(productSlug);
      if (!product) {
        missingTargets += 1;
        console.warn(`MISSING published product ${productSlug}`);
        continue;
      }
      if (existingKeys.has(`product:${product.id}`)) {
        relationsExisting += 1;
        continue;
      }
      const copy = getCoreGuideProductRelationCopy(definition.locale, product.name);
      rows.push({
        articleId,
        relationType: "RELATED_PRODUCT",
        productId: product.id,
        title: copy.title,
        description: copy.description,
        sortOrder: index,
        status: "PUBLISHED",
      });
    }

    for (const [index, relatedSlug] of cluster.relatedGuideSlugs.entries()) {
      const relatedArticleId = articleIds.get(`${definition.locale}:${relatedSlug}`);
      if (!relatedArticleId) {
        missingTargets += 1;
        console.warn(`MISSING related guide ${definition.locale}/${relatedSlug}`);
        continue;
      }
      if (existingKeys.has(`article:${relatedArticleId}`)) {
        relationsExisting += 1;
        continue;
      }
      rows.push({
        articleId,
        relationType: "RELATED_ARTICLE",
        relatedArticleId,
        description: getCoreGuideArticleRelationDescription(definition.locale),
        sortOrder: cluster.productSlugs.length + index,
        status: "PUBLISHED",
      });
    }

    if (rows.length > 0) {
      await prisma.articleRelation.createMany({ data: rows });
      relationsCreated += rows.length;
    }
  }

  console.log(
    `Core guide seed complete. Articles created: ${created}. Articles existing: ${skipped}. ` +
      `Metadata updated: ${metadataUpdated}. ` +
      `Relations created: ${relationsCreated}. Relations existing: ${relationsExisting}. ` +
      `Missing targets: ${missingTargets}. Dry run: ${dryRun}.`,
  );
} finally {
  await prisma.$disconnect();
}

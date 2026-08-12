import "dotenv/config";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Locale, ProductCategory, PublishStatus } from "@prisma/client";
import { getFeaturedCurrencyPairs } from "../lib/currency-pairs.ts";
import { getPlanEditorialIndexingStatus } from "../lib/product-editorial-content.ts";
import {
  getPlanSitemapDecision,
  getProductSeoGateMode,
  getProductSitemapDecision,
} from "../lib/product-seo-indexing-policy.ts";
import { getProductSeoQualityAudits } from "../lib/product-seo-quality-data.ts";
import { indexableStaticGuidePaths } from "../lib/public-launch-routes.ts";
import { prisma } from "../lib/prisma.ts";
import {
  seoIndexableLocales,
  seoSitemapBudgets,
} from "../lib/seo-indexing-policy.ts";
import { siteLocaleDefinitions } from "../lib/site-locale.ts";

const siteDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sitemapSource = readFileSync(resolve(siteDir, "app", "sitemap.ts"), "utf8");
const literalPaths = [
  ...sitemapSource.matchAll(/route\("(\/[^"]+)"/g),
].map((match) => match[1]);

function localePath(locale: (typeof seoIndexableLocales)[number]) {
  return siteLocaleDefinitions[locale].path;
}

function publishedArticleWhere(locale: Locale, now: Date) {
  return {
    locale,
    noindex: false,
    deletedAt: null,
    OR: [
      { status: "PUBLISHED" as const },
      {
        status: "SCHEDULED" as const,
        scheduledAt: { lte: now },
      },
    ],
  };
}

async function getProductPaths() {
  const gateMode = getProductSeoGateMode();
  const qualityAudits =
    gateMode === "enforce" ? await getProductSeoQualityAudits() : [];
  const eligibleProducts = new Set(
    qualityAudits
      .filter((audit) => getProductSitemapDecision(audit.status, gateMode).included)
      .map((audit) => audit.id),
  );
  const products = await prisma.product.findMany({
    where: {
      status: PublishStatus.PUBLISHED,
      category: {
        in: [ProductCategory.AI, ProductCategory.STREAMING],
      },
      regionPrices: {
        some: {
          status: PublishStatus.PUBLISHED,
          priceUsd: { gt: 0 },
        },
      },
    },
    select: {
      id: true,
      slug: true,
      category: true,
      plans: {
        where: {
          status: PublishStatus.PUBLISHED,
          regionPrices: {
            some: {
              status: PublishStatus.PUBLISHED,
              priceUsd: { gt: 0 },
            },
          },
        },
        select: { slug: true },
      },
    },
  });

  return products
    .filter(
      (product) =>
        gateMode === "observe" || eligibleProducts.has(product.id),
    )
    .flatMap((product) => {
      const section =
        product.category === ProductCategory.STREAMING
          ? "streaming-pricing"
          : "ai-pricing";

      return product.plans.flatMap((plan) => {
        const decision = getPlanSitemapDecision(
          getPlanEditorialIndexingStatus(product.slug, plan.slug),
          gateMode,
        );
        if (!decision.included) return [];

        return seoIndexableLocales.map(
          (locale) =>
            `/${localePath(locale)}/${section}/${product.slug}/${plan.slug}`,
        );
      });
    });
}

async function getArticlePaths(now: Date) {
  const locales = [
    { locale: Locale.ZH, path: "zh" },
    { locale: Locale.EN, path: "en" },
  ] as const;

  const paths = await Promise.all(
    locales.map(async ({ locale, path }) => {
      const articleWhere = publishedArticleWhere(locale, now);
      const [articles, categories, tags] = await Promise.all([
        prisma.article.findMany({
          where: articleWhere,
          select: { slug: true },
        }),
        prisma.articleCategory.findMany({
          where: {
            locale,
            status: "PUBLISHED",
            articles: { some: articleWhere },
          },
          select: { slug: true },
        }),
        prisma.articleTag.findMany({
          where: {
            locale,
            status: "PUBLISHED",
            articleLinks: {
              some: { article: articleWhere },
            },
          },
          select: { slug: true },
        }),
      ]);

      return [
        ...articles.map((article) => `/${path}/guides/${article.slug}`),
        ...categories.map(
          (category) => `/${path}/guides/category/${category.slug}`,
        ),
        ...tags.map((tag) => `/${path}/guides/tag/${tag.slug}`),
      ];
    }),
  );

  return paths.flat();
}

try {
const staticGuidePaths = seoIndexableLocales.flatMap((locale) =>
  indexableStaticGuidePaths.map(
    (path) => `/${localePath(locale)}${path}`,
  ),
);
const converterPaths = seoIndexableLocales.flatMap((locale) => [
  `/${localePath(locale)}/tools/currency-converter`,
  ...getFeaturedCurrencyPairs(locale).map(
    (pair) =>
      `/${localePath(locale)}/tools/currency-converter/${pair.slug}`,
  ),
]);
const [productPlanPages, articlePaths] = await Promise.all([
  getProductPaths(),
  getArticlePaths(new Date()),
]);
const paths = [
  ...literalPaths,
  ...staticGuidePaths,
  ...converterPaths,
  ...productPlanPages,
  ...articlePaths,
];
const uniquePaths = new Set(paths);
const promotedLocalePaths: Set<string> = new Set(
  seoIndexableLocales.map((locale) => localePath(locale)),
);
const stagedLocalePaths = paths.filter((path) => {
  const locale = path.split("/")[1];
  return locale && !promotedLocalePaths.has(locale);
});
const guideDetailPages = paths.filter((path) =>
  /^\/[^/]+\/guides\/.+/.test(path),
);
const currencyPairPages = paths.filter((path) =>
  /^\/[^/]+\/tools\/currency-converter\/[^/]+$/.test(path),
);

assert.equal(
  uniquePaths.size,
  paths.length,
  `Sitemap contains ${paths.length - uniquePaths.size} duplicate URL(s).`,
);
assert.equal(
  stagedLocalePaths.length,
  0,
  `Sitemap contains staged locale URL(s): ${stagedLocalePaths.slice(0, 5).join(", ")}`,
);
assert.ok(
  paths.length <= seoSitemapBudgets.total,
  `Sitemap has ${paths.length} URLs; budget is ${seoSitemapBudgets.total}.`,
);
assert.ok(
  productPlanPages.length <= seoSitemapBudgets.productPlanPages,
  `Sitemap has ${productPlanPages.length} product plan pages; budget is ${seoSitemapBudgets.productPlanPages}.`,
);
assert.ok(
  guideDetailPages.length <= seoSitemapBudgets.guideDetailPages,
  `Sitemap has ${guideDetailPages.length} guide detail pages; budget is ${seoSitemapBudgets.guideDetailPages}.`,
);
assert.ok(
  currencyPairPages.length <= seoSitemapBudgets.currencyPairPages,
  `Sitemap has ${currencyPairPages.length} currency pair pages; budget is ${seoSitemapBudgets.currencyPairPages}.`,
);

console.log(
  JSON.stringify(
    {
      total: `${paths.length}/${seoSitemapBudgets.total}`,
      productPlanPages: `${productPlanPages.length}/${seoSitemapBudgets.productPlanPages}`,
      guideDetailPages: `${guideDetailPages.length}/${seoSitemapBudgets.guideDetailPages}`,
      currencyPairPages: `${currencyPairPages.length}/${seoSitemapBudgets.currencyPairPages}`,
      duplicateUrls: paths.length - uniquePaths.size,
      stagedLocaleUrls: stagedLocalePaths.length,
    },
    null,
    2,
  ),
);
console.log("Sitemap budget check passed.");
} finally {
  await prisma.$disconnect();
}

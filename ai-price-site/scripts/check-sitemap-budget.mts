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
  isPlanSitemapPromotedProduct,
  seoIndexableLocales,
  seoSitemapBudgets,
} from "../lib/seo-indexing-policy.ts";
import { siteLocaleDefinitions } from "../lib/site-locale.ts";
import { getEffectivePlanSitemapProductSlugs } from "../lib/seo-plan-promotion-data.ts";
import {
  getCountryPagePilotPath,
  getIndexApprovedCountryPagePilots,
} from "../lib/country-page-pilot.ts";

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
  const [qualityAudits, promotedProductSlugs] = await Promise.all([
    gateMode === "enforce" ? getProductSeoQualityAudits() : Promise.resolve([]),
    getEffectivePlanSitemapProductSlugs(),
  ]);
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

      const productPaths = seoIndexableLocales.map(
        (locale) =>
          `/${localePath(locale)}/${section}/${product.slug}`,
      );
      const planPaths = product.plans.flatMap((plan) => {
        if (
          !isPlanSitemapPromotedProduct(product.slug, promotedProductSlugs)
        ) {
          return [];
        }

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

      return [...productPaths, ...planPaths];
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
const countryPagePaths = getIndexApprovedCountryPagePilots().flatMap((pilot) =>
  seoIndexableLocales.map((locale) => getCountryPagePilotPath(pilot, locale)),
);
const [productPlanPages, articlePaths] = await Promise.all([
  getProductPaths(),
  getArticlePaths(new Date()),
]);
const rawPaths = [
  ...literalPaths,
  ...staticGuidePaths,
  ...converterPaths,
  ...productPlanPages,
  ...countryPagePaths,
  ...articlePaths,
];
const paths = [...new Set(rawPaths)];
const mergedDuplicateUrls = rawPaths.length - paths.length;
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
const budgetSummary = {
  total: `${paths.length}/${seoSitemapBudgets.total}`,
  literalStaticPages: literalPaths.length,
  staticGuidePages: staticGuidePaths.length,
  converterPages: converterPaths.length,
  productPlanPages: `${productPlanPages.length}/${seoSitemapBudgets.productPlanPages}`,
  countryPages: `${countryPagePaths.length}/${seoSitemapBudgets.countryPages}`,
  articleTaxonomyPages: articlePaths.length,
  guideDetailPages: `${guideDetailPages.length}/${seoSitemapBudgets.guideDetailPages}`,
  currencyPairPages: `${currencyPairPages.length}/${seoSitemapBudgets.currencyPairPages}`,
  duplicateUrls: 0,
  mergedDuplicateUrls,
  stagedLocaleUrls: stagedLocalePaths.length,
};

console.log(JSON.stringify(budgetSummary, null, 2));

if (mergedDuplicateUrls > 0) {
  assert.match(
    sitemapSource,
    /dedupeRoutes\(\[[\s\S]*\.\.\.staticRoutes,[\s\S]*\.\.\.productRoutes,[\s\S]*\.\.\.articleRoutes,[\s\S]*\.\.\.countryPageRoutes,[\s\S]*\]\)/,
    "Sitemap route sources overlap but the final output is not deduplicated.",
  );
}
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
assert.equal(
  countryPagePaths.length,
  seoSitemapBudgets.countryPages,
  `Sitemap must contain exactly ${seoSitemapBudgets.countryPages} approved country pages; found ${countryPagePaths.length}.`,
);
assert.ok(
  guideDetailPages.length <= seoSitemapBudgets.guideDetailPages,
  `Sitemap has ${guideDetailPages.length} guide detail pages; budget is ${seoSitemapBudgets.guideDetailPages}.`,
);
assert.ok(
  currencyPairPages.length <= seoSitemapBudgets.currencyPairPages,
  `Sitemap has ${currencyPairPages.length} currency pair pages; budget is ${seoSitemapBudgets.currencyPairPages}.`,
);

console.log("Sitemap budget check passed.");
} finally {
  await prisma.$disconnect();
}

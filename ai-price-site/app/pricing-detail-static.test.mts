import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { getPlanDisplayName } from "../lib/pricing-labels.ts";
import {
  getPricingDetailPath,
  getPricingListPath,
  stripGeoSubTitleSuffix,
} from "../lib/pricing-routes.ts";

const appDir = dirname(fileURLToPath(import.meta.url));

function readAppFile(...segments: string[]) {
  return readFileSync(resolve(appDir, ...segments), "utf8");
}

const badEncodingTokens = [
  "鈫",
  "鈱",
  "�",
  "鍏ㄧ",
  "鎸夊",
  "浠锋牸",
  "璁㈤槄",
];

test("pricing detail pages keep product navigation database-driven", () => {
  for (const locale of ["zh", "en"]) {
    const page = readAppFile(locale, "ai-pricing", "[slug]", "page.tsx");

    assert.match(page, /async function getProductNavItems/);
    assert.match(page, /export const dynamic = "force-dynamic"/);
    assert.match(page, /prisma\.product\.findMany/);
    assert.match(page, /status:\s*"PUBLISHED"/);
    assert.match(page, /plans:\s*\{\s*some:/);
    assert.match(page, /regionPrices:\s*\{\s*some:/);
    assert.match(page, /sortOrder: "asc"/);
    assert.match(page, /logoUrl: true/);
    assert.match(page, /officialUrl: true/);
    assert.match(page, /products=\{sidebarProducts\}/);
  }
});

test("database-only streaming products keep their real category on detail pages", () => {
  const adapter = readAppFile("..", "lib", "pricing-detail-adapter.ts");

  assert.match(adapter, /p\.category::text AS product_category/);
  assert.match(adapter, /p\.provider AS product_provider/);
  assert.match(adapter, /p\.description AS product_description/);
  assert.match(adapter, /p\.official_url AS product_official_url/);
  assert.match(adapter, /firstRow\.product_category === "streaming"/);
  assert.match(adapter, /p\.status = 'published'/);
  assert.doesNotMatch(adapter, /subscriptionPricingData/);
  assert.doesNotMatch(adapter, /staticProduct/);
});

test("public pricing products require published product, plan and price state", () => {
  const listAdapter = readAppFile("..", "lib", "db-ai-pricing.ts");
  const defaultPlan = readAppFile("..", "lib", "db-pricing-types.ts");

  assert.match(listAdapter, /status:\s*"PUBLISHED"/);
  assert.match(listAdapter, /plans:\s*\{\s*some:/);
  assert.match(listAdapter, /regionPrices:\s*\{\s*some:/);
  assert.doesNotMatch(listAdapter, /productDisplayNameMap/);
  assert.match(defaultPlan, /return product\.plans\[0\]/);
  assert.doesNotMatch(defaultPlan, /featuredPlanByProduct/);
});

test("public pricing runtime does not import the legacy static product catalog", () => {
  const runtimeFiles = [
    readAppFile("zh", "ai-pricing", "[slug]", "page.tsx"),
    readAppFile("en", "ai-pricing", "[slug]", "page.tsx"),
    readAppFile("..", "lib", "pricing-detail-adapter.ts"),
    readAppFile("..", "components", "PricingPlatformView.tsx"),
  ];

  for (const source of runtimeFiles) {
    assert.doesNotMatch(source, /data\/ai-pricing/);
    assert.match(source, /public-pricing-model/);
  }
});

test("pricing detail pages keep AI and streaming paths synchronized", () => {
  const zhPage = readAppFile("zh", "ai-pricing", "[slug]", "page.tsx");
  const enPage = readAppFile("en", "ai-pricing", "[slug]", "page.tsx");

  for (const page of [zhPage, enPage]) {
    assert.match(page, /detailBasePath =/);
    assert.match(page, /getPricingListPath/);
    assert.match(page, /href=\{detailBasePath\}/);
    assert.match(page, /basePath=\{detailBasePath\}/);
  }

  assert.equal(getPricingListPath("zh", "ai"), "/zh/ai-pricing");
  assert.equal(getPricingListPath("en", "streaming"), "/en/streaming-pricing");
  assert.equal(
    getPricingListPath("zh", "STREAMING"),
    "/zh/streaming-pricing",
  );
  assert.equal(
    getPricingDetailPath("zh", "streaming", "netflix"),
    "/zh/streaming-pricing/netflix",
  );
});

test("streaming detail routes render directly and preserve plan query links", () => {
  const planTabs = readAppFile("..", "components", "PlanTabs.tsx");

  for (const locale of ["zh", "en"]) {
    const streamingPage = readAppFile(
      locale,
      "streaming-pricing",
      "[slug]",
      "page.tsx",
    );

    assert.match(streamingPage, /generateMetadata, default/);
    assert.match(streamingPage, /ai-pricing\/\[slug\]\/page/);
    assert.doesNotMatch(streamingPage, /redirect\(/);
  }

  assert.match(planTabs, /\?plan=\$\{plan\.slug\}/);

  for (const locale of ["zh", "en"]) {
    const detailPage = readAppFile(locale, "ai-pricing", "[slug]", "page.tsx");

    assert.match(detailPage, /currentPath && currentPath !== canonicalDetailPath/);
    assert.match(detailPage, /encodeURIComponent\(resolvedSearchParams\.plan\)/);
    assert.match(detailPage, /redirect\(`\$\{canonicalDetailPath\}\$\{planQuery\}`\)/);
  }
});

test("pricing detail metadata owns canonical paths without duplicating the site name", () => {
  assert.equal(stripGeoSubTitleSuffix("Netflix Prices - GeoSub"), "Netflix Prices");
  assert.equal(stripGeoSubTitleSuffix("Netflix Prices"), "Netflix Prices");

  for (const locale of ["zh", "en"]) {
    const page = readAppFile(locale, "ai-pricing", "[slug]", "page.tsx");

    assert.match(page, /canonical:/);
    assert.match(page, /"zh-CN":/);
    assert.match(page, /"x-default":/);
    assert.doesNotMatch(page, /title:\s*`[^`]+ - GeoSub`/);
  }
});

test("pricing detail pages do not contain mojibake text tokens", () => {
  for (const locale of ["zh", "en"]) {
    const page = readAppFile(locale, "ai-pricing", "[slug]", "page.tsx");

    for (const token of badEncodingTokens) {
      assert.doesNotMatch(page, new RegExp(token));
    }
  }
});

test("pricing detail labels avoid duplicated product and plan names", () => {
  assert.equal(getPlanDisplayName("ChatGPT", "ChatGPT Plus"), "ChatGPT Plus");
  assert.equal(getPlanDisplayName("Netflix", "Premium"), "Netflix Premium");
  assert.equal(getPlanDisplayName("Google AI", "Google AI Pro"), "Google AI Pro");

  const zhPage = readAppFile("zh", "ai-pricing", "[slug]", "page.tsx");
  const enPage = readAppFile("en", "ai-pricing", "[slug]", "page.tsx");
  const platformView = readAppFile("..", "components", "PricingPlatformView.tsx");
  const shareModal = readAppFile("..", "components", "SharePriceModal.tsx");
  const pricingCopy = readAppFile("..", "lib", "public-pricing-copy.ts");

  assert.match(zhPage, /import \{ getPlanDisplayName \}/);
  assert.match(enPage, /import \{ getPlanDisplayName \}/);
  assert.match(platformView, /const planDisplayName = getPlanDisplayName\(productName, plan\.name\)/);
  assert.match(platformView, /copy\.conclusionTitle\(planDisplayName\)/);
  assert.match(pricingCopy, /\$\{planName\} 全球价格结论/);
  assert.match(pricingCopy, /\$\{planName\} global price conclusion/);
  assert.match(shareModal, /const planDisplayName = getPlanDisplayName\(product\.name, plan\.name\)/);
  assert.match(shareModal, /import type \{ SiteLocale \} from '\.\.\/lib\/site-locale'/);
  assert.match(shareModal, /satisfies Record<SiteLocale, ShareCopy>/);
  assert.match(shareModal, /Share price card/);
  assert.match(zhPage, /<SharePriceModal product=\{product\} plan=\{activePlan\} stats=\{stats\} locale="zh" \/>/);
  assert.match(enPage, /<SharePriceModal product=\{product\} plan=\{activePlan\} stats=\{stats\} locale="en" \/>/);
  assert.match(zhPage, /planDisplayName = getPlanDisplayName\(productName, planName\)/);
  assert.doesNotMatch(zhPage, /\$\{productName\} Plus 订阅/);
  assert.doesNotMatch(platformView, /\$\{productName\} \$\{plan\.name\}/);
  assert.doesNotMatch(shareModal, /\$\{product\.name\} \$\{plan\.name\}/);
});

test("pricing FAQs answer customer questions instead of explaining internal source policy", () => {
  const zhPage = readAppFile("zh", "ai-pricing", "[slug]", "page.tsx");
  const enPage = readAppFile("en", "ai-pricing", "[slug]", "page.tsx");

  assert.match(zhPage, /价格是否含税/);
  assert.match(zhPage, /可以直接购买最便宜地区/);
  assert.match(zhPage, /地区价格多久更新一次/);
  assert.match(zhPage, /stats\.minRegion\.country/);
  assert.doesNotMatch(zhPage, /本页追踪的是 App Store 价格/);

  assert.match(enPage, /Does the displayed.*price include tax/);
  assert.match(enPage, /Can I subscribe.*through the cheapest region/);
  assert.match(enPage, /How often are.*regional prices updated/);
  assert.match(enPage, /stats\.minRegion\.country/);
  assert.doesNotMatch(enPage, /Does this page rank App Store/);
});

test("pricing detail freshness follows the active plan and trusted matching observations", () => {
  const platformView = readAppFile("..", "components", "PricingPlatformView.tsx");
  const adapter = readAppFile("..", "lib", "pricing-detail-adapter.ts");
  const shareModal = readAppFile("..", "components", "SharePriceModal.tsx");
  const pricingCopy = readAppFile("..", "lib", "public-pricing-copy.ts");

  assert.match(platformView, /plan\.freshness\?\.pageUpdatedAt/);
  assert.match(platformView, /copy\.pageUpdated/);
  assert.match(pricingCopy, /页面更新/);
  assert.match(platformView, /copy\.latestCollection/);
  assert.match(platformView, /copy\.fxBasis/);
  assert.match(platformView, /copy\.planReview/);
  assert.match(platformView, /copy\.trustStatus/);
  assert.match(pricingCopy, /最近采集/);
  assert.match(pricingCopy, /汇率基准/);
  assert.match(pricingCopy, /套餐复核/);
  assert.match(pricingCopy, /可信状态/);
  assert.doesNotMatch(platformView, /getLatestPlanReviewDate/);
  assert.match(adapter, /freshness: getPlanFreshness\(regions\)/);
  assert.match(adapter, /pageUpdatedAt: getLatestDate\(\[planReviewedAt, priceCollectedAt\]\)/);
  assert.doesNotMatch(adapter, /latestCheckedAt \|\| staticProduct\?\.updatedAt/);
  assert.match(shareModal, /plan\.freshness\?\.pageUpdatedAt \|\| product\.updatedAt/);
  assert.match(adapter, /po\.status = 'approved'/);
  assert.match(adapter, /auto_review_reason_code' = 'superseded_by_published_price'/);
});

test("detail copy separates active locales from prepared translations", () => {
  const detailCopy = readAppFile("..", "lib", "detail-page-copy.ts");
  const adapter = readAppFile("..", "lib", "pricing-detail-adapter.ts");

  assert.match(detailCopy, /import type \{ SiteLocale \} from "\.\/site-locale"/);
  assert.match(detailCopy, /type PreparedDetailLocale =\s*\| SiteLocale/);
  assert.match(detailCopy, /export type DetailLocale = SiteLocale/);
  assert.match(detailCopy, /Record<PreparedDetailLocale, DetailCopyTemplate>/);
  assert.match(detailCopy, /Record<PreparedDetailLocale, DetailMapCopy>/);
  assert.match(detailCopy, /Record<PreparedDetailLocale, DetailTableCopy>/);
  assert.doesNotMatch(detailCopy, /detailCopyTemplates\[locale\] \|\|/);
  assert.doesNotMatch(detailCopy, /detailMapCopy\[locale\] \|\|/);
  assert.doesNotMatch(detailCopy, /detailTableCopy\[locale\] \|\|/);
  assert.doesNotMatch(adapter, /\bes:\s*"es"/);
  assert.doesNotMatch(adapter, /\bja:\s*"ja"/);
});

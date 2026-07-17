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
    assert.match(page, /status:\s*\{\s*in:\s*\["PUBLISHED", "REVIEW"\]/);
    assert.match(page, /sortOrder: "asc"/);
    assert.match(page, /logoUrl: true/);
    assert.match(page, /officialUrl: true/);
    assert.match(page, /products=\{sidebarProducts\}/);
  }
});

test("database-only streaming products keep their real category on detail pages", () => {
  const adapter = readAppFile("..", "lib", "pricing-detail-adapter.ts");

  assert.match(adapter, /p\.category::text AS product_category/);
  assert.match(adapter, /p\.official_url AS product_official_url/);
  assert.match(adapter, /firstRow\.product_category === "streaming"/);
  assert.doesNotMatch(adapter, /category: staticProduct\?\.category \|\| "ai"/);
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

  assert.match(zhPage, /import \{ getPlanDisplayName \}/);
  assert.match(enPage, /import \{ getPlanDisplayName \}/);
  assert.match(platformView, /const planDisplayName = getPlanDisplayName\(productName, plan\.name\)/);
  assert.match(platformView, /\$\{planDisplayName\} 全球价格结论/);
  assert.match(platformView, /\$\{planDisplayName\} global price conclusion/);
  assert.match(shareModal, /const planDisplayName = getPlanDisplayName\(product\.name, plan\.name\)/);
  assert.match(shareModal, /type ShareLocale = 'zh' \| 'en'/);
  assert.match(shareModal, /Share price card/);
  assert.match(zhPage, /<SharePriceModal product=\{product\} plan=\{activePlan\} stats=\{stats\} locale="zh" \/>/);
  assert.match(enPage, /<SharePriceModal product=\{product\} plan=\{activePlan\} stats=\{stats\} locale="en" \/>/);
  assert.match(zhPage, /planDisplayName = getPlanDisplayName\(productName, planName\)/);
  assert.doesNotMatch(zhPage, /\$\{productName\} Plus 订阅/);
  assert.doesNotMatch(platformView, /\$\{productName\} \$\{plan\.name\}/);
  assert.doesNotMatch(shareModal, /\$\{product\.name\} \$\{plan\.name\}/);
});

test("pricing detail freshness follows the active plan and trusted matching observations", () => {
  const platformView = readAppFile("..", "components", "PricingPlatformView.tsx");
  const adapter = readAppFile("..", "lib", "pricing-detail-adapter.ts");

  assert.match(platformView, /getLatestPlanReviewDate/);
  assert.match(platformView, /本套餐最近复核/);
  assert.match(platformView, /Latest plan review/);
  assert.match(adapter, /po\.status = 'approved'/);
  assert.match(adapter, /auto_review_reason_code' = 'superseded_by_published_price'/);
});

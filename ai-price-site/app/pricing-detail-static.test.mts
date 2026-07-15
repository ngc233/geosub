import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { getPlanDisplayName } from "../lib/pricing-labels.ts";

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
    assert.match(page, /products=\{sidebarProducts\}/);
  }
});

test("pricing detail pages keep AI and streaming paths synchronized", () => {
  const zhPage = readAppFile("zh", "ai-pricing", "[slug]", "page.tsx");
  const enPage = readAppFile("en", "ai-pricing", "[slug]", "page.tsx");

  for (const page of [zhPage, enPage]) {
    assert.match(page, /detailBasePath =/);
    assert.match(page, /product\.category === "streaming"/);
    assert.match(page, /href=\{detailBasePath\}/);
    assert.match(page, /basePath=\{detailBasePath\}/);
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
  assert.doesNotMatch(platformView, /\$\{productName\} \$\{plan\.name\}/);
  assert.doesNotMatch(shareModal, /\$\{product\.name\} \$\{plan\.name\}/);
});

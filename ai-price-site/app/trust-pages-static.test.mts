import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const appDir = dirname(fileURLToPath(import.meta.url));

function readAppFile(fileName: string) {
  return readFileSync(resolve(appDir, fileName), "utf8");
}

const trustPages = [
  "zh/about/page.tsx",
  "en/about/page.tsx",
  "ja/about/page.tsx",
  "ko/about/page.tsx",
  "es/about/page.tsx",
  "tr/about/page.tsx",
  "ar/about/page.tsx",
  "zh/privacy/page.tsx",
  "en/privacy/page.tsx",
  "ja/privacy/page.tsx",
  "ko/privacy/page.tsx",
  "es/privacy/page.tsx",
  "tr/privacy/page.tsx",
  "ar/privacy/page.tsx",
  "zh/terms/page.tsx",
  "en/terms/page.tsx",
  "ja/terms/page.tsx",
  "ko/terms/page.tsx",
  "es/terms/page.tsx",
  "tr/terms/page.tsx",
  "ar/terms/page.tsx",
];

const publicCopyFiles = [
  ...trustPages,
  "zh/page.tsx",
  "en/page.tsx",
  "zh/data-sources/page.tsx",
  "en/data-sources/page.tsx",
  "ja/data-sources/page.tsx",
  "ko/data-sources/page.tsx",
  "es/data-sources/page.tsx",
  "tr/data-sources/page.tsx",
  "ar/data-sources/page.tsx",
  "zh/ai-pricing/[slug]/page.tsx",
  "en/ai-pricing/[slug]/page.tsx",
  "ja/ai-pricing/[slug]/page.tsx",
  "ko/ai-pricing/[slug]/page.tsx",
  "es/ai-pricing/[slug]/page.tsx",
  "tr/ai-pricing/[slug]/page.tsx",
  "ar/ai-pricing/[slug]/page.tsx",
  "ja/guides/page.tsx",
  "ja/guides/methodology/page.tsx",
  "ja/guides/payment-account/page.tsx",
  "ja/guides/price-guide/page.tsx",
  "ko/guides/page.tsx",
  "ko/guides/methodology/page.tsx",
  "ko/guides/payment-account/page.tsx",
  "ko/guides/price-guide/page.tsx",
  "es/guides/page.tsx",
  "es/guides/methodology/page.tsx",
  "es/guides/payment-account/page.tsx",
  "es/guides/price-guide/page.tsx",
  "tr/guides/page.tsx",
  "tr/guides/methodology/page.tsx",
  "tr/guides/payment-account/page.tsx",
  "tr/guides/price-guide/page.tsx",
  "ar/guides/page.tsx",
  "ar/guides/methodology/page.tsx",
  "ar/guides/payment-account/page.tsx",
  "ar/guides/price-guide/page.tsx",
  "zh/methodology/page.tsx",
  "zh/contact/page.tsx",
  "zh/guides/gift-card-guide/page.tsx",
  "zh/guides/methodology/page.tsx",
  "zh/guides/payment-account/page.tsx",
  "zh/guides/price-guide/page.tsx",
  "zh/guides/tool-review/page.tsx",
  "en/guides/gift-card-guide/page.tsx",
  "en/guides/methodology/page.tsx",
  "en/guides/payment-account/page.tsx",
  "en/guides/price-guide/page.tsx",
  "en/guides/tool-review/page.tsx",
  "../components/Footer.tsx",
  "../components/EuropeanLocalePages.tsx",
  "../components/TraditionalChinesePages.tsx",
  "../lib/public-pricing-copy.ts",
];

const unreleasedPublicPages = [
  "zh/ai-rankings/page.tsx",
  "en/ai-rankings/page.tsx",
  "zh/software-subscriptions/page.tsx",
  "en/software-subscriptions/page.tsx",
  "zh/gaming-steam/page.tsx",
  "en/gaming-steam/page.tsx",
  "zh/gift-cards/page.tsx",
  "en/gift-cards/page.tsx",
  "zh/vpn/page.tsx",
];

test("trust pages do not expose launch-time placeholder copy", () => {
  for (const fileName of trustPages) {
    const source = readAppFile(fileName);

    assert.doesNotMatch(source, /基础版本/);
    assert.doesNotMatch(source, /后续可以/);
    assert.doesNotMatch(source, /basic English trust page/i);
    assert.doesNotMatch(source, /expanded later/i);
    assert.doesNotMatch(source, /placeholder/i);
  }
});

test("trust pages explain current GeoSub data and policy boundaries", () => {
  assert.match(readAppFile("zh/about/page.tsx"), /App Store 订阅价格/);
  assert.match(readAppFile("en/about/page.tsx"), /App Store subscription prices/);
  assert.match(readAppFile("zh/privacy/page.tsx"), /Google Analytics 或 Tag Manager/);
  assert.match(readAppFile("en/privacy/page.tsx"), /Google Analytics or Google Tag Manager/);
  assert.match(readAppFile("zh/terms/page.tsx"), /最终请以官方结算页和平台规则为准/);
  assert.match(readAppFile("en/terms/page.tsx"), /official platform rules remain authoritative/);
});

test("public copy does not expose implementation-stage language", () => {
  const forbidden = /\bV1\b|当前视图|后台采集|正式价格库|采集流程|承接导航入口|避免已发布菜单指向 404|internal diagnostics|future source planning|official price database|collection flow|content in progress|will be added later|prepared for the English navigation|current beta|site administrator|configured by the administrator|from the administration|管理后台统一|当前优先整理|数据覆盖完善后|逐步开放更多产品|Web 官网.*Google Play/i;

  for (const fileName of publicCopyFiles) {
    assert.doesNotMatch(readAppFile(fileName), forbidden, fileName);
  }
});

test("unreleased public sections stay hidden in every environment", () => {
  for (const fileName of unreleasedPublicPages) {
    const source = readAppFile(fileName);

    assert.match(source, /guardUnreleasedPublicPage\(\)/, fileName);
    assert.match(source, /notFound\(\)/, fileName);
  }
});

test("legacy methodology route redirects to the current guide", () => {
  const source = readAppFile("zh/methodology/page.tsx");

  assert.match(source, /permanentRedirect\("\/zh\/guides\/methodology"\)/);
});

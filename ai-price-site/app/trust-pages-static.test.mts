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
  "zh/privacy/page.tsx",
  "en/privacy/page.tsx",
  "zh/terms/page.tsx",
  "en/terms/page.tsx",
];

const publicCopyFiles = [
  ...trustPages,
  "zh/data-sources/page.tsx",
  "en/data-sources/page.tsx",
  "zh/ai-pricing/[slug]/page.tsx",
  "en/ai-pricing/[slug]/page.tsx",
  "zh/methodology/page.tsx",
  "zh/contact/page.tsx",
  "zh/guides/gift-card-guide/page.tsx",
  "zh/guides/methodology/page.tsx",
  "zh/guides/payment-account/page.tsx",
  "zh/guides/price-guide/page.tsx",
  "zh/guides/tool-review/page.tsx",
  "../lib/public-pricing-copy.ts",
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
  assert.match(readAppFile("zh/about/page.tsx"), /经过核验的 App Store 地区价格/);
  assert.match(readAppFile("en/about/page.tsx"), /reviewed App Store regional prices/);
  assert.match(readAppFile("zh/privacy/page.tsx"), /Google Analytics 或 Tag Manager/);
  assert.match(readAppFile("en/privacy/page.tsx"), /Google Analytics or Tag Manager/);
  assert.match(readAppFile("zh/terms/page.tsx"), /最终请以官方结算页和平台规则为准/);
  assert.match(readAppFile("en/terms/page.tsx"), /official platform rules remain authoritative/);
});

test("public copy does not expose implementation-stage language", () => {
  const forbidden = /\bV1\b|当前视图|后台采集|正式价格库|采集流程|承接导航入口|避免已发布菜单指向 404|internal diagnostics|future source planning|official price database|collection flow/i;

  for (const fileName of publicCopyFiles) {
    assert.doesNotMatch(readAppFile(fileName), forbidden, fileName);
  }
});

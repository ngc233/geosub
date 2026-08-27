import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const appDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(appDir, "..");

function readAppFile(...segments: string[]) {
  return readFileSync(resolve(appDir, ...segments), "utf8");
}

function readRootFile(...segments: string[]) {
  return readFileSync(resolve(rootDir, ...segments), "utf8");
}

const localizedLocales = ["zh-tw", "en", "ja", "ko", "es", "tr", "ar", "fr", "it", "de", "pt"] as const;

test("all non-Chinese home routes use the shared localized homepage", () => {
  for (const locale of localizedLocales) {
    const source = readAppFile(locale, "page.tsx");
    assert.match(source, /LocalizedHomepagePage/);
    assert.match(source, new RegExp(`locale="${locale}"`));
    assert.doesNotMatch(source, /EuropeanHomePage|TraditionalChineseHomePage/);
  }
});

test("the shared homepage links only to available locale-scoped sections", () => {
  const source = [
    readRootFile("components", "HomepageExperience.tsx"),
    readRootFile("components", "LocalizedHomepagePage.tsx"),
  ].join("\n");

  for (const unavailable of ["software-subscriptions", "gaming-steam", "gift-cards", "ai-rankings"]) {
    assert.doesNotMatch(source, new RegExp(unavailable));
  }
  for (const available of ["ai-pricing", "streaming-pricing", "data-sources", "guides"]) {
    assert.match(source, new RegExp(available));
  }
  assert.match(source, /localeRoot/);
  assert.match(source, /getDbAiPricingProducts/);
  assert.match(source, /getDbHomepagePricingEvidence/);
  assert.match(source, /productSlugs: FEATURED_PRODUCT_SLUGS/);
  assert.match(source, /unstable_cache/);
});

test("every launched locale has complete homepage copy", async () => {
  const { getHomepageCopy } = await import("../lib/homepage-copy.ts");
  const requiredLocales = ["zh", ...localizedLocales] as const;

  for (const locale of requiredLocales) {
    const copy = getHomepageCopy(locale);
    assert.ok(copy.title.length > 12, `${locale} title`);
    assert.ok(copy.description.length > 20, `${locale} description`);
    assert.ok(copy.categories.ai[0]);
    assert.ok(copy.categories.streaming[0]);
    assert.ok(copy.proof.sources[0]);
    assert.ok(copy.map.lowest);
    assert.ok(copy.map.highest);
    assert.ok(copy.map.reference);
    assert.ok(copy.map.noData);
  }
});

test("Chinese homepage remains the visual baseline while visible copy is localized", () => {
  const zhRoute = readAppFile("zh", "page.tsx");
  const home = readRootFile("components", "HomepageExperience.tsx");
  const map = readRootFile("components", "HomeHeroMap.tsx");
  const copy = readRootFile("lib", "homepage-copy.ts");
  const globalStyles = readAppFile("globals.css");

  assert.match(zhRoute, /getDbAiPricingProducts/);
  assert.match(home, /locale === "zh"/);
  assert.match(home, /别只看标价/);
  assert.match(home, /getHomepageCopy\(locale\)/);
  assert.match(copy, /开始比较价格/);
  assert.match(copy, /数据如何核验/);
  assert.match(copy, /每个价格结论，都应该有证据可追溯/);
  assert.match(home, /bg-zinc-950/);
  assert.match(home, /text-lime-700/);
  assert.equal(
    home.match(/bg-\[var\(--background\)\]/g)?.length,
    4,
    "homepage main and all three sections must share the global page background",
  );
  assert.match(globalStyles, /body\s*\{[\s\S]*?background:\s*var\(--background\)/);
  assert.doesNotMatch(
    globalStyles,
    /body::before/,
    "a route-visible body overlay must not create a second page background",
  );
  assert.doesNotMatch(home, /<section className="[^"]*bg-white[^"]*px-4 py-14/);
  assert.doesNotMatch(home, /(?:text|bg|border)-(?:teal|blue|violet|orange|amber|rose|emerald)-/);
  assert.match(home, /role="tablist"/);
  assert.match(home, /aria-selected=\{selected\}/);
  assert.match(home, /setActiveIndex\(index\)/);
  assert.match(home, /scrollIntoView/);
  assert.doesNotMatch(home, /ROTATION_INTERVAL|setInterval/);
  assert.match(home, /gs-home-product-nav/);
  assert.match(globalStyles, /\.gs-home-product-nav::?-webkit-scrollbar|\.gs-home-product-nav::-webkit-scrollbar/);
  assert.match(home, /<HomeHeroMap/);
  assert.match(home, /locale=\{locale\}/);
  assert.match(map, /data-home-geo-pricing/);
  assert.match(map, /grid overflow-hidden rounded-xl border border-zinc-200 bg-white/);
  assert.match(map, /data-home-map-country/);
  assert.match(map, /data-home-map-pin/);
  assert.match(map, /data-home-mobile-map-pin/);
  assert.match(map, /className="pointer-events-auto absolute flex size-11/);
  assert.match(map, /fixed inset-x-3 bottom-3 z-50/);
  assert.match(map, /getGeoPriceFill/);
  assert.match(map, /text-lime-600/);
  assert.match(map, /text-\[#a24b3a\]/);
  assert.doesNotMatch(map, /pulse|strokeDasharray|route-/);
});

test("homepage evidence query uses the mapped PostgreSQL enum values", () => {
  const source = readRootFile("lib", "db-ai-pricing.ts");

  assert.match(source, /rp\.status = 'published'::publish_status/);
  assert.match(source, /p\.status = 'published'::publish_status/);
  assert.match(source, /pl\.status = 'published'::publish_status/);
  assert.match(source, /p\.category IN \('ai'::product_category, 'streaming'::product_category\)/);
  assert.doesNotMatch(source, /status = 'PUBLISHED'/);
});

test("shared homepage, category cards, and mobile header controls define dark surfaces", () => {
  const home = readRootFile("components", "HomepageExperience.tsx");
  const map = readRootFile("components", "HomeHeroMap.tsx");
  const pricingCard = readRootFile("components", "DbPricingCard.tsx");
  const header = readRootFile("components", "Header.tsx");
  const search = readRootFile("components", "GlobalSearch.tsx");

  for (const source of [home, map, pricingCard]) {
    assert.match(source, /dark:bg-zinc-/);
    assert.match(source, /dark:border-zinc-/);
    assert.match(source, /dark:text-(?:white|zinc-)/);
  }

  assert.match(home, /dark:hover:shadow-black\/35/);
  assert.match(map, /dark:hover:bg-zinc-700/);
  assert.match(pricingCard, /dark:group-hover:bg-zinc-800\/40/);
  assert.match(pricingCard, /dark:group-hover:text-white/);
  assert.match(header, /dark:active:bg-zinc-700/);
  assert.match(header, /dark:focus-visible:ring-offset-zinc-950/);
  assert.match(search, /dark:hover:border-zinc-700/);
  assert.match(search, /dark:active:bg-zinc-700/);
});

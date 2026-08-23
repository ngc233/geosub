import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const componentsDir = dirname(fileURLToPath(import.meta.url));

function readComponent(fileName: string) {
  return readFileSync(resolve(componentsDir, fileName), "utf8");
}

test("guide hubs keep reviewed core guides discoverable without duplicating CMS cards", () => {
  const hub = readComponent("CoreGuideHub.tsx");
  const chineseHub = readFileSync(
    resolve(componentsDir, "../app/zh/guides/page.tsx"),
    "utf8",
  );
  const englishHub = readFileSync(
    resolve(componentsDir, "../app/en/guides/page.tsx"),
    "utf8",
  );

  assert.match(hub, /coreGuideSlugs\.map/);
  assert.match(hub, /loadCoreGuideHubStates/);
  assert.match(hub, /!state\?\.managed \|\| state\.published/);
  assert.match(hub, /"tool-review"/);
  assert.match(hub, /guideHubExcludedArticleSlugs/);
  assert.match(chineseHub, /beforeArticles=\{<CoreGuideHub locale="zh" \/>\}/);
  assert.match(englishHub, /beforeArticles=\{<CoreGuideHub locale="en" \/>\}/);
  assert.match(chineseHub, /guideHubExcludedArticleSlugs\.has\(article\.slug\)/);
  assert.match(englishHub, /guideHubExcludedArticleSlugs\.has\(article\.slug\)/);
});

test("deferred maps have a visible skeleton and a timed rendering fallback", () => {
  const source = readComponent("PricingPlatformView.tsx");

  assert.match(source, /function MapLoadingPlaceholder/);
  assert.match(source, /typeof window\.IntersectionObserver !== "function"/);
  assert.match(source, /unsupportedBrowserTimer/);
  assert.match(source, /window\.setTimeout\(\(\) => setShouldRender\(true\), 1_500\)/);
  assert.match(source, /loading: MapLoadingPlaceholder/);
});

test("public guides keep long-form copy at a readable measure", () => {
  const source = readComponent("PublicGuidePage.tsx");

  assert.match(source, /max-w-4xl/);
  assert.match(source, /max-w-\[42rem\] text-base leading-8/);
  assert.match(source, /max-w-\[44rem\].*text-base leading-8/);
});

test("country flags are decorative beside the localized country name", () => {
  const source = readComponent("ExpandableRegionPriceTable.tsx");

  assert.match(source, /alt=""/);
  assert.match(source, /aria-hidden="true"/);
  assert.match(source, /\{localizedCountry\}/);
  assert.doesNotMatch(source, /alt=\{countryCode\}/);
});

test("regional prices use a dedicated mobile reading order with touch-accessible evidence", () => {
  const source = readComponent("ExpandableRegionPriceTable.tsx");

  assert.match(source, /className="border-b border-zinc-100 px-4 py-4 last:border-b-0 md:hidden/);
  assert.match(source, /"hidden gap-2 border-b border-zinc-100 px-5 py-3 last:border-b-0 md:grid/);
  assert.match(source, /md:grid-cols-\[40px_minmax\(130px,1fr\)_110px_100px_112px_minmax\(116px,1fr\)_124px\]/);
  assert.match(source, /const desktopFreshnessDate = region\.lastCheckedAt \|\| region\.fxRateDate/);
  assert.match(source, /const freshnessLabel = \[/);
  assert.match(source, /aria-expanded=\{open\}/);
  assert.match(source, /aria-describedby=\{tooltipId\}/);
  assert.match(source, /onClick=\{\(\) => setOpen\(true\)\}/);
  assert.match(source, /text-lg font-semibold tabular-nums/);
  assert.match(
    source,
    /key=\{`\$\{plan\.slug\}-\$\{effectivePlatform\}-\$\{displayCurrency\}-\$\{regionQuery\}-\$\{quickFilter\}`\}/,
  );
});

test("regional prices expose a sticky client-side lookup toolbar", () => {
  const table = readComponent("ExpandableRegionPriceTable.tsx");
  const platform = readComponent("PricingPlatformView.tsx");

  assert.match(table, /sticky top-16 z-30/);
  assert.match(table, /type="search"/);
  assert.match(table, /filterRegionPrices\(\{/);
  assert.match(table, /aria-live="polite"/);
  assert.match(table, /aria-pressed=\{active\}/);
  assert.match(platform, /toolbarCurrencyControl=/);
  assert.match(platform, /compact\n\s*\/>/);
});

test("regional prices support bounded comparison and explicit evidence details", () => {
  const source = readComponent("ExpandableRegionPriceTable.tsx");

  assert.match(source, /REGION_COMPARISON_LIMIT/);
  assert.match(source, /selectedRegionKeys/);
  assert.match(source, /function RegionComparisonPanel/);
  assert.match(source, /function RegionEvidencePanel/);
  assert.match(source, /aria-controls=\{evidencePanelId\}/);
  assert.match(source, /region\.lastCheckedAt \|\| "—"/);
  assert.match(source, /region\.fxRateDate \|\| "—"/);
  assert.match(source, /region\.sourceUrl/);
});

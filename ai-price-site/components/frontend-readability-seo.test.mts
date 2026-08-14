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

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const componentsDir = dirname(fileURLToPath(import.meta.url));

function readComponent(fileName: string) {
  return readFileSync(resolve(componentsDir, fileName), "utf8");
}

test("language and currency dropdowns close on outside interaction and Escape", () => {
  const header = readComponent("Header.tsx");
  const pricingPlatform = readComponent("PricingPlatformView.tsx");

  assert.match(header, /document\.addEventListener\("pointerdown"/);
  assert.match(header, /document\.addEventListener\("focusin"/);
  assert.match(header, /event\.key === "Escape"/);
  assert.match(header, /setLanguageMenuOpen\(false\)/);
  assert.match(pricingPlatform, /document\.addEventListener\("pointerdown"/);
  assert.match(pricingPlatform, /event\.key === "Escape"/);
  assert.match(pricingPlatform, /setOpen\(false\)/);
});

test("mobile product switcher closes outside and uses current dropdown radius", () => {
  const source = readComponent("MobileProductSwitcher.tsx");

  assert.match(source, /useRef/);
  assert.match(source, /document\.addEventListener\("pointerdown"/);
  assert.match(source, /document\.addEventListener\("focusin"/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /role="menu"/);
  assert.match(source, /role="menuitem"/);
  assert.doesNotMatch(source, /rounded-3xl/);
  assert.doesNotMatch(source, /rounded-2xl/);
  assert.doesNotMatch(source, /rounded-xl/);
  assert.match(source, /rounded-lg border border-zinc-200 bg-white/);
});

test("plan tabs use short labels on narrow screens", () => {
  const planTabs = readComponent("PlanTabs.tsx");
  const segmentedControl = readComponent("ui/SegmentedControl.tsx");

  assert.match(planTabs, /shortLabel/);
  assert.match(planTabs, /getShortPlanName/);
  assert.match(planTabs, /replace\(\/\^\(ChatGPT\|Claude\|Gemini\|Google AI\|Google\)/);
  assert.match(segmentedControl, /sm:hidden/);
  assert.match(segmentedControl, /hidden truncate sm:inline/);
  assert.match(segmentedControl, /relative inline-grid rounded-lg/);
  assert.match(segmentedControl, /const thumbRadius = "rounded-md"/);
  assert.doesNotMatch(segmentedControl, /rounded-xl/);
});

test("expandable region rows are client-side and keep a real toggle state", () => {
  const source = readComponent("AppleStyleExpandableRows.tsx");

  assert.match(source, /"use client"/);
  assert.match(source, /useState\(false\)/);
  assert.match(source, /onClick=\{\(\) => setOpen/);
  assert.match(source, /aria-expanded=\{open\}/);
  assert.match(source, /显示更多/);
});

test("region table risk and tax hints use site styled tooltips", () => {
  const source = readComponent("ExpandableRegionPriceTable.tsx");

  assert.match(source, /function TaxTooltip/);
  assert.match(source, /function RiskStatus/);
  assert.match(source, /role="tooltip"/);
  assert.match(source, /shadow-\[0_18px_50px_rgba\(15,23,42,0\.14\)\]/);
  assert.doesNotMatch(source, /title=\{region\.code\}/);
  assert.doesNotMatch(source, /title=\{countryCode\}/);
  assert.doesNotMatch(source, /title=\{\s*riskNote/);
  assert.doesNotMatch(source, /rounded-full px-1\.5 text-\[11px\] font-medium ring-1 ring-inset xl:inline-flex/);
});

test("price world map filters Antarctica from the rendered geometry", () => {
  const source = readComponent("PriceWorldMap.tsx");

  assert.match(source, /function isAntarcticaFeature/);
  assert.match(source, /id === 10/);
  assert.match(source, /name === "antarctica"/);
  assert.match(source, /features = countries\.features\.filter/);
  assert.match(source, /!isAntarcticaFeature\(featureItem\)/);
});

test("share modal keeps the generated card as the primary preview", () => {
  const source = readComponent("SharePriceModal.tsx");

  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /ref=\{cardRef\}/);
  assert.match(source, /toPng\(cardRef\.current/);
  assert.doesNotMatch(source, /marginBottom/);
  assert.doesNotMatch(source, /transform:\s*['"`]scale/);
  assert.doesNotMatch(source, /142\.86/);
  assert.doesNotMatch(source, /分享 \{product\.name\} 价格/);
  assert.doesNotMatch(source, />分享到</);
  assert.doesNotMatch(source, /min-w-\[86px\] rounded-xl/);
  assert.match(source, /min-w-\[86px\] rounded-lg/);
});

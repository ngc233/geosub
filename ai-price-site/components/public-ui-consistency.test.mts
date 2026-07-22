import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const componentsDir = dirname(fileURLToPath(import.meta.url));

function readComponent(fileName: string) {
  return readFileSync(resolve(componentsDir, fileName), "utf8");
}

test("active public listing cards use the current compact radius system", () => {
  const dbPricingCard = readComponent("DbPricingCard.tsx");
  const brandIcon = readComponent("BrandIcon.tsx");

  assert.match(dbPricingCard, /overflow-hidden rounded-xl border/);
  assert.doesNotMatch(dbPricingCard, /rounded-2xl/);
  assert.doesNotMatch(dbPricingCard, /className="rounded-xl"/);
  assert.doesNotMatch(brandIcon, /rounded-2xl|rounded-3xl/);
});

test("active public map and source filters avoid legacy oversized popovers", () => {
  const map = readComponent("PriceWorldMap.tsx");
  const table = readComponent("ExpandableRegionPriceTable.tsx");

  assert.match(map, /w-64 rounded-lg border border-zinc-200 bg-white/);
  assert.doesNotMatch(map, /w-64 rounded-2xl/);
  assert.match(table, /grid w-full grid-cols-4 rounded-lg/);
  assert.match(table, /absolute bottom-1 top-1 rounded-md/);
  assert.doesNotMatch(table, /grid w-full grid-cols-4 rounded-xl/);
});

test("public pricing interactions emit operational analytics events", () => {
  const dbPricingCard = readComponent("DbPricingCard.tsx");
  const sidebar = readComponent("ProductSidebar.tsx");
  const mobileSwitcher = readComponent("MobileProductSwitcher.tsx");
  const planTabs = readComponent("PlanTabs.tsx");
  const shareModal = readComponent("SharePriceModal.tsx");

  assert.match(dbPricingCard, /data-track-event="click_digital_service_card"/);
  assert.match(sidebar, /data-track-event="click_digital_service_sidebar"/);
  assert.match(mobileSwitcher, /data-track-placement="product_sidebar_mobile"/);
  assert.match(planTabs, /event: "select_plan"/);
  assert.match(shareModal, /data-track-event="open_share_modal"/);
  assert.match(shareModal, /data-track-event="download_share_image"/);
  assert.match(shareModal, /data-track-event="copy_share_link"/);
  assert.match(shareModal, /data-track-event="share_to_social"/);
});

test("English pricing details localize purchasing power and shared controls", () => {
  const affordability = readComponent("AffordabilityComparison.tsx");
  const affordabilityRows = readComponent("ExpandableAffordabilityRows.tsx");
  const pricingView = readComponent("PricingPlatformView.tsx");
  const regionTable = readComponent("ExpandableRegionPriceTable.tsx");
  const worldMap = readComponent("PriceWorldMap.tsx");
  const pricingCopy = readFileSync(
    resolve(componentsDir, "../lib/public-pricing-copy.ts"),
    "utf8",
  );

  assert.match(affordability, /local affordability/);
  assert.match(affordability, /Local subscription burden ranking/);
  assert.match(affordability, /Hardest to afford/);
  assert.match(affordability, /Easiest to afford/);
  assert.match(affordability, /US 1\.00× benchmark/);
  assert.match(affordability, /Income metric:/);
  assert.match(affordability, /setSortMode\(mode\)/);
  assert.doesNotMatch(affordability, /Price × local burden matrix/);
  assert.match(affordabilityRows, /copy\.showMore\(hiddenCount\)/);

  assert.match(pricingView, /getPublicPricingCopy\(locale\)\.pricing/);
  assert.match(regionTable, /getPublicPricingCopy\(locale\)\.table/);
  assert.match(pricingCopy, /No \$\{source\} pricing yet/);
  assert.match(pricingCopy, /No \$\{source\} pricing is available yet/);
  assert.match(pricingCopy, /Risk note: GeoSub presents public price differences/);
  assert.match(pricingCopy, /satisfies Record<SiteLocale, object>/);
  assert.match(worldMap, /getMarkerMeta\(marker\.kind, mapCopy\)/);
});

test("product navigation uses the shared locale dictionary", () => {
  const sidebar = readComponent("ProductSidebar.tsx");
  const mobileSwitcher = readComponent("MobileProductSwitcher.tsx");
  const pricingCopy = readFileSync(
    resolve(componentsDir, "../lib/public-pricing-copy.ts"),
    "utf8",
  );

  assert.match(sidebar, /getPublicPricingCopy\(locale\)\.navigation/);
  assert.match(mobileSwitcher, /getPublicPricingCopy\(locale\)\.navigation/);
  assert.doesNotMatch(sidebar, /locale === "en"/);
  assert.doesNotMatch(mobileSwitcher, /locale === "en"/);
  assert.match(pricingCopy, /currentProduct: "Current product"/);
  assert.match(pricingCopy, /streaming: "流媒体"/);
});

test("public pricing lists use the active locale contract and exact update dates", () => {
  const listing = readComponent("DbAiPricingClient.tsx");
  const card = readComponent("DbPricingCard.tsx");
  const pricingCopy = readFileSync(
    resolve(componentsDir, "../lib/public-pricing-copy.ts"),
    "utf8",
  );
  const adapter = readFileSync(
    resolve(componentsDir, "../lib/db-ai-pricing.ts"),
    "utf8",
  );

  assert.match(listing, /locale: SiteLocale/);
  assert.match(listing, /getPublicPricingCopy\(locale\)\.listing/);
  assert.doesNotMatch(listing, /locale === "en"/);
  assert.match(card, /locale: SiteLocale/);
  assert.match(card, /getPublicPricingCopy\(locale\)\.listing\.card/);
  assert.doesNotMatch(card, /const copy =\s*locale === "en"/);
  assert.match(pricingCopy, /categoryAria: "Digital service category"/);
  assert.match(adapter, /function formatDate\(date: Date\)/);
  assert.match(adapter, /updatedAt: formatDate\(latestDate\)/);
});

test("purchasing power and share cards require active locale coverage", () => {
  const affordability = readComponent("AffordabilityComparison.tsx");
  const affordabilityRows = readComponent("ExpandableAffordabilityRows.tsx");
  const shareModal = readComponent("SharePriceModal.tsx");

  assert.match(affordability, /satisfies Record<SiteLocale, object>/);
  assert.match(affordability, /return affordabilityCopy\[locale\]/);
  assert.match(affordabilityRows, /getPublicPricingCopy\(locale\)\.table/);
  assert.match(shareModal, /satisfies Record<SiteLocale, ShareCopy>/);
  assert.match(shareModal, /text\.comparisonLead/);
  assert.match(shareModal, /\{text\.comparisonTrail\}/);
  assert.match(shareModal, /text\.monthlySuffix/);
  assert.doesNotMatch(shareModal, /locale === 'en'/);
});

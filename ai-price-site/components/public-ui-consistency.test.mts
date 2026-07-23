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
  assert.match(affordability, /showLabel=\{copy\.showMore\(hiddenRows\.length\)\}/);
  assert.match(affordabilityRows, /showLabel=\{showLabel\}/);
  assert.match(affordabilityRows, /hideLabel=\{hideLabel\}/);

  assert.match(pricingView, /getPricingPlatformCopy\(locale\)/);
  assert.match(regionTable, /getRegionPriceTableCopy\(locale\)/);
  assert.match(pricingCopy, /No \$\{source\} pricing yet/);
  assert.match(pricingCopy, /No \$\{source\} pricing is available yet/);
  assert.match(pricingCopy, /Risk note: GeoSub presents public price differences/);
  assert.match(pricingCopy, /LegacyPublicPricingLocale/);
  assert.match(worldMap, /getMarkerMeta\(marker\.kind, mapCopy\)/);
});

test("product navigation uses the shared locale dictionary", () => {
  const sidebar = readComponent("ProductSidebar.tsx");
  const mobileSwitcher = readComponent("MobileProductSwitcher.tsx");
  const pricingCopy = readFileSync(
    resolve(componentsDir, "../lib/product-navigation-copy.ts"),
    "utf8",
  );

  assert.match(sidebar, /getProductNavigationCopy\(locale\)/);
  assert.match(mobileSwitcher, /getProductNavigationCopy\(locale\)/);
  assert.doesNotMatch(sidebar, /locale === "en"/);
  assert.doesNotMatch(mobileSwitcher, /locale === "en"/);
  assert.match(pricingCopy, /currentProduct: "Current product"/);
  assert.match(pricingCopy, /streaming: "ストリーミング"/);
});

test("public pricing lists prepare every v2.1 locale and keep exact update dates", () => {
  const listing = readComponent("DbAiPricingClient.tsx");
  const card = readComponent("DbPricingCard.tsx");
  const listingCopy = readFileSync(
    resolve(componentsDir, "../lib/pricing-list-copy.ts"),
    "utf8",
  );
  const adapter = readFileSync(
    resolve(componentsDir, "../lib/db-ai-pricing.ts"),
    "utf8",
  );

  assert.match(listing, /locale: PreparedSiteLocale/);
  assert.match(listing, /getPricingListCopy\(locale\)/);
  assert.doesNotMatch(listing, /locale === "en"/);
  assert.match(card, /locale: PreparedSiteLocale/);
  assert.match(card, /getPricingListCopy\(locale\)\.card/);
  assert.match(card, /localizeTaxNote\(raw, locale/);
  assert.doesNotMatch(card, /const copy =\s*locale === "en"/);
  assert.match(
    listingCopy,
    /Exclude<PreparedSiteLocale, "zh" \| "en">/,
  );
  for (const locale of ["ja", "ko", "es", "tr", "ar"]) {
    assert.match(listingCopy, new RegExp(`\\n  ${locale}:`));
  }
  assert.match(adapter, /function formatDate\(date: Date\)/);
  assert.match(adapter, /updatedAt: formatDate\(latestDate\)/);
});

test("purchasing power prepares every v2.1 locale while share cards cover active locales", () => {
  const affordability = readComponent("AffordabilityComparison.tsx");
  const affordabilityRows = readComponent("ExpandableAffordabilityRows.tsx");
  const shareModal = readComponent("SharePriceModal.tsx");

  assert.match(
    affordability,
    /satisfies Record<PreparedSiteLocale, AffordabilityCopy>/,
  );
  assert.match(affordability, /return affordabilityCopy\[locale\]/);
  assert.doesNotMatch(affordabilityRows, /getPublicPricingCopy/);
  assert.match(affordability, /formatLocalizedCurrency/);
  assert.match(affordability, /formatLocalizedDate/);
  assert.match(affordability, /formatLocalizedPercent/);
  assert.match(affordability, /getLocalizedRegionName/);
  for (const locale of ["zh", "en", "ja", "ko", "es", "tr", "ar"]) {
    assert.match(affordability, new RegExp(`\\n  ${locale}:`));
  }
  assert.match(shareModal, /satisfies Record<SiteLocale, ShareCopy>/);
  assert.match(shareModal, /text\.comparisonLead/);
  assert.match(shareModal, /\{text\.comparisonTrail\}/);
  assert.match(shareModal, /text\.monthlySuffix/);
  assert.doesNotMatch(shareModal, /locale === 'en'/);
});

test("missing US prices use the actual fallback region instead of a false US label", () => {
  const pricingView = readComponent("PricingPlatformView.tsx");
  const regionTable = readComponent("ExpandableRegionPriceTable.tsx");
  const shareModal = readComponent("SharePriceModal.tsx");

  assert.match(pricingView, /hasUsReference \? copy\.usBase : referenceRegion\.country/);
  assert.match(regionTable, /hasUsReference \? copy\.vsUs : referenceCountry/);
  assert.match(regionTable, /if \(!hasUsReference\)/);
  assert.match(shareModal, /referenceRegion\.code\.toUpperCase\(\) === 'US'/);
});

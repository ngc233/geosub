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
  const pricingCard = readComponent("PricingCard.tsx");
  const dbPricingCard = readComponent("DbPricingCard.tsx");
  const brandIcon = readComponent("BrandIcon.tsx");

  assert.match(pricingCard, /overflow-hidden rounded-xl border/);
  assert.match(dbPricingCard, /overflow-hidden rounded-xl border/);
  assert.doesNotMatch(pricingCard, /rounded-3xl/);
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
  const pricingCard = readComponent("PricingCard.tsx");
  const dbPricingCard = readComponent("DbPricingCard.tsx");
  const sidebar = readComponent("ProductSidebar.tsx");
  const mobileSwitcher = readComponent("MobileProductSwitcher.tsx");
  const planTabs = readComponent("PlanTabs.tsx");
  const shareModal = readComponent("SharePriceModal.tsx");

  assert.match(pricingCard, /data-track-event="click_digital_service_card"/);
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

  assert.match(affordability, /local purchasing power/);
  assert.match(affordability, /Price × local burden matrix/);
  assert.match(affordability, /Highest local burden/);
  assert.match(affordability, /Income metric:/);
  assert.match(affordabilityRows, /Show \$\{hiddenCount\} more regions/);

  assert.match(pricingView, /locale === "en" \? "CNY estimate"/);
  assert.match(pricingView, /No \$\{platformLabel\} pricing yet/);
  assert.match(regionTable, /No \$\{activePlatformLabel\} pricing is available yet/);
  assert.match(regionTable, /Risk note: GeoSub presents public price differences/);
  assert.match(regionTable, /displayCurrency === "cny" && locale === "zh"/);
  assert.match(worldMap, /getMarkerMeta\(marker\.kind, mapCopy\)/);
});

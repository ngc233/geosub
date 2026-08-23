import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const componentsDir = dirname(fileURLToPath(import.meta.url));

function readComponent(fileName: string) {
  return readFileSync(resolve(componentsDir, fileName), "utf8");
}

function readSharePriceModalSource() {
  return [
    "SharePriceModal.tsx",
    "SharePriceCopy.ts",
    "SharePriceMap.tsx",
  ]
    .map(readComponent)
    .join("\n");
}

test("global link defaults do not override button text utilities", () => {
  const globals = readFileSync(resolve(componentsDir, "../app/globals.css"), "utf8");

  assert.match(globals, /@layer base\s*\{\s*a\s*\{/);
  assert.doesNotMatch(globals, /^a\s*\{/m);
});

test("active public listing cards use the current compact radius system", () => {
  const dbPricingCard = readComponent("DbPricingCard.tsx");
  const brandIcon = readComponent("BrandIcon.tsx");

  assert.match(dbPricingCard, /overflow-hidden rounded-lg border/);
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

test("the world map is deferred until the visitor approaches it", () => {
  const pricingView = readComponent("PricingPlatformView.tsx");

  assert.match(pricingView, /dynamic\(\(\) => import\("\.\/PriceWorldMap"\)/);
  assert.match(pricingView, /ssr: false/);
  assert.match(pricingView, /new IntersectionObserver/);
  assert.match(pricingView, /rootMargin: "320px 0px"/);
  assert.match(pricingView, /<DeferredPriceWorldMap/);
});

test("pricing detail selects an available billing platform instead of assuming App Store", () => {
  const pricingView = readComponent("PricingPlatformView.tsx");

  assert.match(pricingView, /const availablePlatforms = new Set\(plan\.regions\.map\(getPlatform\)\)/);
  assert.match(pricingView, /availablePlatforms\.has\("ios"\)/);
  assert.match(pricingView, /availablePlatforms\.has\("web"\)/);
  assert.match(pricingView, /availablePlatforms\.has\("android"\)/);
  assert.doesNotMatch(pricingView, /useState<PlatformFilter>\("ios"\)/);
});

test("public pricing interactions emit operational analytics events", () => {
  const dbPricingCard = readComponent("DbPricingCard.tsx");
  const sidebar = readComponent("ProductSidebar.tsx");
  const mobileSwitcher = readComponent("MobileProductSwitcher.tsx");
  const planTabs = readComponent("PlanTabs.tsx");
  const shareModal = readSharePriceModalSource();

  assert.match(dbPricingCard, /data-track-event="click_digital_service_card"/);
  assert.match(sidebar, /data-track-event="click_digital_service_sidebar"/);
  assert.match(mobileSwitcher, /data-track-placement="product_sidebar_mobile"/);
  assert.match(planTabs, /event: "select_plan"/);
  assert.match(shareModal, /data-track-event="open_share_modal"/);
  assert.match(shareModal, /data-track-event="download_share_image"/);
  assert.match(shareModal, /data-track-event="copy_share_link"/);
  assert.match(shareModal, /data-track-event="share_to_social"/);
});

test("desktop product sidebar scrolls independently inside the viewport", () => {
  const sidebar = readComponent("ProductSidebar.tsx");
  const globalStyles = readFileSync(
    resolve(componentsDir, "../app/globals.css"),
    "utf8",
  );

  assert.match(sidebar, /gs-product-sidebar-scroll/);
  assert.match(sidebar, /max-h-\[calc\(100dvh-7rem\)\]/);
  assert.match(sidebar, /overflow-y-auto/);
  assert.match(sidebar, /overscroll-contain/);
  assert.match(globalStyles, /\.gs-product-sidebar-scroll/);
  assert.match(globalStyles, /scrollbar-gutter: stable/);
  assert.match(globalStyles, /scrollbar-width: thin/);
});

test("mobile product navigation and hero actions remain coherent in dark mode", () => {
  const mobileSwitcher = readComponent("MobileProductSwitcher.tsx");
  const pricingDetail = readComponent("PricingDetailPage.tsx");

  assert.match(mobileSwitcher, /dark:border-zinc-800 dark:bg-zinc-900\/90/);
  assert.match(mobileSwitcher, /dark:bg-zinc-800 dark:text-zinc-300/);
  assert.match(mobileSwitcher, /dark:bg-lime-500\/10 dark:text-white dark:ring-lime-500\/25/);
  assert.match(mobileSwitcher, /dark:hover:bg-zinc-800 dark:hover:text-white/);
  assert.match(pricingDetail, /dark:bg-zinc-900 dark:text-zinc-300/);
  assert.match(pricingDetail, /hover:border-zinc-200 hover:text-zinc-950 hover:shadow-md/);
});

test("English pricing details localize purchasing power and shared controls", () => {
  const affordability = readComponent("AffordabilityComparison.tsx");
  const affordabilityRows = readComponent("ExpandableAffordabilityRows.tsx");
  const pricingView = readComponent("PricingPlatformView.tsx");
  const publicPage = readComponent("ui/PublicPage.tsx");
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
  assert.match(affordability, /embedded\?: boolean/);
  assert.match(affordability, /className="md:hidden"/);
  assert.match(affordability, /className="hidden md:block"/);
  assert.match(affordability, /bg-\[#84cc16\]/);
  assert.match(affordability, /bg-\[#c56550\]/);
  assert.doesNotMatch(affordability, /bg-sky-500/);
  assert.doesNotMatch(affordability, /bg-orange-500/);
  assert.match(affordabilityRows, /showLabel=\{showLabel\}/);
  assert.match(affordabilityRows, /hideLabel=\{hideLabel\}/);

  assert.match(pricingView, /getPricingPlatformCopy\(locale\)/);
  assert.match(regionTable, /getRegionPriceTableCopy\(locale\)/);
  assert.match(pricingCopy, /No \$\{source\} pricing yet/);
  assert.match(pricingCopy, /No \$\{source\} pricing is available yet/);
  assert.match(pricingCopy, /Access note: GeoSub shows only verifiable public facts/);
  assert.match(pricingCopy, /Unknown conditions are not inferred as available/);
  assert.doesNotMatch(pricingCopy, /Risk note:/);
  assert.match(pricingCopy, /LegacyPublicPricingLocale/);
  assert.match(worldMap, /getGeoPriceFill/);
  assert.match(worldMap, /data-detail-geo-pricing/);
  assert.match(worldMap, /text-\[#a24b3a\]/);
  assert.match(worldMap, /text-lime-600/);
  assert.match(regionTable, /text-\[#3f7d20\]/);
  assert.match(regionTable, /text-\[#a24b3a\]/);
  assert.match(regionTable, /bg-\[#84cc16\]/);
  assert.match(regionTable, /bg-\[#c56550\]/);
  assert.match(regionTable, /data-region-price-converted/);
  assert.match(publicPage, /tone === "premium"/);
  assert.match(worldMap, /grid overflow-hidden rounded-xl border border-zinc-200 bg-white/);
  assert.match(worldMap, /border-t border-zinc-200 bg-white p-4/);
  assert.match(worldMap, /data-detail-map-pin/);
  assert.doesNotMatch(worldMap, /geosub-map-pulse|from-green-600|to-red-600/);
});

test("public action controls use standard icons instead of arrow glyphs", () => {
  const pricingDetail = readComponent("PricingDetailPage.tsx");
  const traditionalPages = readComponent("TraditionalChinesePages.tsx");
  const europeanPages = readComponent("EuropeanLocalePages.tsx");

  assert.match(pricingDetail, /Download aria-hidden="true"/);
  assert.match(pricingDetail, /ExternalLink aria-hidden="true"/);
  assert.equal(
    pricingDetail.match(/<ExternalLink aria-hidden="true"/g)?.length,
    2,
    "product overview and plan detail official links must use the same standard icon",
  );
  assert.match(pricingDetail, /ArrowLeft aria-hidden="true"/);
  assert.match(pricingDetail, /ChevronDown/);
  assert.doesNotMatch(pricingDetail, /<span aria-hidden="true">[↓←→↗]<\/span>/);
  assert.match(traditionalPages, /<ArrowRight aria-hidden="true"/);
  assert.match(europeanPages, /<ArrowRight aria-hidden="true"/);
});

test("public navigation and sharing controls use maintained icon sets", () => {
  const header = readComponent("Header.tsx");
  const rankings = readComponent("AiToolRankingsView.tsx");
  const shareModal = readComponent("SharePriceModal.tsx");
  const detailCopy = readFileSync(
    resolve(componentsDir, "../lib/pricing-detail-page-copy.ts"),
    "utf8",
  );

  assert.match(header, /import \{ ChevronDown, Menu, X \} from "lucide-react"/);
  assert.doesNotMatch(header, /function ChevronIcon[\s\S]*?<svg/);
  assert.match(rankings, /<ChevronDown/);
  assert.doesNotMatch(rankings, /group-open:hidden">\+<\/span>/);
  assert.match(shareModal, /siReddit, siTelegram/);
  assert.match(shareModal, /<Download aria-hidden="true"/);
  assert.match(shareModal, /<Share aria-hidden="true"/);
  assert.match(shareModal, /data-share-price-trigger/);
  assert.match(shareModal, /data-share-price-trigger[\s\S]*?className="inline-flex h-9[^\n]*border-zinc-200 bg-white/);
  assert.doesNotMatch(shareModal, /<Share2|border-lime-300 bg-lime-50/);
  assert.doesNotMatch(detailCopy, /visitOfficial: .*↗/);
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
  assert.match(listing, /getPricingDetailPath/);
  assert.match(listing, /按产品查看全部套餐/);
  assert.match(listing, /filteredProducts\.map\(\(product\) =>/);
  assert.doesNotMatch(listing, /locale === "en"/);
  assert.match(card, /locale: PreparedSiteLocale/);
  assert.match(card, /getPricingListCopy\(locale\)\.card/);
  assert.match(card, /copy\.comparison/);
  assert.match(card, /comparisonPercent\(region\.priceUsd, comparisonReference\.priceUsd\)/);
  assert.doesNotMatch(card, /localizeTaxNote/);
  assert.doesNotMatch(card, /const copy =\s*locale === "en"/);
  assert.match(
    listingCopy,
    /Exclude<PreparedSiteLocale, "zh" \| "zh-tw" \| "en">/,
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
  const shareModal = readSharePriceModalSource();

  assert.match(affordability, /"zh-tw": \{/);
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
  assert.match(shareModal, /"zh-tw": \{/);
  assert.match(
    shareModal,
    /satisfies Record<SiteLocale, ShareCopy>/,
  );
  assert.match(shareModal, /text\.tiedCheapestRegion/);
  assert.match(shareModal, /text\.highestRegion/);
  assert.match(shareModal, /text\.maxSpread/);
  assert.match(shareModal, /text\.priceSource/);
  assert.match(shareModal, /text\.coverage/);
  assert.match(shareModal, /text\.fxDate/);
  assert.doesNotMatch(shareModal, /locale === 'en'/);
});

test("pricing pressure views are shared and localized across prepared locales", () => {
  const detailPage = readComponent("PricingDetailPage.tsx");
  const switcher = readComponent("PricingPressureSwitcher.tsx");
  const pressureCopy = readFileSync(resolve(componentsDir, "../lib/pricing-pressure-copy.ts"), "utf8");

  assert.match(detailPage, /<PricingPressureSwitcher/);
  assert.match(detailPage, /locale=\{locale\}/);
  assert.match(detailPage, /priceView=\{\(/);
  assert.match(detailPage, /burdenView=\{affordability\.rows\.length > 0/);
  assert.match(detailPage, /matrixView=\{affordability\.rows\.length > 0/);
  assert.match(detailPage, /function PriceBurdenMatrix/);
  assert.match(detailPage, /getPricingPressureCopy\(locale\)/);
  assert.match(detailPage, /referenceRow/);
  assert.doesNotMatch(detailPage, /locale === "zh" \? \(\s*<PricingPressureSwitcher/);
  assert.match(switcher, /role="tablist"/);
  assert.match(switcher, /getPricingPressureCopy\(locale\)/);
  assert.match(switcher, /copy\.tabs\.price/);
  assert.match(switcher, /copy\.tabs\.burden/);
  assert.match(switcher, /copy\.tabs\.matrix/);
  assert.match(switcher, /disabled=\{!available\}/);
  assert.match(pressureCopy, /satisfies Record<SiteLocale, PricingPressureCopy>/);
  for (const locale of ["zh", "zh-tw", "en", "ja", "ko", "es", "tr", "ar", "fr", "it", "de", "pt"]) {
    const localePattern = locale === "zh-tw" ? /\n  "zh-tw":/ : new RegExp(`\\n  ${locale}:`);
    assert.match(pressureCopy, localePattern);
  }
});

test("missing US prices use the actual fallback region instead of a false US label", () => {
  const pricingView = readComponent("PricingPlatformView.tsx");
  const regionTable = readComponent("ExpandableRegionPriceTable.tsx");
  const shareModal = readSharePriceModalSource();

  assert.match(pricingView, /hasUsReference \? copy\.usBase : referenceRegion\.country/);
  assert.match(regionTable, /hasUsReference \? copy\.vsUs : referenceCountry/);
  assert.match(regionTable, /if \(!hasUsReference\)/);
  assert.match(shareModal, /referenceRegion\.code\.toUpperCase\(\) === 'US'/);
});

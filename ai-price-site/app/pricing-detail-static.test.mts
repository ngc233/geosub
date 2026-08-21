import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { getPlanDisplayName } from "../lib/pricing-labels.ts";
import {
  getLegacyPricingPlanRedirectPath,
  getPricingDetailPath,
  getPricingLanguageAlternates,
  getPricingListPath,
  getPricingPlanPath,
  stripGeoSubTitleSuffix,
} from "../lib/pricing-routes.ts";
import {
  siteLocaleDefinitions,
  supportedSiteLocales,
} from "../lib/site-locale.ts";
import {
  getLocaleRobotsPolicy,
  seoIndexableLocales,
} from "../lib/seo-indexing-policy.ts";

const appDir = dirname(fileURLToPath(import.meta.url));

function readAppFile(...segments: string[]) {
  return readFileSync(resolve(appDir, ...segments), "utf8");
}

function readSharePriceModalSource() {
  return [
    "SharePriceModal.tsx",
    "SharePriceCopy.ts",
    "SharePriceMap.tsx",
  ]
    .map((fileName) => readAppFile("..", "components", fileName))
    .join("\n");
}

test("legacy pricing plan queries resolve to canonical plan routes", () => {
  assert.equal(
    getLegacyPricingPlanRedirectPath("/en/ai-pricing/chatgpt", "pro-5x"),
    "/en/ai-pricing/chatgpt/pro-5x",
  );
  assert.equal(
    getLegacyPricingPlanRedirectPath(
      "/zh/streaming-pricing/netflix/",
      "premium",
    ),
    "/zh/streaming-pricing/netflix/premium",
  );

  for (const locale of supportedSiteLocales) {
    assert.equal(
      getLegacyPricingPlanRedirectPath(
        `/${locale}/ai-pricing/chatgpt`,
        "plus",
      ),
      `/${locale}/ai-pricing/chatgpt/plus`,
    );
  }

  assert.equal(
    getLegacyPricingPlanRedirectPath("/en/ai-pricing/chatgpt/plus", "plus"),
    null,
  );
  assert.equal(
    getLegacyPricingPlanRedirectPath("/en/guides/chatgpt", "plus"),
    null,
  );
  assert.equal(
    getLegacyPricingPlanRedirectPath("/en/ai-pricing/chatgpt", "../plus"),
    null,
  );
  assert.equal(
    getLegacyPricingPlanRedirectPath(
      "/en/streaming-pricing/disney",
      "maandabonnement",
    ),
    null,
  );
  assert.equal(
    getLegacyPricingPlanRedirectPath(
      "/en/streaming-pricing/disney",
      "plus",
    ),
    null,
  );
  assert.equal(
    getLegacyPricingPlanRedirectPath(
      "/en/ai-pricing/chatgpt",
      "pro-20x",
    ),
    "/en/ai-pricing/chatgpt/pro",
  );
});

const badEncodingTokens = [
  "鈫",
  "鈱",
  "�",
  "鍏ㄧ",
  "鎸夊",
  "浠锋牸",
  "璁㈤槄",
];

test("pricing detail pages keep product navigation database-driven", () => {
  for (const locale of ["zh", "en"]) {
    const page = readAppFile(locale, "ai-pricing", "[slug]", "page.tsx");

    assert.match(page, /export const revalidate = 1800/);
    assert.doesNotMatch(page, /force-dynamic/);
    assert.match(page, /import PricingDetailPage/);
    assert.match(page, new RegExp(`locale="${locale}"`));
    assert.match(page, /routeCategory="ai"/);
  }

  const sharedPage = readAppFile("..", "components", "PricingDetailPage.tsx");
  assert.match(sharedPage, /async function getProductNavItems/);
  assert.match(sharedPage, /prisma\.product\.findMany/);
  assert.match(sharedPage, /status:\s*"PUBLISHED"/);
  assert.match(sharedPage, /plans:\s*\{\s*some:/);
  assert.match(sharedPage, /regionPrices:\s*\{\s*some:/);
  assert.match(sharedPage, /sortOrder: "asc"/);
  assert.match(sharedPage, /logoUrl: true/);
  assert.match(sharedPage, /officialUrl: true/);
  assert.match(sharedPage, /products=\{sidebarProducts\}/);
  assert.doesNotMatch(sharedPage, /from "next\/headers"/);
  assert.match(sharedPage, /product\.category !== routeCategory/);
  assert.match(sharedPage, /!routePlanSlug/);

  const streamingPage = readAppFile(
    "en",
    "streaming-pricing",
    "[slug]",
    "page.tsx",
  );
  assert.match(streamingPage, /routeCategory="streaming"/);
  assert.doesNotMatch(streamingPage, /ai-pricing\/\[slug\]\/page/);
});

test("public pricing detail reads use bounded shared caches and batch exchange rates", () => {
  const detailPage = readAppFile("..", "components", "PricingDetailPage.tsx");
  const cachePolicy = readAppFile("..", "lib", "public-pricing-cache.ts");
  const navigation = readAppFile("..", "lib", "site-navigation.ts");

  assert.match(detailPage, /unstable_cache/);
  assert.match(detailPage, /getLatestUsdExchangeRates\(supportedDisplayCurrencies\)/);
  assert.doesNotMatch(detailPage, /getLatestExchangeRate\("USD", currency\)/);
  assert.match(detailPage, /getPublicPricingProductCacheTag\(slug\)/);
  assert.match(cachePolicy, /PUBLIC_PRICING_REVALIDATE_SECONDS = 30 \* 60/);
  assert.match(cachePolicy, /PUBLIC_EXCHANGE_RATE_REVALIDATE_SECONDS = 60 \* 60/);
  assert.match(navigation, /unstable_cache/);
  assert.doesNotMatch(navigation, /unstable_noStore|noStore\(/);
});

test("price publishing actions invalidate public pricing caches", () => {
  const reviewActions = readAppFile("admin", "review", "actions.ts");
  const collectionRunner = readAppFile("admin", "review", "collection-runner.ts");
  const productActions = readAppFile("admin", "products", "actions.ts");
  const exchangeRoute = readAppFile("api", "cron", "exchange-rates", "route.ts");

  assert.match(reviewActions, /getObservationProductSlug/);
  assert.match(reviewActions, /invalidatePublicPricing\(productSlug\)/);
  assert.match(reviewActions, /invalidatePublicPricing\(\)/);
  assert.match(collectionRunner, /invalidatePublicPricing\(productSlug \|\| null\)/);
  assert.match(productActions, /invalidatePublicPricing\(product\.slug\)/);
  assert.match(exchangeRoute, /revalidateTag\(PUBLIC_EXCHANGE_RATE_CACHE_TAG, "max"\)/);
});

test("database-only streaming products keep their real category on detail pages", () => {
  const adapter = readAppFile("..", "lib", "pricing-detail-adapter.ts");

  assert.match(adapter, /p\.category::text AS product_category/);
  assert.match(adapter, /p\.provider AS product_provider/);
  assert.match(adapter, /p\.description AS product_description/);
  assert.match(adapter, /p\.official_url AS product_official_url/);
  assert.match(adapter, /firstRow\.product_category === "streaming"/);
  assert.match(adapter, /p\.status = 'published'/);
  assert.doesNotMatch(adapter, /subscriptionPricingData/);
  assert.doesNotMatch(adapter, /staticProduct/);
});

test("public pricing products require published product, plan and price state", () => {
  const listAdapter = readAppFile("..", "lib", "db-ai-pricing.ts");
  const defaultPlan = readAppFile("..", "lib", "db-pricing-types.ts");

  assert.match(listAdapter, /status:\s*"PUBLISHED"/);
  assert.match(listAdapter, /plans:\s*\{\s*some:/);
  assert.match(listAdapter, /regionPrices:\s*\{\s*some:/);
  assert.doesNotMatch(listAdapter, /productDisplayNameMap/);
  assert.match(defaultPlan, /plan\.indexingStatus === "current"/);
  assert.match(defaultPlan, /\|\|\s*product\.plans\[0\]/);
  assert.doesNotMatch(defaultPlan, /featuredPlanByProduct/);
});

test("public pricing runtime does not import the legacy static product catalog", () => {
  const runtimeFiles = [
    readAppFile("..", "components", "PricingDetailPage.tsx"),
    readAppFile("..", "lib", "pricing-detail-adapter.ts"),
    readAppFile("..", "components", "PricingPlatformView.tsx"),
  ];

  for (const source of runtimeFiles) {
    assert.doesNotMatch(source, /data\/ai-pricing/);
    assert.match(source, /public-pricing-model/);
  }
});

test("priority product guidance is rendered on public detail pages", () => {
  const detailPage = readAppFile("..", "components", "PricingDetailPage.tsx");
  const topicLinks = readAppFile("..", "components", "PricingTopicLinks.tsx");
  const editorialSection = readAppFile(
    "..",
    "components",
    "ProductEditorialSection.tsx",
  );

  assert.match(detailPage, /getProductEditorialContent/);
  assert.match(detailPage, /getPlanEditorialIndexingStatus/);
  assert.match(detailPage, /<ProductEditorialSection/);
  assert.match(detailPage, /planName=\{activePlan\.name\}/);
  assert.match(editorialSection, /content\.plan\.bestFor/);
  assert.match(editorialSection, /content\.plan\.difference/);
  assert.match(editorialSection, /content\.plan\.availabilityNote/);
  assert.match(editorialSection, /GitCompareArrows/);
  assert.match(editorialSection, /UserRound/);
  assert.match(editorialSection, /TrackedLink/);
  assert.match(detailPage, /<RelatedPlanChoices/);
  assert.match(topicLinks, /getPlanEditorialIndexingStatus/);
  assert.match(topicLinks, /=== "current"/);
  assert.match(topicLinks, /getPricingPlanPath/);
});

test("approved country analyses are discoverable from product detail pages", () => {
  const detailPage = readAppFile("..", "components", "PricingDetailPage.tsx");
  const countryPilots = readAppFile("..", "lib", "country-page-pilot.ts");

  assert.match(detailPage, /function CountryAnalysisLinks/);
  assert.match(detailPage, /getIndexApprovedCountryPagePilots/);
  assert.match(detailPage, /getCountryPagePilotPath/);
  assert.match(detailPage, /eventKey="click_country"/);
  assert.match(detailPage, /placement="product_country_analysis"/);
  assert.match(countryPilots, /countryPageIndexApprovals/);
  assert.match(
    countryPilots,
    /prevents catalog growth[\s\S]*multiplying the[\s\S]*sitemap/,
  );
});

test("product overview and related pricing links expose clear next actions", () => {
  const planOverview = readAppFile(
    "..",
    "components",
    "ProductPlanOverview.tsx",
  );
  const topicLinks = readAppFile("..", "components", "PricingTopicLinks.tsx");

  assert.match(planOverview, /min-h-11/);
  assert.match(planOverview, /border-lime-300/);
  assert.match(planOverview, /copy\.viewPlan/);
  assert.match(planOverview, /copy\.regions\(plan\.regions\.length\)/);
  assert.match(topicLinks, /productAction/);
  assert.match(topicLinks, /min-h-16/);
  assert.match(topicLinks, /hover:border-lime-400/);
});

test("pricing detail pages keep AI and streaming paths synchronized", () => {
  const sharedPage = readAppFile("..", "components", "PricingDetailPage.tsx");

  assert.match(sharedPage, /detailBasePath =/);
  assert.match(sharedPage, /getPricingListPath\(locale, product\.category\)/);
  assert.match(sharedPage, /href=\{detailBasePath\}/);
  assert.match(sharedPage, /basePath=\{detailBasePath\}/);

  assert.equal(getPricingListPath("zh", "ai"), "/zh/ai-pricing");
  assert.equal(getPricingListPath("en", "streaming"), "/en/streaming-pricing");
  assert.equal(
    getPricingListPath("zh", "STREAMING"),
    "/zh/streaming-pricing",
  );
  assert.equal(
    getPricingDetailPath("zh", "streaming", "netflix"),
    "/zh/streaming-pricing/netflix",
  );
  assert.equal(
    getPricingPlanPath("zh", "streaming", "netflix", "premium"),
    "/zh/streaming-pricing/netflix/premium",
  );
});

test("pricing plans use stable paths and preserve old links with permanent redirects", () => {
  const planTabs = readAppFile("..", "components", "PlanTabs.tsx");

  for (const locale of ["zh", "en"]) {
    const streamingPage = readAppFile(
      locale,
      "streaming-pricing",
      "[slug]",
      "page.tsx",
    );

    assert.match(streamingPage, /getPricingDetailMetadata/);
    assert.match(streamingPage, /routeCategory="streaming"/);
    assert.doesNotMatch(streamingPage, /ai-pricing\/\[slug\]\/page/);
    assert.doesNotMatch(streamingPage, /redirect\(/);
  }

  for (const locale of supportedSiteLocales) {
    const aiPlanPage = readAppFile(
      locale,
      "ai-pricing",
      "[slug]",
      "[plan]",
      "page.tsx",
    );
    const streamingPlanPage = readAppFile(
      locale,
      "streaming-pricing",
      "[slug]",
      "[plan]",
      "page.tsx",
    );

    assert.match(aiPlanPage, /generateMetadata, default/);
    assert.match(streamingPlanPage, /generateMetadata, default/);
  }

  assert.match(planTabs, /getPricingPlanPath/);
  assert.doesNotMatch(planTabs, /\?plan=/);

  const detailPage = readAppFile("..", "components", "PricingDetailPage.tsx");
  assert.match(detailPage, /getPricingPlanPath/);
  assert.match(detailPage, /getPricingDetailPath/);
  assert.match(detailPage, /permanentRedirect\(productCanonicalPath\)/);
  assert.match(detailPage, /if \(resolvedSearchParams\.plan\)/);
  assert.doesNotMatch(
    detailPage,
    /!routePlanSlug[\s\S]{0,120}permanentRedirect\(canonicalDetailPath\)/,
  );
  assert.doesNotMatch(detailPage, /encodeURIComponent\(resolvedSearchParams\.plan\)/);
});

test("pricing detail metadata owns canonical paths without duplicating the site name", () => {
  assert.equal(stripGeoSubTitleSuffix("Netflix Prices - GeoSub"), "Netflix Prices");
  assert.equal(stripGeoSubTitleSuffix("Netflix Prices"), "Netflix Prices");

  const page = readAppFile("..", "components", "PricingDetailPage.tsx");
  assert.match(page, /canonical:/);
  assert.match(page, /getPricingLanguageAlternates/);
  assert.doesNotMatch(page, /title:\s*`[^`]+ - GeoSub`/);
});

test("pricing hreflang alternates follow the active locale registry", () => {
  const listAlternates = getPricingLanguageAlternates("zh", "ai");
  const detailAlternates = getPricingLanguageAlternates(
    "en",
    "streaming",
    "netflix",
  );
  const planAlternates = getPricingLanguageAlternates(
    "zh",
    "streaming",
    "netflix",
    "premium",
  );

  assert.ok(listAlternates);
  assert.ok(detailAlternates);
  assert.ok(planAlternates);

  for (const locale of seoIndexableLocales) {
    const htmlLang = siteLocaleDefinitions[locale].htmlLang;

    assert.equal(
      listAlternates[htmlLang],
      getPricingListPath(locale, "ai"),
    );
    assert.equal(
      detailAlternates[htmlLang],
      getPricingDetailPath(locale, "streaming", "netflix"),
    );
    assert.equal(
      planAlternates[htmlLang],
      getPricingPlanPath(locale, "streaming", "netflix", "premium"),
    );
  }

  assert.equal(listAlternates["x-default"], "/en/ai-pricing");
  assert.equal(
    detailAlternates["x-default"],
    "/en/streaming-pricing/netflix",
  );
  assert.equal(
    planAlternates["x-default"],
    "/en/streaming-pricing/netflix/premium",
  );
  assert.equal(
    Object.keys(listAlternates).length,
    seoIndexableLocales.length + 1,
  );
  assert.equal(getPricingLanguageAlternates("ja", "ai"), undefined);
  assert.ok(supportedSiteLocales.length > seoIndexableLocales.length);
});

test("staged pricing locales stay accessible but are temporarily noindex", () => {
  assert.deepEqual(getLocaleRobotsPolicy("zh"), {
    index: true,
    follow: true,
  });
  assert.deepEqual(getLocaleRobotsPolicy("en"), {
    index: true,
    follow: true,
  });
  assert.deepEqual(getLocaleRobotsPolicy("ja"), {
    index: false,
    follow: true,
  });

  const detailPage = readAppFile("..", "components", "PricingDetailPage.tsx");
  const listSeo = readAppFile("..", "lib", "pricing-list-seo.ts");
  const rootLayout = readAppFile("layout.tsx");
  const converterPage = readAppFile(
    "..",
    "components",
    "CurrencyConverterPage.tsx",
  );
  assert.match(detailPage, /const robots = getProductRobotsPolicy\(/);
  assert.doesNotMatch(detailPage, /getLocaleRobotsPolicy/);
  assert.match(listSeo, /robots: getLocaleRobotsPolicy\(locale\)/);
  assert.match(rootLayout, /const robotsPolicy = getLocaleRobotsPolicy\(locale\)/);
  assert.match(rootLayout, /\.\.\.robotsPolicy/);
  assert.match(converterPage, /const robots = getLocaleRobotsPolicy\(locale\)/);
});

test("legacy renewal plans are noindex even while product quality is observed", () => {
  const detailPage = readAppFile("..", "components", "PricingDetailPage.tsx");

  assert.match(detailPage, /const robots = getProductRobotsPolicy\(/);
  assert.match(detailPage, /\.\.\.\(robots\.index[\s\S]*?languages:/);
  assert.match(
    detailPage,
    /getPlanEditorialIndexingStatus\(product\.slug, activePlan\.slug\)/,
  );
  assert.doesNotMatch(
    detailPage,
    /: getLocaleRobotsPolicy\(locale\)/,
  );
});

test("product navigation points to the self-canonical product overview", () => {
  const detailPage = readAppFile("..", "components", "PricingDetailPage.tsx");
  const sidebar = readAppFile("..", "components", "ProductSidebar.tsx");
  const topicLinks = readAppFile("..", "components", "PricingTopicLinks.tsx");
  const planOverview = readAppFile("..", "components", "ProductPlanOverview.tsx");

  assert.match(detailPage, /<ProductPlanOverview product=\{product\} locale=\{locale\} \/>/);
  assert.match(detailPage, /<ProductOverviewLink[\s\S]*?href=\{productCanonicalPath\}/);
  assert.match(detailPage, /<RelatedPricingProducts[\s\S]*?products=\{sidebarProducts\}/);
  assert.doesNotMatch(detailPage, /defaultPlanSlug:/);
  assert.doesNotMatch(sidebar, /defaultPlanSlug/);
  assert.match(sidebar, /`\$\{path\}\/\$\{product\.slug\}`/);
  assert.match(topicLinks, /product\.slug !== currentSlug/);
  assert.match(topicLinks, /product\.category === category/);
  assert.match(topicLinks, /\.slice\(0, 4\)/);
  assert.match(topicLinks, /locale === "zh" \|\| locale === "en"/);
  assert.match(topicLinks, /getProductHref\(product, basePath\)/);
  assert.match(planOverview, /data-track-event="select_plan"/);
  assert.match(planOverview, /data-track-placement="product_overview_card"/);
  assert.match(planOverview, /data-track-button=\{`\$\{product\.slug\}:\$\{plan\.slug\}`\}/);
});

test("pricing detail pages do not contain mojibake text tokens", () => {
  const pages = [
    readAppFile("..", "components", "PricingDetailPage.tsx"),
    readAppFile("zh", "ai-pricing", "[slug]", "page.tsx"),
    readAppFile("en", "ai-pricing", "[slug]", "page.tsx"),
  ];

  for (const page of pages) {
    for (const token of badEncodingTokens) {
      assert.doesNotMatch(page, new RegExp(token));
    }
  }
});

test("pricing detail labels avoid duplicated product and plan names", () => {
  assert.equal(getPlanDisplayName("ChatGPT", "ChatGPT Plus"), "ChatGPT Plus");
  assert.equal(getPlanDisplayName("Netflix", "Premium"), "Netflix Premium");
  assert.equal(getPlanDisplayName("Google AI", "Google AI Pro"), "Google AI Pro");

  const detailPage = readAppFile("..", "components", "PricingDetailPage.tsx");
  const platformView = readAppFile("..", "components", "PricingPlatformView.tsx");
  const shareModal = readSharePriceModalSource();
  const pricingCopy = readAppFile("..", "lib", "public-pricing-copy.ts");
  const pageCopy = readAppFile("..", "lib", "pricing-detail-page-copy.ts");

  assert.match(detailPage, /import \{ getPricingDetailPageCopy \}/);
  assert.match(pageCopy, /const name = getPlanDisplayName\(productName, planName\)/);
  assert.match(platformView, /const planDisplayName = getPlanDisplayName\(productName, plan\.name\)/);
  assert.match(platformView, /copy\.conclusionTitle\(planDisplayName\)/);
  assert.match(pricingCopy, /\$\{planName\} 全球价格结论/);
  assert.match(pricingCopy, /\$\{planName\} global price conclusion/);
  assert.match(shareModal, /const planDisplayName = getPlanDisplayName\(product\.name, plan\.name\)/);
  assert.match(shareModal, /import type \{ SiteLocale \} from '\.\.\/lib\/site-locale'/);
  assert.match(shareModal, /"zh-tw": \{/);
  assert.match(
    shareModal,
    /satisfies Record<SiteLocale, ShareCopy>/,
  );
  assert.match(shareModal, /Share price card/);
  assert.match(platformView, /<SharePriceModal[\s\S]*locale=\{locale\}/);
  assert.match(detailPage, /const pageCopy = getPricingDetailPageCopy/);
  assert.match(detailPage, /: pageCopy\.pageTitle/);
  assert.doesNotMatch(detailPage, /\$\{productName\} Plus 订阅/);
  assert.doesNotMatch(platformView, /\$\{productName\} \$\{plan\.name\}/);
  assert.doesNotMatch(shareModal, /\$\{product\.name\} \$\{plan\.name\}/);
});

test("pricing detail sends product identity once to the pricing client boundary", () => {
  const detailPage = readAppFile("..", "components", "PricingDetailPage.tsx");
  const platformView = readAppFile("..", "components", "PricingPlatformView.tsx");
  const shareModal = readSharePriceModalSource();

  assert.doesNotMatch(shareModal, /SubscriptionProduct/);
  assert.doesNotMatch(detailPage, /<SharePriceModal/);
  assert.match(
    detailPage,
    /<PricingPlatformView[\s\S]*shareProduct=\{\{[\s\S]*name: product\.name,[\s\S]*slug: product\.slug,[\s\S]*brand: product\.brand,[\s\S]*updatedAt: product\.updatedAt,[\s\S]*\}\}/,
  );
  assert.match(platformView, /stats=\{getPlanStats\(plan\)\}/);
  assert.doesNotMatch(detailPage, /<BrandIcon product=\{product\}/);
  assert.match(
    detailPage,
    /<BrandIcon[\s\S]*product=\{\{[\s\S]*slug: product\.slug,[\s\S]*name: product\.name,[\s\S]*logoUrl: product\.logoUrl,[\s\S]*officialUrl: product\.officialUrl,[\s\S]*\}\}/,
  );
});

test("pricing FAQs answer customer questions instead of explaining internal source policy", () => {
  const detailPage = readAppFile("..", "components", "PricingDetailPage.tsx");
  const pageCopy = readAppFile("..", "lib", "pricing-detail-page-copy.ts");

  assert.match(pageCopy, /价格是否含税/);
  assert.match(pageCopy, /可以直接购买最便宜地区/);
  assert.match(pageCopy, /地区价格多久更新一次/);
  assert.match(pageCopy, /stats\?\.minRegion\.country/);
  assert.doesNotMatch(pageCopy, /本页追踪的是 App Store 价格/);

  assert.match(pageCopy, /Does the displayed.*price include tax/);
  assert.match(pageCopy, /Can I subscribe.*through the cheapest region/);
  assert.match(pageCopy, /How often are.*regional prices updated/);
  assert.doesNotMatch(pageCopy, /Does this page rank App Store/);
  assert.match(detailPage, /getPlanSearchIntentCopy/);
  assert.match(detailPage, /const effectiveFaqs = searchIntentCopy/);
  assert.match(detailPage, /faqs: effectiveFaqs/);
  assert.match(detailPage, /faqs=\{effectiveFaqs\}/);
});

test("pricing detail forwards the current locale to affordability content", () => {
  const detailPage = readAppFile("..", "components", "PricingDetailPage.tsx");

  assert.match(
    detailPage,
    /<AffordabilityComparison[\s\S]*locale=\{locale\}/,
  );
  assert.doesNotMatch(detailPage, /<AffordabilityComparison[\s\S]*locale="zh"/);
});

test("pricing detail page copy is complete for every v2.1 prepared locale", () => {
  const pageCopy = readAppFile("..", "lib", "pricing-detail-page-copy.ts");

  assert.match(pageCopy, /"zh-tw": \{/);
  assert.match(
    pageCopy,
    /Record<PreparedSiteLocale, StaticDetailCopy>/,
  );
  assert.match(pageCopy, /const templates: Record<PreparedSiteLocale, string>/);
  assert.match(pageCopy, /const descriptions: Record<PreparedSiteLocale, string>/);
  assert.match(pageCopy, /const faqByLocale: Record<PreparedSiteLocale, PricingFaq\[\]>/);

  for (const locale of ["zh", "en", "ja", "ko", "es", "tr", "ar"]) {
    assert.match(pageCopy, new RegExp(`\\n  ${locale}:`));
  }
});

test("pricing detail freshness follows the active plan and trusted matching observations", () => {
  const platformView = readAppFile("..", "components", "PricingPlatformView.tsx");
  const adapter = readAppFile("..", "lib", "pricing-detail-adapter.ts");
  const shareModal = readSharePriceModalSource();
  const pricingCopy = readAppFile("..", "lib", "public-pricing-copy.ts");

  assert.match(platformView, /plan\.freshness\?\.pageUpdatedAt/);
  assert.match(platformView, /copy\.pageUpdated/);
  assert.match(pricingCopy, /页面更新/);
  assert.match(platformView, /copy\.latestCollection/);
  assert.match(platformView, /copy\.fxBasis/);
  assert.match(platformView, /copy\.planReview/);
  assert.match(platformView, /copy\.trustStatus/);
  assert.match(pricingCopy, /最近采集/);
  assert.match(pricingCopy, /汇率基准/);
  assert.match(pricingCopy, /套餐复核/);
  assert.match(pricingCopy, /可信状态/);
  assert.doesNotMatch(platformView, /getLatestPlanReviewDate/);
  assert.match(adapter, /freshness: getPlanFreshness\(regions\)/);
  assert.match(adapter, /pageUpdatedAt: getLatestDate\(\[planReviewedAt, priceCollectedAt\]\)/);
  assert.doesNotMatch(adapter, /latestCheckedAt \|\| staticProduct\?\.updatedAt/);
  assert.match(shareModal, /plan\.freshness\?\.pageUpdatedAt \|\| product\.updatedAt/);
  assert.match(adapter, /po\.status = 'approved'/);
  assert.match(adapter, /auto_review_reason_code' = 'superseded_by_published_price'/);
});

test("detail copy separates active locales from prepared translations", () => {
  const detailCopy = readAppFile("..", "lib", "detail-page-copy.ts");
  const adapter = readAppFile("..", "lib", "pricing-detail-adapter.ts");

  assert.match(detailCopy, /PreparedSiteLocale/);
  assert.match(detailCopy, /type PreparedDetailLocale = PreparedSiteLocale/);
  assert.match(detailCopy, /export type DetailLocale = SiteLocale/);
  assert.match(detailCopy, /"zh-tw": \{/);
  assert.match(
    detailCopy,
    /Record<PreparedDetailLocale, DetailCopyTemplate>/,
  );
  assert.match(
    detailCopy,
    /Record<PreparedDetailLocale, DetailMapCopy>/,
  );
  assert.match(
    detailCopy,
    /Record<PreparedDetailLocale, DetailTableCopy>/,
  );
  assert.doesNotMatch(detailCopy, /detailCopyTemplates\[locale\] \|\|/);
  assert.doesNotMatch(detailCopy, /detailMapCopy\[locale\] \|\|/);
  assert.doesNotMatch(detailCopy, /detailTableCopy\[locale\] \|\|/);
  assert.doesNotMatch(adapter, /\bes:\s*"es"/);
  assert.doesNotMatch(adapter, /\bja:\s*"ja"/);
});

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const appDir = dirname(fileURLToPath(import.meta.url));

function readAppFile(fileName: string) {
  return readFileSync(resolve(appDir, fileName), "utf8");
}

function listPageFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = resolve(directory, entry.name);

    if (entry.isDirectory()) return listPageFiles(entryPath);
    return entry.name === "page.tsx" ? [entryPath] : [];
  });
}

test("site metadata defaults to geosub.org and has language alternates", () => {
  const source = readAppFile("layout.tsx");
  const proxy = readFileSync(resolve(appDir, "..", "proxy.ts"), "utf8");

  assert.match(source, /https:\/\/geosub\.org/);
  assert.doesNotMatch(source, /geosub\.com/);
  assert.match(source, /metadataBase/);
  assert.match(proxy, /requestHeaders\.set\("x-pathname"/);
  assert.match(source, /canonical: canonicalPath/);
  assert.match(source, /getLanguageAlternates\(canonicalPath\)/);
  assert.match(source, /`\$\{siteUrl\}\$\{canonicalPath\}`/);
  assert.match(source, /Organization/);
  assert.match(source, /WebSite/);
});

test("page titles rely on the root GeoSub title template exactly once", () => {
  for (const pageFile of listPageFiles(appDir)) {
    const source = readFileSync(pageFile, "utf8");

    assert.doesNotMatch(
      source,
      /title:\s*(?:"[^"]* - GeoSub"|'[^']* - GeoSub'|`[^`]* - GeoSub`)/,
      pageFile,
    );
  }
});

test("robots blocks private routes and points crawlers at sitemap", () => {
  const source = readAppFile("robots.ts");

  assert.match(source, /https:\/\/geosub\.org/);
  assert.match(source, /"\/admin\/"/);
  assert.match(source, /"\/api\/"/);
  assert.match(source, /"\/zh\/cms-test"/);
  assert.match(source, /"\/zh\/tracking-test"/);
  assert.match(source, /sitemap\.xml/);
});

test("sitemap includes public subscription and article routes only", () => {
  const source = readAppFile("sitemap.ts");

  assert.match(source, /https:\/\/geosub\.org/);
  assert.match(source, /getArticleRoutesForLocale\(now, Locale\.ZH, "zh"\)/);
  assert.match(source, /getArticleRoutesForLocale\(now, Locale\.EN, "en"\)/);
  assert.match(source, /\/zh\/ai-pricing/);
  assert.match(source, /\/en\/ai-pricing/);
  assert.match(source, /\/tr\/ai-pricing/);
  assert.match(source, /\/ar\/ai-pricing/);
  assert.match(source, /\/fr\/ai-pricing/);
  assert.match(source, /\/it\/ai-pricing/);
  assert.match(source, /\/de\/ai-pricing/);
  assert.match(source, /\/pt\/ai-pricing/);
  assert.match(source, /\/zh\/streaming-pricing/);
  assert.match(source, /\/tr\/streaming-pricing/);
  assert.match(source, /\/ar\/streaming-pricing/);
  assert.match(source, /\/fr\/streaming-pricing/);
  assert.match(source, /\/it\/streaming-pricing/);
  assert.match(source, /\/de\/streaming-pricing/);
  assert.match(source, /\/pt\/streaming-pricing/);
  assert.match(source, /`\/\$\{pathLocale\}\/guides\/\$\{article\.slug\}`/);
  assert.match(source, /`\/\$\{pathLocale\}\/guides\/category\/\$\{category\.slug\}`/);
  assert.match(source, /`\/\$\{pathLocale\}\/guides\/tag\/\$\{tag\.slug\}`/);
  assert.doesNotMatch(source, /\/admin/);
  assert.doesNotMatch(source, /\/api/);
  assert.doesNotMatch(source, /route\("\/zh", "daily", 1, now\)/);
  assert.match(source, /\.\.\.\(lastModified \? \{ lastModified \} : \{\}\)/);
});

test("published guide routes and metadata are localized end to end", () => {
  const englishIndex = readAppFile("en/guides/page.tsx");
  const englishDetail = readAppFile("en/guides/[slug]/page.tsx");
  const chineseDetail = readAppFile("zh/guides/[slug]/page.tsx");
  const collection = readFileSync(
    resolve(appDir, "..", "components", "ArticleCollectionView.tsx"),
    "utf8",
  );
  const articles = readFileSync(resolve(appDir, "..", "lib", "articles.ts"), "utf8");

  assert.match(englishIndex, /getPublishedArticles\("EN"\)/);
  assert.match(englishDetail, /getPublishedArticleBySlug\(slug, "EN"\)/);
  assert.match(englishDetail, /streaming-pricing/);
  assert.match(chineseDetail, /getPublishedArticleBySlug\(slug, "ZH"\)/);
  assert.match(chineseDetail, /twitter:/);
  assert.match(chineseDetail, /streaming-pricing/);
  assert.match(collection, /const guidesPath = `\/\$\{locale\}\/guides`/);
  assert.match(collection, /getArticleTypeLabel/);
  assert.match(articles, /category: ProductCategory/);
});

test("pricing details publish page-specific metadata and matching structured data", () => {
  const englishDetail = readAppFile("en/ai-pricing/[slug]/page.tsx");
  const chineseDetail = readAppFile("zh/ai-pricing/[slug]/page.tsx");
  const sharedDetail = readFileSync(
    resolve(appDir, "..", "components", "PricingDetailPage.tsx"),
    "utf8",
  );
  const pricingSeo = readFileSync(
    resolve(appDir, "..", "lib", "pricing-seo.ts"),
    "utf8",
  );

  assert.match(englishDetail, /getPricingDetailMetadata/);
  assert.match(englishDetail, /locale: "en"/);
  assert.match(chineseDetail, /getPricingDetailMetadata/);
  assert.match(chineseDetail, /locale: "zh"/);
  assert.match(sharedDetail, /buildPricingStructuredData/);
  assert.match(sharedDetail, /type="application\/ld\+json"/);
  assert.match(sharedDetail, /openGraph:/);
  assert.match(sharedDetail, /twitter:/);

  assert.match(pricingSeo, /"@type": "Dataset"/);
  assert.match(pricingSeo, /"@type": "FAQPage"/);
  assert.match(pricingSeo, /dateModified/);
  assert.match(pricingSeo, /spatialCoverage/);
  assert.match(pricingSeo, /getSiteLocaleDefinition\(locale\)\.htmlLang/);
  assert.match(pricingSeo, /regionalPricePropertyLabels/);
  assert.doesNotMatch(sharedDetail, /in 2026/);
  assert.doesNotMatch(sharedDetail, /截至 2026 年/);
});

test("pricing lists share localized metadata and social previews", () => {
  const pricingListSeo = readFileSync(
    resolve(appDir, "..", "lib", "pricing-list-seo.ts"),
    "utf8",
  );

  for (const fileName of [
    "en/ai-pricing/page.tsx",
    "zh/ai-pricing/page.tsx",
    "tr/ai-pricing/page.tsx",
    "ar/ai-pricing/page.tsx",
    "fr/ai-pricing/page.tsx",
    "it/ai-pricing/page.tsx",
    "de/ai-pricing/page.tsx",
    "pt/ai-pricing/page.tsx",
    "en/streaming-pricing/page.tsx",
    "zh/streaming-pricing/page.tsx",
    "tr/streaming-pricing/page.tsx",
    "ar/streaming-pricing/page.tsx",
    "fr/streaming-pricing/page.tsx",
    "it/streaming-pricing/page.tsx",
    "de/streaming-pricing/page.tsx",
    "pt/streaming-pricing/page.tsx",
  ]) {
    const source = readAppFile(fileName);
    assert.match(source, /getPricingListMetadata/);
    assert.match(source, /PricingListPage/);
  }

  const sharedList = readFileSync(
    resolve(appDir, "..", "components", "PricingListPage.tsx"),
    "utf8",
  );
  assert.match(sharedList, /getPricingListCopy/);
  assert.match(pricingListSeo, /canonical: canonicalPath/);
  assert.match(pricingListSeo, /languages:/);
  assert.match(pricingListSeo, /openGraph:/);
  assert.match(pricingListSeo, /twitter:/);
});

test("unfinished software subscription pages stay out of search indexes", () => {
  for (const locale of ["zh", "en"]) {
    const source = readFileSync(
      resolve(appDir, locale, "software-subscriptions", "page.tsx"),
      "utf8",
    );

    assert.match(source, /robots:/);
    assert.match(source, /index:\s*false/);
    assert.match(source, /follow:\s*false/);
  }
});

test("every unreleased or internal page is noindex and production guarded", () => {
  const guardedPages = [
    ["zh", "ai-rankings", "page.tsx"],
    ["en", "ai-rankings", "page.tsx"],
    ["zh", "software-subscriptions", "page.tsx"],
    ["en", "software-subscriptions", "page.tsx"],
    ["zh", "gaming-steam", "page.tsx"],
    ["en", "gaming-steam", "page.tsx"],
    ["zh", "gift-cards", "page.tsx"],
    ["en", "gift-cards", "page.tsx"],
    ["zh", "vpn", "page.tsx"],
    ["zh", "cms-test", "page.tsx"],
    ["zh", "tracking-test", "page.tsx"],
  ];

  for (const segments of guardedPages) {
    const source = readFileSync(resolve(appDir, ...segments), "utf8");

    assert.match(source, /guardUnreleasedPublicPage\(\)/, segments.join("/"));
    assert.match(source, /robots:/, segments.join("/"));
    assert.match(source, /index:\s*false/, segments.join("/"));
    assert.match(source, /follow:\s*false/, segments.join("/"));
  }

  const guard = readFileSync(
    resolve(appDir, "..", "lib", "public-page-guard.ts"),
    "utf8",
  );
  assert.match(guard, /process\.env\.NODE_ENV === "production"/);
  assert.match(guard, /notFound\(\)/);
});

test("launch scope is shared by navigation, metadata alternates, and admin health", () => {
  const routePolicy = readFileSync(
    resolve(appDir, "..", "lib", "public-launch-routes.ts"),
    "utf8",
  );
  const layout = readAppFile("layout.tsx");
  const header = readFileSync(
    resolve(appDir, "..", "components", "Header.tsx"),
    "utf8",
  );
  const footer = readFileSync(
    resolve(appDir, "..", "components", "Footer.tsx"),
    "utf8",
  );
  const navigationHealth = readFileSync(
    resolve(appDir, "..", "lib", "navigation-health.ts"),
    "utf8",
  );

  for (const path of [
    "/ai-rankings",
    "/software-subscriptions",
    "/gaming-steam",
    "/gift-cards",
    "/vpn",
    "/cms-test",
    "/tracking-test",
  ]) {
    assert.match(routePolicy, new RegExp(`"${path}"`));
  }

  assert.match(layout, /launchedMirroredStaticPaths/);
  assert.doesNotMatch(layout, /"\/ai-rankings"/);
  assert.doesNotMatch(layout, /"\/software-subscriptions"/);
  assert.match(header, /shouldHideFromPublicNavigation/);
  assert.match(footer, /shouldHideFromPublicNavigation/);
  assert.match(navigationHealth, /shouldHideFromPublicNavigation/);
  assert.match(navigationHealth, /未上线/);
});

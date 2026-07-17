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
  assert.match(source, /getPublishedArticles\("ZH"\)/);
  assert.match(source, /getPublishedArticleCategories\("ZH"\)/);
  assert.match(source, /getPublishedArticleTags\("ZH"\)/);
  assert.match(source, /\/zh\/ai-pricing/);
  assert.match(source, /\/en\/ai-pricing/);
  assert.match(source, /\/zh\/streaming-pricing/);
  assert.match(source, /\/zh\/guides\/category/);
  assert.match(source, /\/zh\/guides\/tag/);
  assert.doesNotMatch(source, /\/admin/);
  assert.doesNotMatch(source, /\/api/);
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

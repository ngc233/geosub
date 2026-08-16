import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { coreGuideSlugs } from "../lib/core-guide-content.ts";

const appDir = dirname(fileURLToPath(import.meta.url));

test("promoted guide routes are thin CMS-backed shells", () => {
  for (const locale of ["zh", "en"] as const) {
    for (const slug of coreGuideSlugs) {
      const source = readFileSync(resolve(appDir, locale, "guides", slug, "page.tsx"), "utf8");

      assert.match(source, /CmsBackedGuidePage/);
      assert.match(source, /getCoreGuideMetadata/);
      assert.match(source, new RegExp(`locale=["']${locale}["']`));
      assert.match(source, new RegExp(`slug=["']${slug}["']`));
      assert.doesNotMatch(source, /sections=\{/);
    }
  }
});

test("sitemap deduplicates CMS articles that share promoted static URLs", () => {
  const source = readFileSync(resolve(appDir, "sitemap.ts"), "utf8");

  assert.match(source, /function dedupeRoutes/);
  assert.match(
    source,
    /dedupeRoutes\(\[[\s\S]*\.\.\.staticRoutes,[\s\S]*\.\.\.productRoutes,[\s\S]*\.\.\.articleRoutes,[\s\S]*\.\.\.countryPageRoutes,[\s\S]*\]\)/,
  );
});

test("noindex articles remain publicly readable but stay out of discovery lists", () => {
  const source = readFileSync(resolve(appDir, "..", "lib", "articles.ts"), "utf8");

  assert.match(source, /function publicArticleWhere/);
  assert.match(source, /function publishedArticleWhere[\s\S]*noindex: false/);
  assert.match(
    source,
    /getPublishedArticleBySlug[\s\S]*\.\.\.publicArticleWhere\(locale\)/,
  );
});

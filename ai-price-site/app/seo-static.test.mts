import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const appDir = dirname(fileURLToPath(import.meta.url));

function readAppFile(fileName: string) {
  return readFileSync(resolve(appDir, fileName), "utf8");
}

test("site metadata defaults to geosub.org and has language alternates", () => {
  const source = readAppFile("layout.tsx");

  assert.match(source, /https:\/\/geosub\.org/);
  assert.doesNotMatch(source, /geosub\.com/);
  assert.match(source, /metadataBase/);
  assert.match(source, /"zh-CN": "\/zh"/);
  assert.match(source, /en: "\/en"/);
  assert.match(source, /Organization/);
  assert.match(source, /WebSite/);
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

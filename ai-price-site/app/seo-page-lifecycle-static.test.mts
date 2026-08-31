import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const appDir = dirname(fileURLToPath(import.meta.url));
const siteDir = resolve(appDir, "..");
const schema = readFileSync(resolve(siteDir, "prisma", "schema.prisma"), "utf8");
const observer = readFileSync(
  resolve(siteDir, "lib", "seo-page-state-observer.ts"),
  "utf8",
);

test("SEO lifecycle schema stores current decisions and append-only output history", () => {
  assert.match(schema, /model SeoPageState \{/);
  assert.match(schema, /canonicalPath String @unique/);
  assert.match(schema, /eligibilityState String/);
  assert.match(schema, /indexingDecision String/);
  assert.match(schema, /decisionSource\s+String/);
  assert.match(schema, /effectiveAt\s+DateTime/);
  assert.match(schema, /policyVersion\s+String/);
  assert.match(schema, /model SeoPageStateHistory \{/);
  assert.match(schema, /finalRobotsIndex\s+Boolean/);
  assert.match(schema, /canonicalUrl\s+String/);
  assert.match(schema, /qualityScore\s+Int\?/);
  assert.match(schema, /sitemapIncluded\s+Boolean/);
  assert.match(schema, /triggerSource\s+String/);
  assert.match(observer, /seoPageStateHistory\.create/);
});

test("observe-only lifecycle store is not imported by production indexing controls", () => {
  for (const relativePath of [
    "app/sitemap.ts",
    "components/PricingDetailPage.tsx",
    "lib/product-seo-indexing-policy.ts",
  ]) {
    const source = readFileSync(resolve(siteDir, relativePath), "utf8");
    assert.doesNotMatch(source, /seo-page-state-observer|seoPageState/);
  }
});

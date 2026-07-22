import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const appDir = dirname(fileURLToPath(import.meta.url));
const siteDir = resolve(appDir, "..");

function readAppFile(...segments: string[]) {
  return readFileSync(resolve(appDir, ...segments), "utf8");
}

function readSiteFile(...segments: string[]) {
  return readFileSync(resolve(siteDir, ...segments), "utf8");
}

test("AI and streaming listing pages request distinct product categories", () => {
  const pages = [
    { source: readAppFile("zh", "ai-pricing", "page.tsx"), category: "AI" },
    { source: readAppFile("en", "ai-pricing", "page.tsx"), category: "AI" },
    {
      source: readAppFile("zh", "streaming-pricing", "page.tsx"),
      category: "STREAMING",
    },
    {
      source: readAppFile("en", "streaming-pricing", "page.tsx"),
      category: "STREAMING",
    },
  ];

  for (const { source, category } of pages) {
    assert.match(source, /export const dynamic = "force-dynamic"/);
    assert.match(source, new RegExp(`categories:\\s*\\[ProductCategory\\.${category}\\]`));
    assert.match(source, /<DbAiPricingClient products=\{products\}/);
  }
});

test("pricing list query requires published products, plans and prices", () => {
  const source = readSiteFile("lib", "db-ai-pricing.ts");

  assert.match(source, /categories = \[ProductCategory\.AI, ProductCategory\.STREAMING\]/);
  assert.match(source, /category:\s*\{\s*in: categories/);
  assert.match(source, /status:\s*"PUBLISHED"/);
  assert.doesNotMatch(source, /OR:\s*\[/);
  assert.match(source, /plans:\s*\{\s*some:/);
  assert.match(source, /regionPrices:\s*\{\s*some:/);
  assert.match(source, /getLocalizedCountryName/);
  assert.doesNotMatch(source, /countryNameZhMap/);
});

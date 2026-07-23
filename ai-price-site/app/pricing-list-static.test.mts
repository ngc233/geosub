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

test("AI and streaming listing routes delegate locale and category to one shared page", () => {
  const pages = [
    { source: readAppFile("zh", "ai-pricing", "page.tsx"), locale: "zh", category: "ai" },
    { source: readAppFile("en", "ai-pricing", "page.tsx"), locale: "en", category: "ai" },
    { source: readAppFile("ja", "ai-pricing", "page.tsx"), locale: "ja", category: "ai" },
    { source: readAppFile("ko", "ai-pricing", "page.tsx"), locale: "ko", category: "ai" },
    { source: readAppFile("es", "ai-pricing", "page.tsx"), locale: "es", category: "ai" },
    { source: readAppFile("tr", "ai-pricing", "page.tsx"), locale: "tr", category: "ai" },
    { source: readAppFile("ar", "ai-pricing", "page.tsx"), locale: "ar", category: "ai" },
    { source: readAppFile("fr", "ai-pricing", "page.tsx"), locale: "fr", category: "ai" },
    { source: readAppFile("it", "ai-pricing", "page.tsx"), locale: "it", category: "ai" },
    { source: readAppFile("de", "ai-pricing", "page.tsx"), locale: "de", category: "ai" },
    { source: readAppFile("pt", "ai-pricing", "page.tsx"), locale: "pt", category: "ai" },
    {
      source: readAppFile("zh", "streaming-pricing", "page.tsx"),
      locale: "zh",
      category: "streaming",
    },
    {
      source: readAppFile("en", "streaming-pricing", "page.tsx"),
      locale: "en",
      category: "streaming",
    },
    {
      source: readAppFile("ja", "streaming-pricing", "page.tsx"),
      locale: "ja",
      category: "streaming",
    },
    {
      source: readAppFile("ko", "streaming-pricing", "page.tsx"),
      locale: "ko",
      category: "streaming",
    },
    {
      source: readAppFile("es", "streaming-pricing", "page.tsx"),
      locale: "es",
      category: "streaming",
    },
    {
      source: readAppFile("tr", "streaming-pricing", "page.tsx"),
      locale: "tr",
      category: "streaming",
    },
    {
      source: readAppFile("ar", "streaming-pricing", "page.tsx"),
      locale: "ar",
      category: "streaming",
    },
    {
      source: readAppFile("fr", "streaming-pricing", "page.tsx"),
      locale: "fr",
      category: "streaming",
    },
    {
      source: readAppFile("it", "streaming-pricing", "page.tsx"),
      locale: "it",
      category: "streaming",
    },
    {
      source: readAppFile("de", "streaming-pricing", "page.tsx"),
      locale: "de",
      category: "streaming",
    },
    {
      source: readAppFile("pt", "streaming-pricing", "page.tsx"),
      locale: "pt",
      category: "streaming",
    },
  ];

  for (const { source, locale, category } of pages) {
    assert.match(source, /export const dynamic = "force-dynamic"/);
    assert.match(source, /import PricingListPage/);
    assert.match(
      source,
      new RegExp(`<PricingListPage locale="${locale}" category="${category}"`),
    );
  }

  const sharedPage = readSiteFile("components", "PricingListPage.tsx");
  assert.match(sharedPage, /ai:\s*ProductCategory\.AI/);
  assert.match(sharedPage, /streaming:\s*ProductCategory\.STREAMING/);
  assert.match(sharedPage, /<DbAiPricingClient products=\{products\} locale=\{locale\}/);
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

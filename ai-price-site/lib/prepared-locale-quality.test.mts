import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  getPreparedSiteLocaleDefinition,
} from "./site-locale.ts";

const libDir = dirname(fileURLToPath(import.meta.url));
const siteDir = resolve(libDir, "..");

function readSiteFile(...segments: string[]) {
  return readFileSync(resolve(siteDir, ...segments), "utf8");
}

function extractFirstLocaleBlock(source: string, locale: string) {
  const key = locale.includes("-") ? `"${locale}"` : locale;
  const marker = `\n  ${key}:`;
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, locale);
  const next = source
    .slice(start + marker.length)
    .search(/\n  (?:"zh-tw"|zh|en|ja|ko|es|tr|ar|fr|it|de|pt):/);
  return next < 0
    ? source.slice(start)
    : source.slice(start, start + marker.length + next);
}

test("non-CJK prepared list and region-table copy does not leak Chinese", () => {
  const sources = [
    readSiteFile("lib", "pricing-list-copy.ts"),
    readSiteFile("lib", "region-price-table-copy.ts"),
  ];

  for (const source of sources) {
    for (const locale of ["ko", "es", "tr", "ar", "fr", "it", "de", "pt"]) {
      const block = extractFirstLocaleBlock(source, locale);
      assert.doesNotMatch(block, /[\u3400-\u9fff]/, locale);
      assert.doesNotMatch(block, /\uFFFD/, locale);
    }
  }
});

test("every v2.1 locale has complete list, detail, table and metadata copy", () => {
  const sources = [
    readSiteFile("lib", "pricing-list-copy.ts"),
    readSiteFile("lib", "pricing-detail-page-copy.ts"),
    readSiteFile("lib", "region-price-table-copy.ts"),
    readSiteFile("components", "AffordabilityComparison.tsx"),
  ];

  for (const source of sources) {
    for (const locale of ["ja", "ko", "es", "tr", "ar", "fr", "it", "de", "pt"]) {
      assert.match(source, new RegExp(`\\n  ${locale}:`), locale);
    }
    assert.doesNotMatch(source, /\uFFFD/);
  }
});

test("European static pages are complete and do not fall back to Chinese copy", () => {
  const source = readSiteFile("components", "EuropeanLocalePages.tsx");

  for (const locale of ["fr", "it", "de", "pt"]) {
    assert.match(source, new RegExp(`\\n  ${locale}:`), locale);
  }

  assert.doesNotMatch(source, /[\u3400-\u9fff]/);
  assert.doesNotMatch(source, /\uFFFD/);
  assert.doesNotMatch(source, /\bplaceholder\b/i);
});

test("Arabic direction is enforced by server and client document shells", () => {
  const layout = readFileSync(resolve(siteDir, "app", "layout.tsx"), "utf8");
  const sync = readFileSync(
    resolve(siteDir, "components", "DocumentLocaleSync.tsx"),
    "utf8",
  );

  assert.equal(getPreparedSiteLocaleDefinition("ar").direction, "rtl");
  assert.match(layout, /dir=\{localeDefinition\.direction\}/);
  assert.match(sync, /document\.documentElement\.dir = definition\.direction/);
});

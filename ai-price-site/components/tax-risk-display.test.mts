import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const componentsDir = dirname(fileURLToPath(import.meta.url));

function readComponent(fileName: string) {
  return readFileSync(resolve(componentsDir, fileName), "utf8");
}

test("region table tax and risk labels cover every prepared locale", () => {
  const source = readComponent("ExpandableRegionPriceTable.tsx");
  const copySource = readFileSync(
    resolve(componentsDir, "../lib/region-price-table-copy.ts"),
    "utf8",
  );

  assert.match(
    source,
    /import type \{ PreparedSiteLocale \} from "\.\.\/lib\/site-locale"/,
  );
  assert.match(source, /locale: PreparedSiteLocale/);
  assert.match(source, /getRegionPriceTableCopy\(locale\)/);
  assert.match(source, /return copy\.riskNeedsReview/);
  assert.match(source, /return copy\.taxInferred/);
  assert.match(source, /return copy\.taxVerified/);
  assert.match(source, /return copy\.taxMedium/);
  assert.match(source, /return copy\.taxNeedsReview/);
  assert.match(source, /copy\.riskPrefix\(getRiskLabel\(region\.riskLevel, locale\)\)/);
  assert.match(
    copySource,
    /satisfies Record<[\s\S]*Exclude<PreparedSiteLocale, "zh" \| "en">/,
  );
  for (const locale of ["ja", "ko", "es", "tr", "ar"]) {
    assert.match(copySource, new RegExp(`\\n  ${locale}:`));
  }
});

test("region table delegates tax notes and country names to locale helpers", () => {
  const source = readComponent("ExpandableRegionPriceTable.tsx");

  assert.match(source, /localizeTaxNote\(raw, locale/);
  assert.match(source, /localizeTaxNote\(noteRaw, locale/);
  assert.match(source, /unknownFallback: locale !== "zh" && locale !== "en"/);
  assert.match(source, /getLocalizedRegionName\(region\.code, locale\)/);
});

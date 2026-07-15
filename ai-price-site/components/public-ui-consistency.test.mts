import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const componentsDir = dirname(fileURLToPath(import.meta.url));

function readComponent(fileName: string) {
  return readFileSync(resolve(componentsDir, fileName), "utf8");
}

test("active public listing cards use the current compact radius system", () => {
  const pricingCard = readComponent("PricingCard.tsx");
  const dbPricingCard = readComponent("DbPricingCard.tsx");
  const brandIcon = readComponent("BrandIcon.tsx");

  assert.match(pricingCard, /overflow-hidden rounded-xl border/);
  assert.match(dbPricingCard, /overflow-hidden rounded-xl border/);
  assert.doesNotMatch(pricingCard, /rounded-3xl/);
  assert.doesNotMatch(dbPricingCard, /rounded-2xl/);
  assert.doesNotMatch(dbPricingCard, /className="rounded-xl"/);
  assert.doesNotMatch(brandIcon, /rounded-2xl|rounded-3xl/);
});

test("active public map and source filters avoid legacy oversized popovers", () => {
  const map = readComponent("PriceWorldMap.tsx");
  const table = readComponent("ExpandableRegionPriceTable.tsx");

  assert.match(map, /w-64 rounded-lg border border-zinc-200 bg-white/);
  assert.doesNotMatch(map, /w-64 rounded-2xl/);
  assert.match(table, /grid w-full grid-cols-4 rounded-lg/);
  assert.match(table, /absolute bottom-1 top-1 rounded-md/);
  assert.doesNotMatch(table, /grid w-full grid-cols-4 rounded-xl/);
});

import { test } from "node:test";
import assert from "node:assert/strict";
import { dateRange, matchesRelation, priceDifference, pricePreview, taxSummary } from "./pricing-r2.ts";
import type { RegionPrice } from "./public-pricing-model.ts";

const row: RegionPrice = { rank: 1, code: "TR", country: "Turkey", priceUsd: 18, localPrice: "TRY", tax: "" };
test("missing US baseline never turns the cheapest region into a US comparison", () => {
  assert.equal(priceDifference(18), null);
  assert.equal(matchesRelation(row, undefined, "lower"), false);
  assert.equal(matchesRelation(row, undefined, "all"), true);
  assert.equal(priceDifference(18, 20), -10);
  assert.equal(matchesRelation(row, 20, "lower"), true);
});
test("tax labels derive from the evidence treatment without inventing a rate", () => {
  assert.equal(taxSummary(row), "税费待核验");
  assert.equal(taxSummary({ ...row, taxTreatment: "included_likely" }), "通常含税");
  assert.equal(taxSummary({ ...row, taxTreatment: "checkout_may_add" }, true), "Tax may be added");
});
test("collection dates expose the full range and handle missing dates", () => {
  assert.equal(dateRange([undefined, "bad"]), "—");
  assert.equal(dateRange(["2026-10-31", "2026-10-29", "2026-10-31"]), "2026-10-29 – 2026-10-31");
});
test("representative preview includes actual US and extreme while preserving sorting", () => {
  const rows = ["PH", "PK", "CA", "JP", "FR", "US", "DE", "CO"].map((code, index) => ({ ...row, code, priceUsd: index + 1 }));
  assert.deepEqual(pricePreview(rows).map(item => item.code), ["PH", "PK", "CA", "US", "CO"]);
  const withoutUs = rows.filter(item => item.code !== "US");
  assert.equal(pricePreview(withoutUs).some(item => item.code === "US"), false);
  assert.equal(pricePreview(withoutUs).at(-1)?.code, "CO");
});

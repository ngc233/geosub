import assert from "node:assert/strict";
import test from "node:test";
import { packVerifiedPriceSource, unpackVerifiedPriceSource } from "./verified-price-cache.ts";
import { getVerifiedPriceRows } from "./country-hubs.ts";
import { makeVerifiedPriceScale, scaleNow } from "./test-fixtures/verified-price-scale.ts";

function jsonBytes(value: unknown) { return Buffer.byteLength(JSON.stringify(value), "utf8"); }
// Matches Next 16.4.2 unstable_cache's FETCH entry, including escaped body JSON.
function entry(value: unknown) {
  return { kind: "FETCH", data: { headers: {}, body: JSON.stringify(value), status: 200, url: "" }, revalidate: 3600 };
}

test("compact cache round-trips every field through JSON without merging differing metadata", () => {
  const source = makeVerifiedPriceScale(100);
  const first = source.prices[0];
  source.prices.push({ ...first, productName: "Different name", quality: "pending_review", platform: "web", billingCycle: "yearly",
    priceType: "sale_price", confidence: 40, checkedAt: null, sourceUrl: null, observationId: null });
  source.prices.push({ ...first, sourceUrl: `${first.sourceUrl}?q=keep#evidence`, observationId: "invalid", amount: 0 });
  const before = structuredClone(source);
  const packed = JSON.parse(JSON.stringify(packVerifiedPriceSource(source)));
  const restored = unpackVerifiedPriceSource(packed);
  assert.deepEqual(restored, source);
  assert.deepEqual(getVerifiedPriceRows(restored.prices, restored.rates, scaleNow), getVerifiedPriceRows(source.prices, source.rates, scaleNow));
  assert.deepEqual(source, before);
  assert.deepEqual(unpackVerifiedPriceSource(packVerifiedPriceSource({ prices: [], rates: {} })), { prices: [], rates: {} });
});

test("3000-row serialized cache and its Next FETCH envelope are below 1.5 MB", t => {
  for (const rows of [2718, 3000]) {
    const source = makeVerifiedPriceScale(rows), compact = packVerifiedPriceSource(source);
    const metrics = { rows, rawBytes: jsonBytes(source), compactBytes: jsonBytes(compact),
      rawEntryBytes: jsonBytes(entry(source)), compactEntryBytes: jsonBytes(entry(compact)),
      nextEntryCodeUnits: JSON.stringify(entry(compact)).length, limitBytes: 1_500_000 };
    assert.ok(metrics.compactBytes < 1_500_000, JSON.stringify(metrics));
    assert.ok(metrics.compactEntryBytes < 1_500_000, JSON.stringify(metrics));
    assert.ok(metrics.nextEntryCodeUnits < 2 * 1024 * 1024);
    assert.deepEqual(unpackVerifiedPriceSource(JSON.parse(JSON.stringify(compact))), source);
    t.diagnostic(JSON.stringify(metrics));
  }
});

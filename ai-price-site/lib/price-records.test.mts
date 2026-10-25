import assert from "node:assert/strict";
import test from "node:test";
import { getPriceChanges, getPriceHistorySummary, getPublicPriceSnapshot, getAppStoreSourceUrl, type PriceObservationRecord } from "./price-records.ts";

function record(n: number, amount = 999, extra: Partial<PriceObservationRecord> = {}): PriceObservationRecord {
  return { id: `10000000-0000-4000-8000-${String(n).padStart(12, "0")}`, productSlug: "chatgpt", productName: "ChatGPT",
    category: "ai", planSlug: "plus", planName: "Plus", countryCode: "PH", sourceId: "apple", sourceUrl: "https://apps.apple.com/ph/app/chatgpt/id6448311069",
    observedAt: `2026-10-${String(n).padStart(2, "0")}T12:00:00Z`, platform: "ios", priceType: "list_price", amount, currency: "PHP",
    status: "approved", confidence: 90, anomaly: false, itemName: "ChatGPT Plus", originalPriceText: `₱${amount}`,
    snapshot: { country: "PH", planSpecSlug: "plus", billingCycle: "monthly", inAppPurchases: [{ Name: "ChatGPT Plus", PriceText: `₱${amount}` }, { Name: "ChatGPT Plus", PriceText: "₱9,990" }], private_token: "never-public", html: "<script>private</script>" }, ...extra };
}
test("snapshot retains original duplicate items and only allowlisted public fields", () => {
  const snapshot = getPublicPriceSnapshot(record(1))!;
  assert.equal(snapshot.items.length, 2);
  assert.equal(snapshot.items[0].selected, true);
  assert.equal(snapshot.items[1].selected, false);
  assert.equal(snapshot.items[1].priceText, "₱9,990");
  assert.match(snapshot.contentHash, /^[0-9a-f]{64}$/);
  assert.doesNotMatch(JSON.stringify(snapshot), /never-public|private_token|script|sourceId/);
  assert.equal(getPublicPriceSnapshot(record(1))!.contentHash, snapshot.contentHash);
  assert.notEqual(getPublicPriceSnapshot(record(1, 1000))!.contentHash, snapshot.contentHash);
});
test("private, malformed, wrong-country and non-App-Store evidence fails closed", () => {
  for (const extra of [{ status: "pending" }, { status: "rejected" }, { anomaly: true }, { confidence: 79 }, { platform: "web" }, { priceType: "trial" }, { amount: 0 }, { currency: "BAD!" }, { id: "../../private" }, { observedAt: "bad" }, { sourceUrl: "javascript:alert(1)" }, { sourceUrl: "https://apps.apple.com.evil/ph/app/id1" }, { sourceUrl: "https://apps.apple.com/us/app/id1" }]) assert.equal(getPublicPriceSnapshot(record(1, 999, extra)), null);
  assert.equal(getPublicPriceSnapshot(record(1, 999, { snapshot: { country: "PH", planSpecSlug: "pro", inAppPurchases: [] } })), null);
  assert.equal(getAppStoreSourceUrl("https://user:password@apps.apple.com/ph/app/id1", "PH"), null);
  assert.equal(getAppStoreSourceUrl("https://apps.apple.com/ph/app/id1?token=secret#private", "PH"), "https://apps.apple.com/ph/app/id1");
});
test("old observations remain readable without inventing a billing period or a change event", () => {
  const old = record(1); delete (old.snapshot as Record<string, unknown>).billingCycle;
  assert.equal(getPublicPriceSnapshot(old)!.billingCycle, null);
  assert.deepEqual(getPriceChanges([old, record(2, 1099)]), []);
});
test("only local amount changes yield events with both evidence records", () => {
  const events = getPriceChanges([record(3, 899), record(1), record(2, 1099)]);
  assert.equal(events.length, 2);
  assert.equal(events[0].direction, "decrease");
  assert.equal(events[1].percent, 10);
  assert.equal(events[1].before.amount, 999);
  assert.equal(events[1].after.amount, 1099);
  assert.deepEqual(getPriceChanges([record(1), record(2)]), []);
});
test("source, currency, period, anomalies and review gaps do not create false price events", () => {
  for (const extra of [{ sourceId: "other" }, { currency: "USD" }, { status: "pending" }, { anomaly: true }, { sourceId: null }, { observedAt: "2026-10-25T12:00:00Z" }]) {
    assert.deepEqual(getPriceChanges([record(1), record(2, 1099, extra)]), []);
  }
  const yearly = record(2, 1099); (yearly.snapshot as Record<string, unknown>).billingCycle = "yearly";
  assert.deepEqual(getPriceChanges([record(1), yearly]), []);
  assert.deepEqual(getPriceChanges([record(1), record(2, 999, { status: "pending" }), record(3, 1099)]), []);
  assert.deepEqual(getPriceChanges([record(1), record(2, 999, { currency: "USD" }), record(3, 1099)]), []);
});
test("simultaneous conflicting observations and malformed snapshots cannot establish a sequence", () => {
  assert.deepEqual(getPriceChanges([record(1), record(2, 1099, { observedAt: record(1).observedAt })]), []);
  assert.equal(getPublicPriceSnapshot(record(1, 999, { snapshot: null })), null);
  assert.deepEqual(getPriceChanges([record(1), record(2, 999, { snapshot: {} }), record(3, 1099)]), []);
});

test("routine ignored same-price reads preserve an approved baseline, without approving ignored changes", () => {
  const duplicate = record(2, 999, { status: "ignored", reviewReason: "superseded_by_published_price" });
  const events = getPriceChanges([record(1), duplicate, record(3, 1099)]);
  assert.equal(events.length, 1);
  assert.equal(events[0].before.id, record(1).id);
  assert.equal(events[0].after.id, record(3, 1099).id);
  assert.equal(getPublicPriceSnapshot(duplicate), null);
  for (const extra of [{ amount: 899 }, { sourceId: "other" }, { reviewReason: "other" }, { anomaly: true }]) {
    assert.deepEqual(getPriceChanges([record(1), { ...duplicate, ...extra }, record(3, 1099)]), []);
  }
  assert.deepEqual(getPriceChanges([duplicate, record(3, 1099)]), []);
});

test("history cache stays bounded for large raw snapshots while preserving events and detail links", () => {
  const records = Array.from({ length: 128 }, (_, index) => {
    const row = record(index + 1, 1000 + index, {
      observedAt: new Date(Date.UTC(2026, 9, 1) + index * 3_600_000).toISOString(),
    });
    (row.snapshot as Record<string, unknown>).html = "private-source-page".repeat(2000);
    return row;
  });
  assert.ok(Buffer.byteLength(JSON.stringify(records)) > 2 * 1024 * 1024);
  const summary = getPriceHistorySummary(records);
  assert.equal(summary.eventCount, 127);
  assert.equal(summary.events.length, 100);
  assert.equal(summary.snapshots.length, 12);
  assert.equal(summary.events[0].after.id, records[127].id);
  assert.equal(summary.events[0].before.id, records[126].id);
  assert.equal(summary.events[0].after.amount, 1127);
  assert.equal(summary.snapshots[0].id, records[0].id);
  assert.ok(Buffer.byteLength(JSON.stringify(summary)) < 150_000);
  assert.doesNotMatch(JSON.stringify(summary), /inAppPurchases|items|html|private-source-page|sourceId/);
  assert.equal(getPublicPriceSnapshot(records[127])!.items.length, 2);
  assert.deepEqual(getPriceHistorySummary([record(1, 999, { status: "pending" })]), {
    eventCount: 0, events: [], snapshots: [],
  });
});

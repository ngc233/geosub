import assert from "node:assert/strict";
import test from "node:test";
import { getComparablePriceRows } from "../lib/country-hubs.ts";
import { getCountryHubMetadata } from "../lib/country-hub-indexing.ts";
import { resolvePublicCountryBySlug } from "../lib/country-route-catalog.ts";
import { fictionalHomepageSource, fictionalPriceHistoryRecords } from "../lib/test-fixtures/homepage.ts";
import { homepagePriceChanges } from "../lib/homepage-price-changes.ts";
import {
  buildCountrySavingsViews,
  buildPriceHistoryRadar,
  extractWindowRadarEvents,
} from "../lib/public-map-views.ts";
import type { PriceObservationRecord } from "../lib/price-records.ts";

const now = new Date("2026-11-20T12:00:00Z");
const day = 86_400_000;

function obs(
  id: number,
  daysAgo: number,
  amount: number,
  extra: Partial<PriceObservationRecord> = {},
): PriceObservationRecord {
  const code = extra.countryCode ?? "TR";
  const planSlug = extra.planSlug ?? "plus";
  return {
    id: `00000000-0000-4000-8000-${String(id).padStart(12, "0")}`,
    productSlug: "chatgpt",
    productName: "ChatGPT",
    category: "ai",
    planSlug,
    planName: "Plus",
    countryCode: code,
    sourceId: `src-${code}-${planSlug}`,
    sourceUrl: `https://apps.apple.com/${code.toLowerCase()}/app/fictional/id123456789`,
    observedAt: new Date(+now - daysAgo * day).toISOString(),
    platform: "ios",
    priceType: "list_price",
    amount,
    currency: "TRY",
    status: "approved",
    confidence: 95,
    anomaly: false,
    itemName: "Plus",
    originalPriceText: `TRY ${amount}`,
    snapshot: {
      country: code,
      planSpecSlug: planSlug,
      billingCycle: "monthly",
      inAppPurchases: [{ Name: "Plus", PriceText: `TRY ${amount}` }],
    },
    ...extra,
  };
}

test("CountrySavingsMap views compute all/ai/streaming medians and link every qualifying country while keeping non-priority hubs noindex", async () => {
  const source = fictionalHomepageSource(now);
  const rows = getComparablePriceRows(source.prices, source.rates, now);
  const views = buildCountrySavingsViews(rows);

  assert.equal(views.hasUsBaseline, true);
  assert.equal(views.byCategory.all.length, 9);
  assert.equal(views.byCategory.all[0].code, "PH");
  assert.equal(views.byCategory.all[0].href, "/zh/countries/philippines");
  assert.equal(views.byCategory.all.find((i) => i.code === "CA")?.href, "/zh/countries/canada");
  assert.equal(resolvePublicCountryBySlug("canada")?.code, "CA");
  assert.equal(resolvePublicCountryBySlug("united-kingdom")?.code, "GB");

  const caMeta = await getCountryHubMetadata("zh", "canada", async () => [], false);
  assert.deepEqual(caMeta.robots, { index: false, follow: true });
  assert.match(String(caMeta.title), /加拿大/);

  assert.ok(views.byCategory.ai.length >= 9);
  assert.ok(views.byCategory.streaming.length >= 9);
  assert.ok(views.byCategory.all.at(-1)!.median < 0, "AU is higher than US");
});

test("PriceHistoryRadar separates confirmed increases, decreases, mixed and stable monitored regions", () => {
  const records = [
    obs(1, 10, 500, { countryCode: "TR" }),
    obs(2, 5, 650, { countryCode: "TR" }),
    obs(3, 8, 1000, { countryCode: "PH", currency: "PHP" }),
    obs(4, 2, 800, { countryCode: "PH", currency: "PHP" }),
    obs(5, 4, 3000, { countryCode: "JP", currency: "JPY" }),
    obs(6, 4, 20, { countryCode: "US", currency: "USD" }),
  ];

  const events = extractWindowRadarEvents(records, now, 30, 50, false);
  assert.equal(events.length, 2);

  const radar = buildPriceHistoryRadar(events, ["TR", "PH", "JP", "US", "DE"]);
  assert.equal(radar.monitoredCount, 5);
  assert.equal(radar.changedCount, 2);
  assert.equal(radar.stableCount, 3);
  assert.equal(radar.increaseEvents, 1);
  assert.equal(radar.decreaseEvents, 1);

  assert.equal(radar.nodes[0].code, "PH");
  assert.equal(radar.nodes[0].status, "decrease");
  assert.equal(radar.nodes[1].code, "TR");
  assert.equal(radar.nodes[1].status, "increase");
  assert.deepEqual(
    radar.nodes.filter((n) => n.status === "monitored").map((n) => n.code),
    ["DE", "JP", "US"],
  );
});

test("PriceHistoryRadar fails closed on truncation and handles zero-event monitored-only coverage", () => {
  const records = [obs(1, 10, 500), obs(2, 5, 650)];
  assert.deepEqual(extractWindowRadarEvents(records, now, 30, 50, true), []);

  const stableOnly = buildPriceHistoryRadar([], ["US", "JP", "TR"]);
  assert.equal(stableOnly.monitoredCount, 3);
  assert.equal(stableOnly.changedCount, 0);
  assert.equal(stableOnly.stableCount, 3);
  assert.ok(stableOnly.nodes.every((n) => n.status === "monitored"));
});

test("dev fictional price history records produce verified 120-day radar events and 30-day homepage changes", () => {
  const records = fictionalPriceHistoryRecords(now);
  const observedCodes = [...new Set(records.map((r) => r.countryCode))];
  const events120 = extractWindowRadarEvents(records, now, 120, 100, false);
  const radar = buildPriceHistoryRadar(events120, observedCodes);
  assert.equal(events120.length, 7);
  assert.equal(radar.changedCount, 5);
  assert.equal(radar.increaseEvents, 3);
  assert.equal(radar.decreaseEvents, 4);

  const recent30 = homepagePriceChanges(records, now);
  assert.equal(recent30.length, 6);
});

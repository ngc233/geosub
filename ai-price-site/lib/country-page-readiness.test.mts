import assert from "node:assert/strict";
import test from "node:test";
import { countryPagePilots } from "./country-page-pilot.ts";
import {
  evaluateCountryPageReadiness,
  type CountryPageReadinessInput,
} from "./country-page-readiness.ts";

const claude = countryPagePilots.find(
  (pilot) => pilot.productSlug === "claude" && pilot.countryCode === "KR",
)!;

function readyInput(): CountryPageReadinessInput {
  return {
    // Model a pilot that still uses a price event as current evidence.
    pilot: {
      ...claude,
      evidenceKind: "price_event",
      historicalPriceEvent: undefined,
      priceEvent: {
        planSlug: "max-5x",
        previousLocalPrice: "KRW 99,000",
        currentLocalPrice: "KRW 199,000",
        confirmedAt: "2026-08-16",
        sourceUrl: "https://apps.apple.com/kr/app/id6473753684",
      },
    },
    now: new Date("2026-08-16T12:00:00.000Z"),
    prices: [{
      planSlug: "max-5x",
      planName: "Claude Max 5x",
      localPrice: 199000,
      currency: "KRW",
      billingCycle: "monthly",
      billingPlatform: "ios",
      priceType: "list_price",
      confidenceScore: 82,
      dataQuality: "verified",
      lastCheckedAt: "2026-08-16T08:00:00.000Z",
      sourceUrl: "https://apps.apple.com/kr/app/id6473753684",
      observationStatus: "approved",
      observationConfidenceScore: 82,
      anomalyFlag: false,
    }],
    exchangeRate: {
      rate: 1400,
      source: "ECB",
      rateDate: "2026-08-16",
      fetchedAt: "2026-08-16T08:00:00.000Z",
    },
    taxProfile: {
      confidence: "high",
      reviewStatus: "verified",
      sourceKind: "official",
    },
    searchEvidence: {
      clicks: 4,
      impressions: 214,
      latestPeriodEnd: "2026-08-13",
      engines: ["google", "bing"],
    },
  };
}

function claudeProOnlyInput(): CountryPageReadinessInput {
  const input = readyInput();
  input.pilot = claude;
  input.prices = [{
    ...input.prices[0],
    planSlug: "pro",
    planName: "Claude Pro",
    localPrice: 20000, // Fictional price for the test.
  }];
  return input;
}

test("a fully evidenced country pilot is ready", () => {
  const result = evaluateCountryPageReadiness(readyInput());
  assert.equal(result.status, "ready");
  assert.deepEqual(result.blockers, []);
  assert.ok(Object.values(result.checks).every(Boolean));
});

test("stale exchange rates block release", () => {
  const input = readyInput();
  input.exchangeRate!.fetchedAt = "2026-08-15T12:00:00.000Z";
  const result = evaluateCountryPageReadiness(input);
  assert.equal(result.status, "blocked");
  assert.ok(result.blockers.includes("fx.older_than_18_hours"));
});

test("missing exact source and weak prices block release", () => {
  const input = readyInput();
  input.prices[0].sourceUrl = null;
  input.prices[0].confidenceScore = 70;
  const result = evaluateCountryPageReadiness(input);
  assert.ok(result.blockers.includes("source.missing_exact_app_store_url"));
  assert.ok(result.blockers.includes("price.not_fully_verified"));
});

test("price events can establish demand but must match the current local price", () => {
  const input = readyInput();
  input.searchEvidence = {
    clicks: 0,
    impressions: 0,
    latestPeriodEnd: null,
    engines: [],
  };
  let result = evaluateCountryPageReadiness(input);
  assert.equal(result.checks.demand, true);
  assert.ok(result.warnings.includes("demand.price_event_only"));

  input.prices[0].localPrice = 99000;
  result = evaluateCountryPageReadiness(input);
  assert.ok(result.blockers.includes("event.current_price_or_source_mismatch"));
});

test("Claude Korea can pass with current Pro and separate Max 5x history", () => {
  const result = evaluateCountryPageReadiness(claudeProOnlyInput());
  assert.deepEqual(result.blockers, []);
  assert.equal(result.status, "ready");
  assert.equal(result.planCount, 1);
  assert.equal(claude.evidenceKind, "regional_price");
  assert.equal(claude.priceEvent, undefined);
  assert.equal(claude.historicalPriceEvent?.planSlug, "max-5x");
});

test("Claude Korea history does not compensate for a stale current Pro price", () => {
  const input = claudeProOnlyInput();
  input.prices[0].lastCheckedAt = "2026-08-01T08:00:00.000Z";
  const result = evaluateCountryPageReadiness(input);
  assert.equal(result.status, "blocked");
  assert.deepEqual(result.blockers, ["price.older_than_14_days"]);
});

test("Claude Korea history does not substitute for search impressions", () => {
  const input = claudeProOnlyInput();
  input.searchEvidence = {
    clicks: 0,
    impressions: 0,
    latestPeriodEnd: null,
    engines: [],
  };
  const result = evaluateCountryPageReadiness(input);
  assert.equal(result.status, "blocked");
  assert.deepEqual(result.blockers, ["demand.no_observed_search_or_price_event"]);
});

test("explicit availability blockers remain hard release gates", () => {
  const netflix = countryPagePilots.find(
    (pilot) => pilot.productSlug === "netflix" && pilot.countryCode === "IN",
  )!;
  const input = readyInput();
  input.pilot = netflix;
  input.prices[0].planSlug = "basic";
  input.prices[0].planName = "Netflix Basic";
  input.prices[0].localPrice = 199;
  input.prices[0].currency = "INR";
  const result = evaluateCountryPageReadiness(input);
  assert.ok(
    result.blockers.includes("availability.new_subscriber_basic_unverified"),
  );
});

test("fresh independent Max/Ultra prices cannot conceal either stale legacy tier", () => {
  for (const staleSlug of ["max-5x", "max-20x"]) {
    const input = readyInput();
    const template = input.prices[0];
    input.prices.push({ ...template, planSlug: "max-20x", planName: "Claude Max 20x" });
    for (const slug of ["max", "ultra"]) {
      // Hypothetical published fixture; review-only plans are not queried by the report.
      input.prices.push({ ...template, planSlug: slug, planName: `Claude ${slug}` });
    }
    input.prices.find((price) => price.planSlug === staleSlug)!.lastCheckedAt = "2026-08-01T08:00:00.000Z";
    const result = evaluateCountryPageReadiness(input);
    assert.equal(result.status, "blocked");
    assert.ok(result.blockers.includes("price.older_than_14_days"));
    assert.equal(result.checks.event, true);
  }
});

test("removing legacy Max 5x still breaks the registered event even with fresh new plans", () => {
  const input = readyInput();
  input.prices = ["max", "ultra"].map((slug) => ({
    ...input.prices[0], planSlug: slug, planName: `Claude ${slug}`,
  }));
  const result = evaluateCountryPageReadiness(input);
  assert.equal(result.status, "blocked");
  assert.ok(result.blockers.includes("event.current_price_or_source_mismatch"));
  assert.ok(!result.blockers.includes("price.older_than_14_days"));
});

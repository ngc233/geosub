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
    pilot: claude,
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

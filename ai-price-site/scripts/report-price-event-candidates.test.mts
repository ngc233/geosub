import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const {
  PRICE_EVENT_QUERY,
  buildEventGroups,
  buildPriceEventCandidateReport,
  parseArguments,
} = require("./report-price-event-candidates.cjs");

type ObservationOverrides = Record<string, unknown>;

function observation(overrides: ObservationOverrides = {}) {
  return {
    id: "observation-1",
    product_id: "product-1",
    product_slug: "chatgpt",
    product_name: "ChatGPT",
    plan_id: "plan-1",
    plan_slug: "plus",
    plan_name: "ChatGPT Plus",
    billing_cycle: "monthly",
    country_id: "country-1",
    country_code: "US",
    country_name: "United States",
    source_id: "source-1",
    source_name: "App Store",
    source_type: "app_store",
    source_level: "A",
    raw_price: "20.00",
    currency: "USD",
    converted_usd: "20.00",
    observed_at: "2026-08-01T08:00:00.000Z",
    billing_platform: "ios",
    price_type: "subscription",
    confidence_score: 82,
    anomaly_flag: false,
    anomaly_reason: null,
    observation_status: "approved",
    review_reason_code: null,
    observed_item_name: "ChatGPT Plus",
    observed_price_text: "$20.00",
    observed_plan_spec_slug: "plus",
    original_observed_price_text: "$20.00",
    source_url: "https://apps.apple.com/us/app/id6448311069",
    parser_version: "app-store-html-iap-v1",
    price_variant_count: "1",
    selected_price_count: "1",
    runner_up_price_count: "0",
    formal_local_price: "20.00",
    formal_currency: "USD",
    formal_status: "published",
    formal_data_quality: "verified",
    formal_primary_source_id: "source-1",
    formal_last_checked_at: "2026-08-01T08:00:00.000Z",
    ...overrides,
  };
}

function report(rows: ReturnType<typeof observation>[]) {
  return buildPriceEventCandidateReport(rows, {
    days: 30,
    baselineDays: 365,
    limit: 50,
    now: new Date("2026-08-16T00:00:00.000Z"),
  });
}

test("CLI arguments stay bounded and reject unknown options", () => {
  assert.deepEqual(parseArguments(["--days=30", "--baseline-days=365", "--limit=10", "--product=chatgpt", "--json"]), {
    days: 30,
    baselineDays: 365,
    limit: 10,
    product: "chatgpt",
    json: true,
    statementTimeoutMs: 15_000,
  });
  assert.throws(() => parseArguments(["--days=0"]));
  assert.throws(() => parseArguments(["--baseline-days=20", "--days=30"]));
  assert.throws(() => parseArguments(["--product=ChatGPT Plus"]));
  assert.throws(() => parseArguments(["--write"]));
});

test("database candidate query is a single read-only SELECT", () => {
  const normalized = PRICE_EVENT_QUERY.replace(/\s+/g, " ").trim();
  assert.match(normalized, /^SELECT\b/i);
  assert.doesNotMatch(normalized, /\b(?:INSERT|UPDATE|DELETE|UPSERT|MERGE|TRUNCATE|ALTER|DROP|CREATE)\b/i);
  assert.equal((normalized.match(/;/g) || []).length, 1);

  const scriptSource = fs.readFileSync(
    new URL("./report-price-event-candidates.cjs", import.meta.url),
    "utf8",
  );
  assert.match(scriptSource, /BEGIN TRANSACTION READ ONLY/);
  assert.match(scriptSource, /SET LOCAL statement_timeout/);
  assert.match(scriptSource, /ROLLBACK/);
});

test("two distinct UTC collection days confirm a local price change", () => {
  const result = report([
    observation({ observed_at: "2026-07-20T08:00:00.000Z" }),
    observation({
      id: "new-1",
      raw_price: "25.00",
      converted_usd: "25.00",
      observed_at: "2026-08-14T08:00:00.000Z",
      observation_status: "pending",
    }),
    observation({
      id: "new-2",
      raw_price: "25.00",
      converted_usd: "25.00",
      observed_at: "2026-08-15T08:00:00.000Z",
      observation_status: "pending",
    }),
  ]);

  assert.equal(result.summary.eligibleCandidates, 1);
  assert.equal(result.candidates[0].type, "local_price_increase");
  assert.equal(result.candidates[0].previousLocalPrice, "20.00");
  assert.equal(result.candidates[0].currentLocalPrice, "25.00");
  assert.equal(result.candidates[0].stableRoundCount, 2);
  assert.equal(result.candidates[0].evidenceRule, "two_or_more_distinct_utc_collection_days");
});

test("one approved official A-level observation can qualify", () => {
  const result = report([
    observation({
      raw_price: "25.00",
      converted_usd: "25.00",
      observed_at: "2026-08-15T08:00:00.000Z",
      formal_local_price: "20.00",
    }),
  ]);

  assert.equal(result.summary.eligibleCandidates, 1);
  assert.equal(result.candidates[0].evidenceRule, "single_approved_high_trust_observation");
});

test("one auto-approved observation does not count as independent evidence", () => {
  const result = report([
    observation({
      raw_price: "25.00",
      converted_usd: "25.00",
      observed_at: "2026-08-15T08:00:00.000Z",
      formal_local_price: "20.00",
      review_reason_code: "app_store_three_sample_consensus",
    }),
  ]);

  assert.equal(result.summary.eligibleCandidates, 0);
  assert.equal(result.summary.detectedCandidates, 1);
  assert.equal(result.candidates[0].status, "detected");
  assert.deepEqual(result.candidates[0].blockers, [
    "insufficient_independent_evidence",
  ]);
});

test("A-level third-party evidence remains detected, not eligible", () => {
  const result = report([
    observation({
      raw_price: "25.00",
      converted_usd: "25.00",
      observed_at: "2026-08-15T08:00:00.000Z",
      source_type: "third_party",
      formal_local_price: "20.00",
    }),
  ]);

  assert.equal(result.summary.eligibleCandidates, 0);
  assert.equal(result.summary.detectedCandidates, 1);
  assert.equal(result.candidates[0].status, "detected");
});

test("converted USD movement without a local price change is not an event", () => {
  const result = report([
    observation({ converted_usd: "19.80", observed_at: "2026-08-14T08:00:00.000Z" }),
    observation({ id: "fx-2", converted_usd: "20.20", observed_at: "2026-08-15T08:00:00.000Z" }),
  ]);

  assert.equal(result.candidates.length, 0);
  assert.equal(result.summary.fxOnlyIdentityGroups, 1);
});

test("anomalies and same-day conflicting local prices cannot become candidates", () => {
  const anomalyResult = report([
    observation({
      raw_price: "0.10",
      converted_usd: "0.10",
      observed_at: "2026-08-15T08:00:00.000Z",
      anomaly_flag: true,
    }),
  ]);
  assert.equal(anomalyResult.candidates.length, 0);
  assert.equal(anomalyResult.summary.excludedAnomalyRows, 1);

  const conflictResult = report([
    observation({ raw_price: "25.00", observed_at: "2026-08-15T08:00:00.000Z" }),
    observation({ id: "conflict-2", raw_price: "26.00", observed_at: "2026-08-15T18:00:00.000Z" }),
  ]);
  assert.equal(conflictResult.candidates.length, 0);
  assert.equal(conflictResult.summary.conflictingIdentityGroups, 1);
  assert.equal(conflictResult.rejections[0].reason, "conflicting_local_prices_in_same_utc_day");
});

test("observations already ignored or rejected by review cannot qualify", () => {
  const result = report([
    observation({
      raw_price: "25.00",
      converted_usd: "25.00",
      observed_at: "2026-08-14T08:00:00.000Z",
      observation_status: "ignored",
    }),
    observation({
      id: "ignored-2",
      raw_price: "25.00",
      converted_usd: "25.00",
      observed_at: "2026-08-15T08:00:00.000Z",
      observation_status: "rejected",
    }),
  ]);

  assert.equal(result.candidates.length, 0);
  assert.equal(result.summary.excludedNonReviewableStatusRows, 2);
});

test("an untrusted previous local price is rejected even after two stable new rounds", () => {
  const result = report([
    observation({
      observed_at: "2026-07-20T08:00:00.000Z",
      observation_status: "pending",
      formal_local_price: "25.00",
    }),
    observation({
      id: "new-1",
      raw_price: "25.00",
      converted_usd: "25.00",
      observed_at: "2026-08-14T08:00:00.000Z",
      observation_status: "pending",
      formal_local_price: "25.00",
    }),
    observation({
      id: "new-2",
      raw_price: "25.00",
      converted_usd: "25.00",
      observed_at: "2026-08-15T08:00:00.000Z",
      observation_status: "pending",
      formal_local_price: "25.00",
    }),
  ]);

  assert.equal(result.candidates.length, 0);
  assert.equal(result.summary.insufficientTrustedBaselineGroups, 1);
  assert.equal(result.rejections[0].reason, "previous_local_price_lacks_trusted_evidence");
});

test("a changed App Store item name keeps a stable price change in review", () => {
  const result = report([
    observation({
      observed_at: "2026-07-20T08:00:00.000Z",
      observed_item_name: "ChatGPT Plus",
    }),
    observation({
      id: "new-1",
      raw_price: "25.00",
      converted_usd: "25.00",
      observed_at: "2026-08-14T08:00:00.000Z",
      observation_status: "pending",
      observed_item_name: "ChatGPT Team",
    }),
    observation({
      id: "new-2",
      raw_price: "25.00",
      converted_usd: "25.00",
      observed_at: "2026-08-15T08:00:00.000Z",
      observation_status: "pending",
      observed_item_name: "ChatGPT Team",
    }),
  ]);

  assert.equal(result.summary.eligibleCandidates, 0);
  assert.equal(result.summary.detectedCandidates, 1);
  assert.equal(result.summary.planEvidenceReviewCandidates, 1);
  assert.equal(result.candidates[0].planEvidenceStatus, "item_name_changed");
  assert.deepEqual(result.candidates[0].blockers, [
    "plan_evidence:item_name_changed",
  ]);
});

test("a plan spec mismatch cannot become an eligible event", () => {
  const result = report([
    observation({
      raw_price: "25.00",
      converted_usd: "25.00",
      observed_at: "2026-08-15T08:00:00.000Z",
      formal_local_price: "20.00",
      observed_plan_spec_slug: "pro",
    }),
  ]);

  assert.equal(result.summary.eligibleCandidates, 0);
  assert.equal(result.candidates[0].planEvidenceStatus, "plan_spec_mismatch");
});

test("multiple current prices under one item name require cycle or SKU review", () => {
  const result = report([
    observation({
      observed_at: "2026-07-20T08:00:00.000Z",
      raw_price: "700.00",
    }),
    observation({
      id: "new-1",
      raw_price: "2900.00",
      converted_usd: "34.00",
      observed_at: "2026-08-14T08:00:00.000Z",
      price_variant_count: "2",
    }),
    observation({
      id: "new-2",
      raw_price: "2900.00",
      converted_usd: "34.00",
      observed_at: "2026-08-15T08:00:00.000Z",
      price_variant_count: "2",
    }),
  ]);

  assert.equal(result.summary.eligibleCandidates, 0);
  assert.equal(
    result.candidates[0].planEvidenceStatus,
    "ambiguous_current_price_variants",
  );
  assert.deepEqual(result.candidates[0].blockers, [
    "plan_evidence:ambiguous_current_price_variants",
  ]);
});

test("billing cycle and source remain part of the comparison identity", () => {
  const result = report([
    observation({
      raw_price: "25.00",
      observed_at: "2026-08-15T08:00:00.000Z",
      formal_local_price: "20.00",
    }),
    observation({
      id: "yearly",
      billing_cycle: "yearly",
      raw_price: "200.00",
      converted_usd: "200.00",
      observed_at: "2026-08-15T08:00:00.000Z",
      formal_local_price: "180.00",
    }),
  ]);

  assert.equal(result.summary.identityGroups, 2);
  assert.equal(result.summary.eligibleCandidates, 2);
});

test("related country and plan changes collapse into one editorial event group", () => {
  const base = {
    status: "eligible",
    type: "local_price_decrease",
    productSlug: "netflix",
    productName: "Netflix",
    sourceName: "Apple App Store",
    firstSeenAt: "2026-08-10",
    lastSeenAt: "2026-08-15",
    billingPlatform: "ios",
    priceType: "subscription",
    billingCycle: "monthly",
  };
  const groups = buildEventGroups([
    { ...base, planSlug: "basic", countryCode: "EG" },
    { ...base, planSlug: "standard", countryCode: "EG" },
    { ...base, planSlug: "standard", countryCode: "TR" },
  ]);

  assert.equal(groups.length, 1);
  assert.equal(groups[0].planCount, 2);
  assert.equal(groups[0].regionCount, 2);
  assert.equal(groups[0].candidateCount, 3);
  assert.equal(groups[0].nextAction, "replay_official_source_before_editorial_use");
  assert.equal(groups[0].evidenceSamples.length, 3);
});

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  recordUnmatchedPlanCandidate,
  summarizeUnmatchedPlanCandidates,
} from "./collect-app-store-prices.mjs";
import {
  findPlanNameDrift,
  aggregateUnmatchedCandidates,
} from "./audit-plan-drift.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("unmatched plan candidate recorder ignores consumables and aggregates countries", () => {
  const map = new Map();
  recordUnmatchedPlanCandidate(map, { name: "500 Coins Pack", country: "US", priceText: "$4.99" });
  recordUnmatchedPlanCandidate(map, { name: "Google AI Ultra (20 TB)", country: "DE", priceText: "99,99 €" });
  recordUnmatchedPlanCandidate(map, { name: "Google AI Ultra (20 TB)", country: "TH", priceText: "฿3,500.00" });
  recordUnmatchedPlanCandidate(map, { name: "Google AI Ultra (20 TB)", country: "DE", priceText: "99,99 €" });

  const summary = summarizeUnmatchedPlanCandidates(map);
  assert.equal(summary.length, 1);
  assert.equal(summary[0].name, "Google AI Ultra (20 TB)");
  assert.deepEqual(summary[0].countries, ["DE", "TH"]);
  assert.equal(summary[0].country_count, 2);
  assert.equal(summary[0].count, 3);
});

test("findPlanNameDrift detects stale DB plan names against product-plan-specs", () => {
  const specs = {
    gemini: { plans: [{ slug: "pro", name: "Google AI Pro" }, { slug: "ultra", name: "Google AI Ultra" }] },
  };
  const dbPlans = [
    { product_slug: "gemini", plan_slug: "pro", plan_name: "Gemini Advanced", status: "published" },
    { product_slug: "gemini", plan_slug: "ultra", plan_name: "Google AI Ultra", status: "published" },
  ];
  const drifts = findPlanNameDrift(specs, dbPlans);
  assert.equal(drifts.length, 1);
  assert.equal(drifts[0].plan_slug, "pro");
  assert.equal(drifts[0].db_name, "Gemini Advanced");
  assert.equal(drifts[0].spec_name, "Google AI Pro");
});

test("aggregateUnmatchedCandidates filters by minimum country count", () => {
  const rows = [
    {
      product_slug: "gemini",
      unmatched_plan_candidates: [
        { name: "Google AI Ultra (20 TB)", countries: ["DE", "SA"], sample_price: "99,99 €" },
        { name: "One-off Promo", countries: ["US"], sample_price: "$1.99" },
      ],
    },
    {
      product_slug: "gemini",
      unmatched_plan_candidates: [
        { name: "Google AI Ultra (20 TB)", countries: ["TH"], sample_price: "฿3,500.00" },
      ],
    },
  ];
  const out = aggregateUnmatchedCandidates(rows, 2);
  assert.equal(out.length, 1);
  assert.deepEqual(out[0].countries, ["DE", "SA", "TH"]);
  assert.equal(out[0].country_count, 3);
});

test("ps1 collector and runner include unmatched discovery and cold-start acceleration hooks", () => {
  const ps1Collector = fs.readFileSync(path.join(__dirname, "collect-app-store-prices.ps1"), "utf8");
  const ps1Runner = fs.readFileSync(path.join(__dirname, "run-collector-jobs.ps1"), "utf8");
  assert.match(ps1Collector, /unmatched_plan_candidates/);
  assert.match(ps1Collector, /runnerUpIsDistinctCycle/);
  assert.match(ps1Collector, /INTERVAL '3 hours'/);
  assert.match(ps1Runner, /ColdStartWaitingGroups/);
  assert.match(ps1Runner, /cold_start_accelerated/);
});

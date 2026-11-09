import assert from "node:assert/strict";
import { test } from "node:test";
import { usesPlanCanvas, planDistribution, planSaving, filterPlanRegions, planWorkHours, planIncomeSources } from "./plan-canvas.ts";
import type { ProductPlan } from "./public-pricing-model.ts";
import type { PlanAffordabilityRow } from "./affordability.ts";
// Synthetic unit-test prices/incomes, never production or canvas sample data.
const plan = (values: number[], codes = ["AA", "BB", "CC", "DD", "US", "FF"]): ProductPlan => ({ slug: "monthly", name: "Monthly", billing: "monthly",
  regions: values.map((usd, i) => ({ code: codes[i], country: codes[i], priceUsd: usd, localPrice: `${usd}`, tax: "unknown", rank: i + 1, billingPlatform: "ios" })) });
test("V5 never enables Plus, English, other locales or product overviews", () => {
  for (const [locale, path] of [["zh", "/zh/ai-pricing/chatgpt/plus"], ["zh", "/zh/ai-pricing/chatgpt/plus/?x=1"], ["en", "/en/ai-pricing/claude/pro"], ["zh-tw", "/zh-tw/ai-pricing/claude/pro"], ["zh", "/zh/ai-pricing/claude"]]) assert.equal(usesPlanCanvas(locale, path), false);
  assert(usesPlanCanvas("zh", "/zh/ai-pricing/claude/pro"));assert(usesPlanCanvas("zh", "/zh/streaming-pricing/netflix/standard"));
});
test("distribution uses exact table values, even median and strict raw US comparison", () => {
  const input = plan([1, 2, 3, 9.999, 10, 12]), before = structuredClone(input), d = planDistribution(input);
  assert.equal(d.median, 6.4995);assert.equal(d.cheaper, 4);assert.equal(d.multiple, 12);assert.equal(d.visible, true);
  assert.equal(filterPlanRegions(d.rows, "low", "", d.us?.priceUsd).length, 4);
  assert.equal(filterPlanRegions(d.rows, "high", "ff", d.us?.priceUsd)[0].code, "FF");assert.deepEqual(input, before);
});
test("missing US never uses the minimum; fewer than five countries hides distribution", () => {
  const d = planDistribution(plan([2, 4, 6, 8]));assert.equal(d.visible, false);assert.equal(d.us, undefined);assert.equal(d.cheaper, null);
  assert.equal(planSaving(2), null);assert.deepEqual(filterPlanRegions(d.rows, "low", ""), []);
  assert.equal(planDistribution(plan([1, 2, 3, 4, 5], ["AA", "AA", "AA", "BB", "CC"])).visible, false);
  assert.equal(planDistribution(plan([])).median, null);
});
test("D7 excludes PPP and unknown sources, uses current table USD and hides sparse/yearly data", () => {
  const p = plan([10, 20, 30, 40, 50]);
  const rows = p.regions.map((r, i) => ({ countryCode: r.code, monthlyIncomeUsd: 1600, priceUsd: 999,
    incomeMetricType: i === 0 ? "GNI_PPP" : i === 1 ? "GDP_NOMINAL" : "GNI_ATLAS", incomeSource: "Synthetic source", incomeDataYear: 2025 } as PlanAffordabilityRow));
  const result = planWorkHours(p, rows);assert.equal(result.counts.GNI_PPP, 1);assert.equal(result.rows.length, 4);
  assert.equal(result.rows[0].hours, 2);assert(!result.rows.some(r => r.code === "AA"));
  assert.equal(planWorkHours(p, rows.slice(0, 3)).rows.length, 0);assert.equal(planWorkHours({ ...p, billing: "yearly" }, rows).rows.length, 0);
});

test("income source footnotes deduplicate shared attribution without losing regional provenance", () => {
  const rows = [{ source: "Synthetic A", country: "Japan", year: 2024 }, { source: "Synthetic B", country: "US", year: 2025 }, { source: "Synthetic A", country: "Canada", year: 2023 }], before = structuredClone(rows);
  assert.deepEqual(planIncomeSources(rows), [{ source: "Synthetic A", countries: ["Japan", "Canada"] }, { source: "Synthetic B", countries: ["US"] }]);
  assert.deepEqual(rows, before);assert.deepEqual(planIncomeSources([]), []);
});

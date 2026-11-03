import assert from "node:assert/strict";
import { test } from "node:test";
import { getIncomeWorkRows, qualifyWorkIncome, workHourSquares } from "./income-work-time.ts";
import type { ProductPlan } from "./public-pricing-model.ts";
const plan: ProductPlan = { slug: "test", name: "TEST", billing: "monthly", regions: [{ code: "US", country: "US", rank: 1, localPrice: "USD 20", priceUsd: 20, tax: "" }] };
const income = { code: "US", priceUsd: 20, monthlyIncomeUsd: 1600, year: new Date().getUTCFullYear() - 1, source: "TEST SOURCE", metric: "GNI_ATLAS" };
test("work estimate uses the current same-scope price and disclosed 160-hour parameter", () => {
  assert.equal(getIncomeWorkRows(plan, [income])[0].hours, 2);
  assert.deepEqual(getIncomeWorkRows(plan, [{ ...income, priceUsd: 10 }]), []);
  assert.deepEqual(getIncomeWorkRows(plan, [{ ...income, source: null }]), []);
  assert.deepEqual(getIncomeWorkRows(plan, [{ ...income, monthlyIncomeUsd: 0 }]), []);
  assert.deepEqual(getIncomeWorkRows(plan, [{ ...income, metric: "GNI_PPP" }]), []);
});
test("work-time data requires US, sufficient coverage, recent and consistent years", () => {
  const larger = { ...plan, regions: ["US", "CA", "JP", "TR", "FR", "DE"].map(code => ({ ...plan.regions[0], code })) };
  const rows = larger.regions.map(region => ({ ...income, code: region.code }));
  assert.equal(qualifyWorkIncome(larger, rows).length, 6);
  assert.equal(qualifyWorkIncome(larger, rows.slice(0, 4)).length, 0);
  assert.equal(qualifyWorkIncome(larger, rows.slice(1)).length, 0);
  assert.equal(qualifyWorkIncome(larger, rows.map(row => ({ ...row, year: 2000 }))).length, 0);
  assert.equal(qualifyWorkIncome(larger, rows.map((row, i) => ({ ...row, year: i ? 2026 : 2023 })), 2026).length, 0);
});
test("squares have exact whole/partial values and bounded overflow", () => {
  assert.deepEqual(workHourSquares(1.5), { full: 1, partial: .5, truncated: false });
  assert.deepEqual(workHourSquares(1000), { full: 100, partial: 0, truncated: true });
  assert.deepEqual(workHourSquares(NaN), { full: 0, partial: 0, truncated: false });
});

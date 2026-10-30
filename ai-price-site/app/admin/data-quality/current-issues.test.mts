import assert from "node:assert/strict";
import test from "node:test";
import { getProductHealth, type ProductQualityRow } from "./model.ts";

function row(overrides: Partial<ProductQualityRow>): ProductQualityRow {
  return {
    app_store_job_count: 1,
    active_app_store_job_count: 1,
    pending_observation_count: 25,
    ...overrides,
  } as ProductQualityRow;
}

test("price hierarchy conflict requests a rule check instead of repeated collection", () => {
  const health = getProductHealth(row({ plan_conflict_count: 25, hard_anomaly_count: 3, anomaly_refresh_success_count: 1 }));
  assert.equal(health.label, "套餐规则冲突");
  assert.equal(health.nextAction, "核对套餐映射与等级");
  assert.match(health.reason, /25 个套餐地区组合/);
});

test("review-only evidence remains an explicit eligibility task", () => {
  const health = getProductHealth(row({ review_only_count: 12, hard_anomaly_count: 12 }));
  assert.equal(health.label, "新套餐待核实");
  assert.equal(health.nextAction, "完善套餐证据");
});

test("isolation is not reported as repair completion", () => {
  const health = getProductHealth(row({ hard_anomaly_count: 4 }));
  assert.match(health.reason, /问题仍未解决/);
});


test("exhausted public coverage budget is not a confirmed regional difference", () => {
  const health = getProductHealth(row({
    pending_observation_count: 0, missing_pair_count: 2, missing_country_count: 1,
    coverage_refresh_success_count: 3, coverage_refresh_status: "paused",
  }));
  assert.equal(health.level, "warning");
  assert.equal(health.label, "来源覆盖待核验");
  assert.match(health.reason, /不能据此确认地区停售/);
  assert.match(health.reason, /问题保持未解决/);
});

import assert from "node:assert/strict";
import test from "node:test";
import { missingPlanCountryDetail, missingPlanCountryLabel, type MissingCountryRow } from "./[slug]/model.ts";

const base: MissingCountryRow = {
  plan_slug: "moderato", plan_name: "Moderato", country_code: "US", country_name: "美国", currency: "USD",
  pending_observation_count: 0, latest_availability_status: "available_with_prices", latest_availability_reason: null,
  plan_availability_status: "pending_absence", consecutive_missing_count: 3,
};

for (const status of ["pending_absence", "confirmed_absent"]) {
  test(`public omission ${status} does not claim regional discontinuation`, () => {
    const row = { ...base, plan_availability_status: status };
    assert.equal(missingPlanCountryLabel(row), "公开页未显示套餐（3 次）");
    assert.match(missingPlanCountryDetail(row), /未显示不代表套餐停售/);
    assert.match(missingPlanCountryDetail(row), /问题保持未解决/);
    assert.doesNotMatch(missingPlanCountryDetail(row), /3 次.*确认|继续补采/);
  });
}

test("fresh pending evidence takes precedence over an old omission flag", () => {
  const row = { ...base, pending_observation_count: 1 };
  assert.equal(missingPlanCountryLabel(row), "已采集，等待自动审核 1 组");
  assert.match(missingPlanCountryDetail(row), /候选价格/);
});

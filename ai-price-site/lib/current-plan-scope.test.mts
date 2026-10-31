import assert from "node:assert/strict";
import test from "node:test";
import { selectCurrentOrLegacyPlans } from "./current-plan-scope.ts";
test("current offers exclude legacy renewals without mutating the input", () => {
  const plans = [{ slug: "basic", current: false }, { slug: "standard", current: true }, { slug: "premium", current: true }];
  assert.deepEqual(selectCurrentOrLegacyPlans(plans, p => p.current).map(p => p.slug), ["standard", "premium"]);
  assert.equal(plans.length, 3);
});
test("legacy-only products remain discoverable using the same overview fallback", () => {
  const legacy = [{ slug: "old", current: false }];
  assert.equal(selectCurrentOrLegacyPlans(legacy, p => p.current), legacy);
  assert.deepEqual(selectCurrentOrLegacyPlans([], () => true), []);
});

import assert from "node:assert/strict";
import test from "node:test";
import { formatLocalPriceForBillingCycle } from "./billing-cycle-label.ts";

test("billing labels correct the adapter's monthly suffix without converting quote amounts", () => {
  assert.equal(formatLocalPriceForBillingCycle("R$49.90/月", "weekly", "zh"), "R$49.90/周");
  assert.equal(formatLocalPriceForBillingCycle("US$19.99/月", "yearly", "zh"), "US$19.99/年");
  assert.equal(formatLocalPriceForBillingCycle("US$19.99/mo", "weekly", "en"), "US$19.99/wk");
  assert.equal(formatLocalPriceForBillingCycle("US$19.99/月", "monthly", "zh"), "US$19.99/月");
  assert.equal(formatLocalPriceForBillingCycle("R$49.90/周", "weekly", "zh"), "R$49.90/周");
  assert.equal(formatLocalPriceForBillingCycle("现价待核验", "weekly", "zh"), "现价待核验");
  assert.equal(formatLocalPriceForBillingCycle("US$19.99/月", "one_time", "zh"), "US$19.99");
});

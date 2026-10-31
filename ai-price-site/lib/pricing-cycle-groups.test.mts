import assert from "node:assert/strict";
import test from "node:test";
import { groupPricingProductsByCycle, type DbPricingProduct } from "./db-pricing-types.ts";
test("weekly and annual prices never enter the monthly group or lose their original amount", () => {
  const product = (slug: string, billingCycle: string): DbPricingProduct => ({
    slug, name: slug, brand: slug, category: "ai", description: "", updatedAt: "2026-10-31",
    plans: [{ slug: "plan", name: "Plan", billingCycle, indexingStatus: "current", regions: [] }],
  });
  const source = [product("pollo", "WEEKLY"), product("chatgpt", "MONTHLY"), product("annual", "YEARLY")];
  const groups = groupPricingProductsByCycle(source);
  assert.equal(groups[0].cycle, "MONTHLY");
  assert.deepEqual(groups[0].products.map(p => p.slug), ["chatgpt"]);
  assert.equal(groups.find(g => g.cycle === "WEEKLY")!.products[0], source[0]);
  assert.equal(groups.flatMap(g => g.products).length, source.length);
});

import assert from "node:assert/strict";
import test from "node:test";
import { getPlanBillingContent } from "./plan-billing-content.ts";
import type { ProductPlan } from "./public-pricing-model.ts";

const plan: ProductPlan = {
  slug: "pro", name: "Pro", billing: "monthly",
  regions: [{ rank: 1, country: "United States", code: "US", priceUsd: 20, localPrice: "$20", tax: "unknown", billingPlatform: "ios" }],
};

test("billing guidance is limited to the two approved Claude Pro locales", () => {
  for (const locale of ["zh", "en"] as const) {
    const content = getPlanBillingContent({ locale, productSlug: "claude", plan });
    assert.ok(content);
    assert.equal(content.faqs.length, 2);
    assert.ok(content.sources.every((source) => new URL(source.href).hostname === "support.claude.com"));
  }
  for (const [locale, productSlug, slug] of [
    ["zh", "chatgpt", "plus"], ["en", "chatgpt", "pro-5x"],
    ["zh", "claude", "max-5x"], ["en", "claude", "max-20x"],
    ["zh-tw", "claude", "pro"], ["ja", "claude", "pro"],
  ] as const) {
    assert.equal(getPlanBillingContent({ locale, productSlug, plan: { ...plan, slug } }), null);
  }
});

test("monthly App Store claims are suppressed for absent, unknown, annual and mixed-platform data", () => {
  const ios = plan.regions[0];
  for (const candidate of [
    { ...plan, regions: [] },
    { ...plan, billing: "yearly" as const },
    { ...plan, billing: "unknown" as const },
    { ...plan, regions: [{ ...ios, billingPlatform: undefined }] },
    { ...plan, regions: [{ ...ios, billingPlatform: "web" }] },
    { ...plan, regions: [ios, { ...ios, billingPlatform: "web" }] },
  ]) {
    assert.equal(getPlanBillingContent({ locale: "en", productSlug: "claude", plan: candidate }), null);
  }
});

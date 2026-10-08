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

test("X guidance covers three approved tiers and suppresses wrong billing scopes", () => {
  for (const locale of ["zh", "en"] as const) {
    for (const slug of ["basic", "premium", "premium-plus"]) {
      const candidate = {...plan, slug};
      assert.equal(getPlanBillingContent({locale, productSlug:"x-premium", plan:candidate})?.faqs.length,4);
      for (const invalid of [{...candidate,billing:"yearly" as const},{...candidate,regions:[]},{...candidate,regions:[{...plan.regions[0],billingPlatform:"web"}]}]) {
        assert.equal(getPlanBillingContent({locale,productSlug:"x-premium",plan:invalid}),null);
      }
    }
  }
  assert.equal(getPlanBillingContent({locale:"ja",productSlug:"x-premium",plan:{...plan,slug:"basic"}}),null);
  assert.equal(getPlanBillingContent({locale:"zh",productSlug:"x-premium",plan:{...plan,slug:"unknown"}}),null);
});


test("Heavy guidance cannot leak into other tiers, products, locales or unsupported price scopes", () => {
  const heavy = { ...plan, slug: "super-heavy", name: "SuperGrok Heavy" };
  for (const locale of ["zh", "en"] as const) {
    const content = getPlanBillingContent({ locale, productSlug: "grok", plan: heavy });
    assert.ok(content);
    assert.equal(content.faqs.length, 2);
    assert.deepEqual(content.sources.map(source => new URL(source.href).hostname), ["x.ai", "help.x.com"]);
    for (const slug of ["super", "super-lite", "plus", "super-plus"]) {
      assert.equal(getPlanBillingContent({ locale, productSlug: "grok", plan: { ...heavy, slug } }), null);
    }
    for (const candidate of [
      { ...heavy, regions: [] },
      { ...heavy, billing: "yearly" as const },
      { ...heavy, billing: "unknown" as const },
      { ...heavy, regions: [{ ...plan.regions[0], billingPlatform: undefined }] },
      { ...heavy, regions: [{ ...plan.regions[0], billingPlatform: "web" }] },
      { ...heavy, regions: [plan.regions[0], { ...plan.regions[0], billingPlatform: "web" }] },
    ]) {
      assert.equal(getPlanBillingContent({ locale, productSlug: "grok", plan: candidate }), null);
    }
  }
  assert.equal(getPlanBillingContent({ locale: "ja", productSlug: "grok", plan: heavy }), null);
  assert.equal(getPlanBillingContent({ locale: "zh-tw", productSlug: "grok", plan: heavy }), null);
  assert.equal(getPlanBillingContent({ locale: "en", productSlug: "other", plan: heavy }), null);
});

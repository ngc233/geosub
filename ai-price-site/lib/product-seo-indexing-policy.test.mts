import assert from "node:assert/strict";
import test from "node:test";
import {
  getPlanSitemapDecision,
  getProductPlanSitemapPromotion,
  getProductRobotsPolicy,
  getProductSeoGateMode,
  getProductSitemapDecision,
} from "./product-seo-indexing-policy.ts";

test("product quality gate defaults to reversible enforcement", () => {
  assert.equal(getProductSeoGateMode(undefined), "enforce");
  assert.equal(getProductSeoGateMode("unknown"), "enforce");
  assert.equal(getProductSeoGateMode("observe"), "observe");
  assert.equal(getProductSeoGateMode("enforce"), "enforce");
});

test("observation reports weak pages without removing them", () => {
  assert.deepEqual(getProductSitemapDecision("hold", "observe"), {
    eligible: false,
    included: true,
    label: "建议暂缓",
    currentAction: "观察模式，当前仍保留",
  });
});

test("enforcement keeps only products that pass the quality bar", () => {
  assert.equal(
    getProductSitemapDecision("indexable", "enforce").included,
    true,
  );
  assert.equal(
    getProductSitemapDecision("needs_work", "enforce").included,
    false,
  );
  assert.equal(getProductSitemapDecision("hold", "enforce").included, false);
});

test("plan sitemap promotion distinguishes promoted waiting and blocked products", () => {
  assert.deepEqual(
    getProductPlanSitemapPromotion({
      productSlug: "chatgpt",
      qualityStatus: "indexable",
      gateMode: "enforce",
      currentPlanCount: 4,
    }),
    {
      state: "promoted",
      label: "套餐已推广",
      productOverviewPages: 2,
      includedPlanPages: 8,
      potentialPlanPages: 8,
      reason:
        "产品概览和当前套餐页已进入本轮 sitemap，后续继续观察搜索表现与转化。",
    },
  );

  const waiting = getProductPlanSitemapPromotion({
    productSlug: "captions",
    qualityStatus: "indexable",
    gateMode: "enforce",
    currentPlanCount: 2,
  });
  assert.equal(waiting.state, "waiting");
  assert.equal(waiting.productOverviewPages, 2);
  assert.equal(waiting.includedPlanPages, 0);
  assert.equal(waiting.potentialPlanPages, 4);

  const blocked = getProductPlanSitemapPromotion({
    productSlug: "captions",
    qualityStatus: "hold",
    gateMode: "enforce",
    currentPlanCount: 2,
  });
  assert.equal(blocked.state, "blocked");
  assert.equal(blocked.productOverviewPages, 0);
  assert.equal(blocked.includedPlanPages, 0);
});

test("robots combines locale and product quality when enforced", () => {
  assert.deepEqual(getProductRobotsPolicy("zh", "indexable", "enforce"), {
    index: true,
    follow: true,
  });
  assert.deepEqual(getProductRobotsPolicy("zh", "hold", "enforce"), {
    index: false,
    follow: true,
  });
  assert.deepEqual(getProductRobotsPolicy("ja", "indexable", "enforce"), {
    index: false,
    follow: true,
  });
  assert.deepEqual(
    getProductRobotsPolicy("zh", "indexable", "enforce", "legacy"),
    {
      index: false,
      follow: true,
    },
  );
});

test("legacy renewal plans stay accessible but never enter search promotion", () => {
  assert.deepEqual(
    getProductRobotsPolicy("zh", "indexable", "observe", "legacy"),
    {
      index: false,
      follow: true,
    },
  );
  assert.equal(getPlanSitemapDecision("legacy", "observe").included, false);
  assert.equal(getPlanSitemapDecision("legacy", "enforce").included, false);
  assert.equal(getPlanSitemapDecision("current", "observe").included, true);
  assert.equal(getPlanSitemapDecision("current", "enforce").included, true);
});

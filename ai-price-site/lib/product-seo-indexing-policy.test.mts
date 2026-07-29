import assert from "node:assert/strict";
import test from "node:test";
import {
  getPlanSitemapDecision,
  getProductRobotsPolicy,
  getProductSeoGateMode,
  getProductSitemapDecision,
} from "./product-seo-indexing-policy.ts";

test("product quality gate defaults to reversible observation", () => {
  assert.equal(getProductSeoGateMode(undefined), "observe");
  assert.equal(getProductSeoGateMode("unknown"), "observe");
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

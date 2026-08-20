import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSeoSearchPagePriorities,
  canonicalizeObservedSearchPath,
  seoSearchPerformanceBaseline,
} from "./seo-search-performance-baseline.ts";
import { getLegacyPricingPlanRedirectPath } from "./pricing-routes.ts";

test("legacy query observations are attributed to stable plan paths", () => {
  assert.equal(
    canonicalizeObservedSearchPath("/en/ai-pricing/chatgpt?plan=pro-5x"),
    "/en/ai-pricing/chatgpt/pro-5x",
  );
  assert.equal(
    canonicalizeObservedSearchPath("/zh/streaming-pricing"),
    "/zh/streaming-pricing",
  );
});

test("every observed legacy plan URL keeps a one-hop canonical redirect target", () => {
  const legacyObservations = seoSearchPerformanceBaseline.filter((observation) =>
    observation.path.includes("?plan="),
  );

  assert.ok(legacyObservations.length > 0);

  for (const observation of legacyObservations) {
    const url = new URL(observation.path, "https://geosub.org");
    const redirectTarget = getLegacyPricingPlanRedirectPath(
      url.pathname,
      url.searchParams.get("plan"),
    );

    assert.equal(
      redirectTarget,
      canonicalizeObservedSearchPath(observation.path),
      observation.path,
    );
    assert.ok(redirectTarget && !redirectTarget.includes("?"));
  }
});

test("cross-engine search priorities favor demand and low CTR opportunities", () => {
  const priorities = buildSeoSearchPagePriorities(seoSearchPerformanceBaseline);
  const englishPro = priorities.find(
    (item) => item.path === "/en/ai-pricing/chatgpt/pro",
  );
  const chinesePlus = priorities.find(
    (item) => item.path === "/zh/ai-pricing/chatgpt/plus",
  );

  assert.ok(englishPro);
  assert.equal(englishPro.impressions, 798);
  assert.equal(englishPro.legacyImpressions, 760);
  assert.match(englishPro.reasons.join(" "), /点击率偏低/);
  assert.ok(chinesePlus);
  assert.ok(chinesePlus.impressions > 2_000);
  assert.ok(priorities[0].score >= priorities.at(-1)!.score);
});

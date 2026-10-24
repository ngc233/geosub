import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSeoSearchPagePriorities,
  groupSeoSearchPagePriorities,
  canonicalizeObservedSearchPath,
  seoSearchPerformanceBaseline,
} from "./seo-search-performance-baseline.ts";
import { getLegacyPricingPlanRedirectPath } from "./pricing-routes.ts";
import { activeSeoExperimentLocks } from "./seo-experiment-locks.ts";

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

test("search priorities keep engines and observation windows separate", () => {
  const row = {
    engine: "google" as const, periodStart: "2026-10-01", periodEnd: "2026-10-07",
    path: "/en/ai-pricing/chatgpt", clicks: 1, impressions: 100,
  };
  const priorities = buildSeoSearchPagePriorities([
    row,
    { ...row, engine: "bing", clicks: 10 },
    { ...row, periodStart: "2026-10-08", periodEnd: "2026-10-14", clicks: 5 },
    { ...row, periodStart: "2026-09-08", clicks: 9 },
  ]);
  assert.equal(priorities.length, 4);
  assert.deepEqual(priorities.map((item) => item.clicks).sort((a, b) => a - b), [1, 5, 9, 10]);
  assert.ok(priorities.every((item) => item.impressions === 100));
  assert.ok(priorities.every((item) => !item.reasons.join(" ").includes("优先改善标题")));
  const windows = groupSeoSearchPagePriorities(priorities);
  assert.equal(windows.length, 4);
  assert.ok(windows.every((window) => window.priorities.every((item) =>
    item.engine === window.engine && item.periodStart === window.periodStart && item.periodEnd === window.periodEnd,
  )));
  assert.deepEqual(groupSeoSearchPagePriorities([]), []);
});

test("same-engine same-window legacy observations merge at their canonical path", () => {
  const priorities = buildSeoSearchPagePriorities([
    { engine: "bing", periodStart: "2026-10-01", periodEnd: "2026-10-07", path: "/en/ai-pricing/chatgpt?plan=pro-5x", clicks: 2, impressions: 100 },
    { engine: "bing", periodStart: "2026-10-01", periodEnd: "2026-10-07", path: "/en/ai-pricing/chatgpt/pro-5x", clicks: 1, impressions: 50 },
  ]);
  assert.equal(priorities.length, 1);
  assert.equal(priorities[0].impressions, 150);
  assert.equal(priorities[0].clicks, 3);
  assert.equal(priorities[0].ctr, 2);
  assert.equal(priorities[0].legacyImpressions, 100);
});

test("active page locks apply across engines and legacy routes without hiding metrics", () => {
  for (const engine of ["google", "bing"] as const) {
    const [priority] = buildSeoSearchPagePriorities([{
      engine, periodStart: "2026-10-01", periodEnd: "2026-10-07",
      path: "/zh/ai-pricing/chatgpt?plan=plus", clicks: 1, impressions: 1000,
    }], activeSeoExperimentLocks);
    assert.equal(priority.tier, "实验锁定");
    assert.equal(priority.experimentId, "zh-chatgpt-plus-bing-2026-08-25");
    assert.equal(priority.clicks, 1);
    assert.match(priority.reasons.join(" "), /仅观察/);
    assert.doesNotMatch(priority.reasons.join(" "), /优先改善标题/);
  }
});

test("historical baseline priorities remain separately attributable", () => {
  const priorities = buildSeoSearchPagePriorities(seoSearchPerformanceBaseline);
  const englishPro = priorities.find(
    (item) => item.path === "/en/ai-pricing/chatgpt/pro" && item.engine === "google",
  );
  const chinesePlus = priorities.find(
    (item) => item.path === "/zh/ai-pricing/chatgpt/plus",
  );

  assert.ok(englishPro);
  assert.equal(englishPro.impressions, 760);
  assert.equal(englishPro.legacyImpressions, 760);
  assert.match(englishPro.reasons.join(" "), /点击率偏低/);
  assert.ok(chinesePlus);
  assert.ok(chinesePlus.impressions > 2_000);
  assert.ok(priorities[0].score >= priorities.at(-1)!.score);
});

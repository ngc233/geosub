import assert from "node:assert/strict";
import test from "node:test";
import { Locale } from "@prisma/client";
import { normalizeSeoPageObservation } from "./seo-page-lifecycle.ts";

function observation(overrides = {}) {
  return {
    locale: Locale.EN,
    pageType: "plan",
    canonicalPath: "/en/ai-pricing/chatgpt/pro-5x/",
    productId: "11111111-1111-1111-1111-111111111111",
    productSlug: "chatgpt",
    planId: "22222222-2222-2222-2222-222222222222",
    planSlug: "pro-5x",
    eligibilityState: "runtime_eligible",
    indexingDecision: "observe_existing_output",
    decisionSource: "runtime_snapshot",
    effectiveAt: new Date("2026-08-31T12:00:00.000Z"),
    reason: "observe only",
    policyVersion: "seo-policy-v2.10",
    finalRobotsIndex: true,
    finalRobotsFollow: true,
    canonicalUrl: "https://geosub.org/en/ai-pricing/chatgpt/pro-5x",
    qualityScore: 92,
    qualityStatus: "indexable",
    sitemapIncluded: true,
    triggerSource: "metadata_render",
    ...overrides,
  };
}

test("observation normalizes page identity and records experiment lock without changing output", () => {
  const normalized = normalizeSeoPageObservation(observation());

  assert.equal(normalized.canonicalPath, "/en/ai-pricing/chatgpt/pro-5x");
  assert.equal(normalized.experimentLocked, true);
  assert.equal(normalized.experimentLockId, "en-chatgpt-pro-5x-2026-08-25");
  assert.equal(normalized.finalRobotsIndex, true);
  assert.equal(normalized.indexingDecision, "observe_existing_output");
});

test("observation rejects locale mismatches and invalid quality scores", () => {
  assert.throws(
    () => normalizeSeoPageObservation(observation({ locale: Locale.ZH })),
    /locale does not match/,
  );
  assert.throws(
    () => normalizeSeoPageObservation(observation({ qualityScore: 101 })),
    /0 to 100/,
  );
  assert.throws(
    () => normalizeSeoPageObservation(observation({ planSlug: null })),
    /planId and planSlug/,
  );
  assert.throws(
    () =>
      normalizeSeoPageObservation(
        observation({ canonicalUrl: "https://geosub.org/en/ai-pricing/chatgpt" }),
      ),
    /must match canonicalPath/,
  );
});

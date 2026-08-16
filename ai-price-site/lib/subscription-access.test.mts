import assert from "node:assert/strict";
import test from "node:test";
import {
  assessSubscriptionAccess,
  getSubscriptionAccessCopy,
} from "./subscription-access.ts";

test("subscription access exposes evidence instead of a model score", () => {
  const assessment = assessSubscriptionAccess({
    billingPlatform: "ios",
    localPriceValue: 999,
    riskRequirements:
      "May require a Philippine Apple ID, local payment method, or gift card.",
    sourceUrl: "https://apps.apple.com/ph/app/id123",
    lastCheckedAt: "2026-08-16",
  });

  assert.equal(assessment.conclusion, "restrictions");
  assert.deepEqual(
    Object.fromEntries(assessment.facts.map((fact) => [fact.key, fact.evidence])),
    {
      store: "confirmed",
      account: "conditional",
      payment: "conditional",
      giftCard: "unknown",
      source: "confirmed",
      checked: "confirmed",
    },
  );
});

test("missing structured requirements remain incomplete rather than low risk", () => {
  const assessment = assessSubscriptionAccess({
    billingPlatform: "ios",
    localPriceValue: 20,
    riskRequirements: undefined,
    sourceUrl: undefined,
    lastCheckedAt: undefined,
  });

  assert.equal(assessment.conclusion, "incomplete");
  assert.equal(
    assessment.facts.find((fact) => fact.key === "account")?.evidence,
    "unknown",
  );
});

test("every prepared locale has natural access-condition copy", () => {
  for (const locale of [
    "zh",
    "zh-tw",
    "en",
    "ja",
    "ko",
    "es",
    "tr",
    "ar",
    "fr",
    "it",
    "de",
    "pt",
  ] as const) {
    const copy = getSubscriptionAccessCopy(locale);
    assert.ok(copy.conclusion.incomplete.length > 0);
    assert.ok(copy.facts.giftCard.length > 0);
    assert.ok(copy.evidence.unknown.length > 0);
  }
});

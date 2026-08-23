import assert from "node:assert/strict";
import test from "node:test";
import {
  assessSubscriptionAccess,
  getSubscriptionAccessCopy,
  isOfficialSubscriptionSource,
} from "./subscription-access.ts";

test("subscription access exposes only automatically verified evidence", () => {
  const assessment = assessSubscriptionAccess({
    code: "PH",
    billingPlatform: "ios",
    localPriceValue: 999,
    sourceUrl: "https://apps.apple.com/ph/app/id123",
    lastCheckedAt: "2026-08-16",
    dataQuality: "verified",
  });

  assert.deepEqual(
    Object.fromEntries(assessment.facts.map((fact) => [fact.key, fact.evidence])),
    {
      store: "confirmed",
      source: "confirmed",
      checked: "confirmed",
    },
  );
});

test("unverified and manual-only conditions are omitted", () => {
  const assessment = assessSubscriptionAccess({
    code: "US",
    billingPlatform: "ios",
    localPriceValue: 20,
    sourceUrl: undefined,
    lastCheckedAt: undefined,
    dataQuality: "pending_review",
  });

  assert.deepEqual(assessment.facts, []);
});

test("official source validation checks platform host and storefront", () => {
  assert.equal(
    isOfficialSubscriptionSource("https://apps.apple.com/tr/app/id123", "ios", "TR"),
    true,
  );
  assert.equal(
    isOfficialSubscriptionSource("https://apps.apple.com/us/app/id123", "ios", "TR"),
    false,
  );
  assert.equal(
    isOfficialSubscriptionSource("https://example.com/tr/app/id123", "ios", "TR"),
    false,
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
    assert.ok(copy.automaticTitle.length > 0);
    assert.ok(copy.facts.store.length > 0);
    assert.ok(copy.facts.source.length > 0);
    assert.ok(copy.facts.checked.length > 0);
  }
});

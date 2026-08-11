import assert from "node:assert/strict";
import test from "node:test";
import {
  ANALYTICS_CONSENT_DENIED,
  ANALYTICS_CONSENT_GRANTED,
  getAnalyticsConsentCopy,
  isAnalyticsConsentRequired,
  parseAnalyticsConsent,
  serializeAnalyticsConsent,
} from "./analytics-consent.ts";

const publicLocales = [
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
] as const;

test("analytics consent stores only the decision and decision time", () => {
  const decidedAtMs = Date.UTC(2026, 7, 11, 12, 30, 45);
  const value = serializeAnalyticsConsent(
    ANALYTICS_CONSENT_GRANTED,
    decidedAtMs,
  );

  assert.equal(value, `granted.${Math.floor(decidedAtMs / 1000)}`);
  assert.equal(parseAnalyticsConsent(value), ANALYTICS_CONSENT_GRANTED);
});

test("analytics consent accepts an explicit denial with its time", () => {
  assert.equal(
    parseAnalyticsConsent("denied.1786451445"),
    ANALYTICS_CONSENT_DENIED,
  );
});

test("analytics consent rejects missing, legacy, or malformed values", () => {
  assert.equal(parseAnalyticsConsent(null), null);
  assert.equal(parseAnalyticsConsent("granted"), null);
  assert.equal(parseAnalyticsConsent("granted.invalid"), null);
  assert.equal(parseAnalyticsConsent("other.1786451445"), null);
  assert.equal(parseAnalyticsConsent("granted.1786451445.extra"), null);
});

test("analytics consent requirement is enabled by default and reversible", () => {
  assert.equal(isAnalyticsConsentRequired(undefined), true);
  assert.equal(isAnalyticsConsentRequired("false"), false);
  assert.equal(isAnalyticsConsentRequired("off"), false);
});

test("every public locale offers equally visible accept and reject copy", () => {
  for (const locale of publicLocales) {
    const copy = getAnalyticsConsentCopy(locale);

    assert.ok(copy.accept.length > 0, `${locale} accept copy is missing`);
    assert.ok(copy.reject.length > 0, `${locale} reject copy is missing`);
    assert.notEqual(copy.accept, copy.reject);
  }
});

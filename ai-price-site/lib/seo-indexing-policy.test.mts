import assert from "node:assert/strict";
import test from "node:test";
import {
  getLocaleRobotsPolicy,
  isSeoIndexableLocale,
  seoIndexableLocaleBudget,
  seoIndexableLocales,
  seoLocalePromotionRequirements,
  seoSitemapBudgets,
} from "./seo-indexing-policy.ts";
import { supportedSiteLocales } from "./site-locale.ts";

test("only deliberately promoted locales are indexable", () => {
  assert.deepEqual(seoIndexableLocales, ["zh", "en"]);
  assert.equal(seoIndexableLocaleBudget, seoIndexableLocales.length);

  for (const locale of supportedSiteLocales) {
    assert.equal(
      isSeoIndexableLocale(locale),
      locale === "zh" || locale === "en",
      locale,
    );
  }
});

test("robots keeps staged translations accessible without indexing them", () => {
  assert.deepEqual(getLocaleRobotsPolicy("zh"), {
    index: true,
    follow: true,
  });
  assert.deepEqual(getLocaleRobotsPolicy("en"), {
    index: true,
    follow: true,
  });

  for (const locale of supportedSiteLocales.filter(
    (candidate) => candidate !== "zh" && candidate !== "en",
  )) {
    assert.deepEqual(
      getLocaleRobotsPolicy(locale),
      { index: false, follow: true },
      locale,
    );
  }
});

test("sitemap budgets stay bounded by the total release budget", () => {
  assert.deepEqual(seoSitemapBudgets, {
    total: 140,
    productPlanPages: 96,
    guideDetailPages: 24,
    currencyPairPages: 16,
  });

  const allocatedPages =
    seoSitemapBudgets.productPlanPages +
    seoSitemapBudgets.guideDetailPages +
    seoSitemapBudgets.currencyPairPages;

  assert.ok(allocatedPages <= seoSitemapBudgets.total);
});

test("locale promotion requires editorial and local decision context", () => {
  assert.deepEqual(seoLocalePromotionRequirements, [
    "localized-editorial-summary",
    "local-currency-context",
    "local-tax-payment-account-notes",
    "localized-search-intent-faq",
    "published-plan-coverage",
  ]);
  assert.equal(new Set(seoLocalePromotionRequirements).size, 5);
});

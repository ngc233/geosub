import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

type PlanSpec = {
  slug: string;
  name: string;
  aliases: string[];
  sort_order: number;
  expected_monthly_usd_min: number;
  expected_monthly_usd_max: number;
};

type ProductSpec = {
  name: string;
  plans: PlanSpec[];
};

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, "../../../..");

const autoReviewSql = readFileSync(
  resolve(repoRoot, "geosub-backend/sql/033_app_store_stability_auto_review_v2.sql"),
  "utf8",
);

const matchingPriceRefreshSql = readFileSync(
  resolve(repoRoot, "geosub-backend/sql/055_refresh_matching_app_store_prices.sql"),
  "utf8",
);

const exactLocalPriceRefreshSql = readFileSync(
  resolve(repoRoot, "geosub-backend/sql/056_refresh_exact_local_app_store_prices.sql"),
  "utf8",
);

const publishedOutlierQuarantineSql = readFileSync(
  resolve(
    repoRoot,
    "geosub-backend/sql/057_quarantine_published_app_store_price_outliers.sql",
  ),
  "utf8",
);

const appStoreCollector = readFileSync(
  resolve(repoRoot, "geosub-backend/scripts/collect-app-store-prices.ps1"),
  "utf8",
);

const productPlanSpecs = JSON.parse(
  readFileSync(resolve(repoRoot, "geosub-backend/data/product-plan-specs.json"), "utf8"),
) as Record<string, ProductSpec>;

test("auto review keeps App Store hard anomalies out of automatic approval", () => {
  assert.match(
    autoReviewSql,
    /ELSIF v_group\.has_anomaly THEN\s+v_decision := 'manual_review';\s+v_reason_code := 'app_store_observation_anomaly';/,
  );
  assert.match(autoReviewSql, /latest_has_anomaly,\s+FALSE\) = FALSE/);
  assert.match(autoReviewSql, /second_has_anomaly,\s+FALSE\) = FALSE/);
});

test("sub-dollar converted App Store prices remain blocked as parsing suspects", () => {
  assert.match(appStoreCollector, /\$ConvertedUsd -lt \[decimal\]1/);
  assert.match(
    autoReviewSql,
    /v_group\.min_converted_usd < 1[\s\S]*v_reason_code := 'app_store_price_suspiciously_low'/,
  );
});

test("global peer outlier guard still catches extreme country-level conversions", () => {
  assert.match(autoReviewSql, /peer_count >= 8/);
  assert.match(autoReviewSql, /g\.stable_converted_usd < peer_median_usd \* 0\.2/);
  assert.match(autoReviewSql, /g\.stable_converted_usd > peer_median_usd \* 3\.5/);
  assert.match(autoReviewSql, /v_reason_code := 'app_store_global_price_outlier'/);
});

test("published App Store peer outliers are automatically quarantined", () => {
  assert.match(publishedOutlierQuarantineSql, /CREATE OR REPLACE FUNCTION quarantine_published_app_store_price_outliers/);
  assert.match(publishedOutlierQuarantineSql, /HAVING COUNT\(\*\) >= p_min_peer_count/);
  assert.match(publishedOutlierQuarantineSql, /published\.price_usd < peer_stats\.median_usd \* p_low_multiplier/);
  assert.match(publishedOutlierQuarantineSql, /published\.price_usd > peer_stats\.median_usd \* p_high_multiplier/);
  assert.match(publishedOutlierQuarantineSql, /status = 'review'/);
  assert.match(publishedOutlierQuarantineSql, /data_quality = 'pending_review'/);
});

test("matching App Store observations refresh published dates and FX conversions", () => {
  assert.match(matchingPriceRefreshSql, /observation\.status = 'pending'/);
  assert.match(
    matchingPriceRefreshSql,
    /auto_review_reason_code' = 'superseded_by_published_price'/,
  );
  assert.match(matchingPriceRefreshSql, /price_usd = matching\.converted_usd/);
  assert.match(matchingPriceRefreshSql, /last_checked_at = matching\.observed_at/);
  assert.match(matchingPriceRefreshSql, /COALESCE\(observation\.anomaly_flag, FALSE\) = FALSE/);
  assert.match(matchingPriceRefreshSql, /observation\.converted_usd >= 1/);
  assert.match(matchingPriceRefreshSql, /<= 0\.02/);
});

test("exact local App Store prices are not blocked by normal FX movement", () => {
  assert.match(
    exactLocalPriceRefreshSql,
    /published\.local_price IS NOT DISTINCT FROM observation\.raw_price/,
  );
  assert.match(
    exactLocalPriceRefreshSql,
    /published\.currency IS NOT DISTINCT FROM observation\.currency/,
  );
  assert.match(exactLocalPriceRefreshSql, /COALESCE\(observation\.anomaly_flag, FALSE\) = FALSE/);
  assert.match(exactLocalPriceRefreshSql, /observation\.converted_usd >= 1/);
  assert.doesNotMatch(exactLocalPriceRefreshSql, /ABS\(\(observation\.converted_usd - published\.price_usd\)/);
});

test("collector compares parsed App Store prices against plan-specific USD ranges", () => {
  assert.match(appStoreCollector, /expected_monthly_usd_min/);
  assert.match(appStoreCollector, /expected_monthly_usd_max/);
  assert.match(appStoreCollector, /Converted App Store price is below the expected range/);
  assert.match(appStoreCollector, /Converted App Store price is above the expected range/);
  assert.match(appStoreCollector, /runnerUpExpectedFitPenalty/);
});

test("tracked products and plans keep explicit sanity ranges", () => {
  for (const productSlug of ["chatgpt", "claude", "disney", "gemini", "grok", "manus", "netflix"]) {
    assert.ok(productPlanSpecs[productSlug], `${productSlug} should stay in the plan specs`);
  }

  for (const [productSlug, product] of Object.entries(productPlanSpecs)) {
    assert.ok(product.name, `${productSlug} should have a display name`);
    assert.ok(product.plans.length > 0, `${productSlug} should have at least one plan`);

    for (const plan of product.plans) {
      const label = `${productSlug}/${plan.slug}`;
      assert.ok(plan.name, `${label} should have a plan name`);
      assert.ok(Array.isArray(plan.aliases) && plan.aliases.length > 0, `${label} should have aliases`);
      assert.ok(Number.isFinite(plan.sort_order), `${label} should have a sort order`);
      assert.ok(
        Number.isFinite(plan.expected_monthly_usd_min) && plan.expected_monthly_usd_min >= 0,
        `${label} should have a valid minimum USD sanity range`,
      );
      assert.ok(
        Number.isFinite(plan.expected_monthly_usd_max) &&
          plan.expected_monthly_usd_max > plan.expected_monthly_usd_min,
        `${label} should have a valid maximum USD sanity range`,
      );
    }
  }
});

test("Disney App Store plans collapse to three canonical monthly tiers", () => {
  const disney = productPlanSpecs.disney;
  assert.ok(disney, "Disney+ should have a product-specific plan spec");
  assert.deepEqual(
    disney.plans.map((plan) => plan.slug),
    ["standard-with-ads", "standard", "premium"],
  );

  const aliases = disney.plans.flatMap((plan) => plan.aliases);
  for (const localizedAlias of [
    "estandar con anuncios",
    "padrao mensal",
    "スタンダード",
    "프리미엄",
    "高級",
  ]) {
    assert.ok(aliases.includes(localizedAlias), `missing Disney+ alias: ${localizedAlias}`);
  }
});

test("App Store plan matching preserves non-Latin names and excludes non-monthly artifacts", () => {
  assert.ok(
    appStoreCollector.includes('"[^\\p{L}\\p{N}]+"'),
    "plan matching should preserve Unicode letters and numbers",
  );
  assert.match(appStoreCollector, /premier\\s\+access/);
  assert.match(appStoreCollector, /jaarabonnement/);
  assert.match(appStoreCollector, /CountryCode\.ToUpperInvariant\(\) -ne "US"/);
  assert.match(
    appStoreCollector,
    /Should-IgnoreInAppPurchase -ItemName \$item\.Name -CountryCode \$code/,
  );
});

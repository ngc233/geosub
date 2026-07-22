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
  price_selection_strategy?: string;
  expected_range_tolerance_percent?: number;
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

const selectionFalsePositiveReclassificationSql = readFileSync(
  resolve(
    repoRoot,
    "geosub-backend/sql/060_reclassify_app_store_selection_false_positives.sql",
  ),
  "utf8",
);
const supersededAmbiguitySql = readFileSync(
  resolve(repoRoot, "geosub-backend/sql/071_archive_superseded_app_store_ambiguities.sql"),
  "utf8",
);

const legacyTierCleanupSql = readFileSync(
  resolve(
    repoRoot,
    "geosub-backend/sql/061_ignore_legacy_non_primary_app_store_tiers.sql",
  ),
  "utf8",
);

const availabilitySemanticsSql = readFileSync(
  resolve(
    repoRoot,
    "geosub-backend/sql/067_app_store_availability_semantics.sql",
  ),
  "utf8",
);

const appStoreCollector = readFileSync(
  resolve(repoRoot, "geosub-backend/scripts/collect-app-store-prices.ps1"),
  "utf8",
);

const appStoreRenderer = readFileSync(
  resolve(repoRoot, "geosub-backend/scripts/render-app-store-prices.mjs"),
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
  assert.match(appStoreCollector, /ReadAllText\(\$specPath, \[Text\.Encoding\]::UTF8\)/);
  assert.match(appStoreCollector, /expected_monthly_usd_min/);
  assert.match(appStoreCollector, /expected_monthly_usd_max/);
  assert.match(appStoreCollector, /Converted App Store price is below the expected range/);
  assert.match(appStoreCollector, /Converted App Store price is above the expected range/);
  assert.match(appStoreCollector, /runnerUpExpectedFitPenalty/);
  assert.match(appStoreCollector, /expected_range_tolerance_percent/);
  assert.match(appStoreCollector, /\$tolerancePercent = \[decimal\]3/);
});

test("rendered App Store JSON crosses the PowerShell boundary as UTF-8", () => {
  assert.match(appStoreRenderer, /args\.get\("output-file"\)/);
  assert.match(appStoreRenderer, /writeFileSync\(outputFile, serializedResult, "utf8"\)/);
  assert.match(appStoreCollector, /ReadAllText\(\$outputPath, \[Text\.Encoding\]::UTF8\)/);
  assert.match(appStoreCollector, /Remove-Item -LiteralPath \$outputPath/);
});

test("static App Store fallback decodes the original response bytes as UTF-8", () => {
  assert.match(appStoreCollector, /function Get-Utf8ResponseContent/);
  assert.match(appStoreCollector, /ReadAsByteArrayAsync\(\)/);
  assert.match(appStoreCollector, /RawContentStream/);
  assert.match(appStoreCollector, /New-Object Text\.UTF8Encoding\(\$false, \$true\)/);
  assert.match(appStoreCollector, /Html = Get-Utf8ResponseContent -Response \$response/);
  assert.doesNotMatch(appStoreCollector, /Html = \$response\.Content/);
});

test("visible but unmatched App Store items remain retryable coverage gaps", () => {
  assert.match(availabilitySemanticsSql, /'available_unmatched_items'/);
  assert.match(availabilitySemanticsSql, /item_count > 0/);
  assert.match(availabilitySemanticsSql, /subscription_item_count = 0/);
  assert.match(appStoreCollector, /\$renderedPageHadNoItems = \$true/);
  assert.match(
    appStoreCollector,
    /\$items\.Count -eq 0 -and !\$renderedPageHadNoItems/,
  );
  assert.match(
    appStoreCollector,
    /\$availabilityStatus = "available_unmatched_items"/,
  );
  assert.match(
    appStoreCollector,
    /none matched the maintained subscription plan specification/,
  );
  assert.doesNotMatch(
    availabilitySemanticsSql,
    /DELETE FROM app_store_availability_checks/,
  );
});

test("tiered App Store plans can explicitly choose their lowest valid monthly tier", () => {
  assert.equal(productPlanSpecs.manus.plans.find((plan) => plan.slug === "pro")?.price_selection_strategy, "lowest_in_expected_range");
  assert.match(appStoreCollector, /Get-AppStorePriceSelectionStrategy/);
  assert.match(appStoreCollector, /\$hasExplicitTierStrategy/);
  assert.match(appStoreCollector, /if \(\$strategy -eq "lowest_in_expected_range"\)/);
});

test("existing collector false positives are reclassified without publishing them directly", () => {
  assert.match(selectionFalsePositiveReclassificationSql, /product\.slug = 'manus'/);
  assert.match(selectionFalsePositiveReclassificationSql, /product\.slug = 'netflix'/);
  assert.match(selectionFalsePositiveReclassificationSql, /observation\.anomaly_flag = TRUE/);
  assert.match(selectionFalsePositiveReclassificationSql, /anomaly_flag = FALSE/);
  assert.match(selectionFalsePositiveReclassificationSql, /observation\.status = 'pending'/);
  assert.doesNotMatch(selectionFalsePositiveReclassificationSql, /status\s*=\s*'approved'/);
});

test("newer exact local prices archive superseded ambiguous evidence generically", () => {
  assert.match(supersededAmbiguitySql, /archive_superseded_app_store_ambiguities/);
  assert.match(supersededAmbiguitySql, /published\.local_price IS NOT DISTINCT FROM observation\.raw_price/);
  assert.match(supersededAmbiguitySql, /published\.currency IS NOT DISTINCT FROM observation\.currency/);
  assert.match(supersededAmbiguitySql, /published\.last_checked_at >= observation\.observed_at/);
  assert.match(supersededAmbiguitySql, /AFTER INSERT OR UPDATE OF/);
  assert.match(supersededAmbiguitySql, /superseded_by_published_price/);
  assert.doesNotMatch(supersededAmbiguitySql, /product\.slug\s*=/);
});

test("legacy non-primary App Store tiers are retained as ignored evidence", () => {
  assert.match(legacyTierCleanupSql, /product\.slug = 'manus'/);
  assert.match(legacyTierCleanupSql, /plan\.slug = 'pro'/);
  assert.match(legacyTierCleanupSql, /status = 'ignored'/);
  assert.match(legacyTierCleanupSql, /superseded_non_primary_app_store_tier/);
  assert.match(legacyTierCleanupSql, /observation\.converted_usd > 140\.0 \* 1\.03/);
  assert.doesNotMatch(legacyTierCleanupSql, /DELETE FROM price_observations/);
  assert.doesNotMatch(legacyTierCleanupSql, /status\s*=\s*'approved'/);
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
    "広告付きスタンダード",
    "스탠다드",
    "高级套餐",
  ]) {
    assert.ok(aliases.includes(localizedAlias), `missing Disney+ alias: ${localizedAlias}`);
  }
});

test("Netflix plan aliases cover common localized screen-count labels", () => {
  const netflix = productPlanSpecs.netflix;
  assert.ok(netflix, "Netflix should have a product-specific plan spec");

  const aliasesByPlan = Object.fromEntries(
    netflix.plans.map((plan) => [plan.slug, plan.aliases]),
  );
  assert.ok(aliasesByPlan.basic.includes("basico"));
  assert.ok(aliasesByPlan.basic.includes("1 pantalla"));
  assert.ok(aliasesByPlan.standard.includes("2 telas"));
  assert.ok(aliasesByPlan.standard.includes("2 gerate"));
  assert.ok(aliasesByPlan.standard.includes("2 gerate gleichzeitig"));
  assert.ok(aliasesByPlan.premium.includes("4 telas"));
  assert.ok(aliasesByPlan.premium.includes("4 gerate"));
  assert.ok(aliasesByPlan.premium.includes("4 gerate gleichzeitig"));
});

test("Netflix plan aliases cover maintained East Asian storefront labels", () => {
  const netflix = productPlanSpecs.netflix;
  const aliases = Object.fromEntries(
    netflix.plans.map((plan) => [plan.slug, new Set(plan.aliases)]),
  );

  for (const alias of ["ベーシック", "기본", "基本", "單螢幕"]) {
    assert.ok(aliases.basic.has(alias), `basic should match ${alias}`);
  }
  for (const alias of ["スタンダード", "스탠다드", "標準", "雙螢幕"]) {
    assert.ok(aliases.standard.has(alias), `standard should match ${alias}`);
  }
  for (const alias of ["プレミアム", "프리미엄", "高級", "四螢幕"]) {
    assert.ok(aliases.premium.has(alias), `premium should match ${alias}`);
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

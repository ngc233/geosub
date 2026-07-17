import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const appDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(appDir, "..");

function readProjectFile(fileName: string) {
  return readFileSync(resolve(rootDir, fileName), "utf8");
}

test("release preflight keeps the price quality gate in front of build", () => {
  const packageJson = JSON.parse(readProjectFile("package.json")) as {
    scripts?: Record<string, string>;
  };

  assert.match(packageJson.scripts?.["preflight:full"] || "", /npm run check:local/);
  assert.match(packageJson.scripts?.["preflight:full"] || "", /npm run check:prices/);
  assert.match(packageJson.scripts?.["preflight:full"] || "", /npm run preflight:code/);
});

test("price quality gate fails published App Store sub-dollar prices", () => {
  const source = readProjectFile("scripts/check-price-quality.cjs");

  assert.match(source, /GEOSUB_MIN_PUBLISHED_SUBSCRIPTION_USD \|\| 1/);
  assert.match(source, /rp\.status = 'published'/);
  assert.match(source, /rp\.billing_platform = 'ios'/);
  assert.match(source, /rp\.price_usd < \$2/);
  assert.match(source, /failures\.push\([\s\S]*published App Store price\(s\) are below/);
  assert.match(source, /printRow\("fail", "sub-dollar published"/);
});

test("price quality gate reports stale published data and extreme median outliers", () => {
  const source = readProjectFile("scripts/check-price-quality.cjs");

  assert.match(source, /GEOSUB_MAX_PUBLISHED_PRICE_AGE_DAYS \|\| 14/);
  assert.match(source, /latest published price check is older than/);
  assert.match(source, /percentile_cont\(0\.5\) WITHIN GROUP \(ORDER BY price_usd\)/);
  assert.match(source, /published\.price_usd < stats\.median_usd \* 0\.2/);
  assert.match(source, /published\.price_usd > stats\.median_usd \* 3\.5/);
  assert.match(source, /published price\(s\) are extreme versus plan median/);
});

test("price quality gate requires tax profiles for published App Store countries", () => {
  const source = readProjectFile("scripts/check-price-quality.cjs");

  assert.match(source, /"country_tax_profiles"/);
  assert.match(source, /async function checkTaxProfileCoverage/);
  assert.match(source, /LEFT JOIN country_tax_profiles tax/);
  assert.match(source, /tax\.status = 'active'/);
  assert.match(source, /missing_country_count/);
  assert.match(source, /published App Store country\/countries are missing tax profiles/);
  assert.match(source, /await checkTaxProfileCoverage\(client\)/);
});

test("price quality gate discovers every active App Store product", () => {
  const source = readProjectFile("scripts/check-price-quality.cjs");

  assert.doesNotMatch(source, /chatgpt,claude,gemini,grok,netflix/);
  assert.match(source, /async function resolveTrackedProducts/);
  assert.match(source, /collector_jobs\.job_config ->> 'collector_kind' = 'app_store'/);
  assert.match(source, /collector_jobs\.status = 'active'/);
  assert.match(source, /const trackedProducts = await resolveTrackedProducts\(client\)/);
  assert.match(source, /async function checkAppStoreProductRunFreshness/);
  assert.match(source, /GEOSUB_MAX_APP_STORE_PRODUCT_RUN_AGE_DAYS \|\| 8/);
  assert.match(source, /await checkAppStoreProductRunFreshness\(client, trackedProducts\)/);
});

test("price quality gates reject globally unrefreshed exact-local prices", () => {
  const source = readProjectFile("scripts/check-price-quality.cjs");
  const postDeploy = readProjectFile(
    "../geosub-backend/deploy/linux-arm64/post-deploy-check.sh"
  );

  for (const script of [source, postDeploy]) {
    assert.match(script, /unrefreshed|Unrefreshed|exact-local/);
    assert.match(script, /published\.local_price IS NOT DISTINCT FROM observation\.raw_price/);
    assert.match(script, /published\.currency IS NOT DISTINCT FROM observation\.currency/);
    assert.match(script, /COALESCE\(observation\.anomaly_flag, FALSE\) = FALSE/);
  }

  assert.doesNotMatch(postDeploy, /p\.slug IN \('chatgpt'/);
  assert.match(postDeploy, /all active App Store products have published coverage/);
  assert.match(postDeploy, /all active App Store products collected within/);
});

test("price quality gate requires the database automation functions", () => {
  const source = readProjectFile("scripts/check-price-quality.cjs");

  assert.match(source, /async function requireDatabaseFunctions/);
  assert.match(source, /run_app_store_stability_auto_review/);
  assert.match(source, /queue_app_store_anomaly_rechecks/);
  assert.match(source, /refresh_plan_affordability_metrics/);
  assert.match(source, /refresh_matching_app_store_prices/);
  assert.match(source, /quarantine_published_app_store_price_outliers/);
  assert.match(source, /refresh_inferred_app_store_tax_profiles/);
  assert.match(source, /Missing required database function\(s\)/);
});

test("the current Disney plan repair is a required core migration", () => {
  const migrationName = "sql/058_normalize_disney_app_store_plans.sql";
  const migrationRunner = readProjectFile(
    "../geosub-backend/deploy/linux-arm64/db-apply-sql.sh"
  );
  const postDeploy = readProjectFile(
    "../geosub-backend/deploy/linux-arm64/post-deploy-check.sh"
  );

  assert.ok(migrationRunner.includes(migrationName));
  assert.ok(postDeploy.includes(migrationName));
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  migrationEntriesForLegacyFile,
  readSqlMigration,
} from "../test-utils/sql-migrations.mts";

const appDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(appDir, "../..");

function readRepoFile(fileName: string) {
  return readFileSync(resolve(repoRoot, fileName), "utf8");
}

test("applied affordability migration remains immutable", () => {
  const entries = migrationEntriesForLegacyFile(
    "sql/010_refresh_affordability_function.sql",
  );
  assert.ok(
    entries.some((entry) =>
      entry.legacyChecksums.includes(
        "19c9113975d835e3c1a53a7945007e3c2afbfea37b3044417f57394e3a7ca3aa",
      ),
    ),
  );
});

test("affordability refresh uses the same published App Store price scope as V1 rankings", () => {
  const source = readSqlMigration("sql/054_refresh_affordability_app_store_scope.sql");

  assert.match(source, /DELETE FROM plan_affordability_metrics pam/);
  assert.match(source, /NOT EXISTS \([\s\S]*rp\.billing_platform = 'ios'/);
  assert.match(source, /WHERE rp\.status = 'published'/);
  assert.match(source, /rp\.billing_platform = 'ios'/);
  assert.match(source, /rp\.price_usd IS NOT NULL/);
  assert.match(source, /pl\.status = 'published'/);
  assert.doesNotMatch(source, /WHEN rp\.billing_platform = 'web'/);
});

test("public detail pages read affordability from the shared database view", () => {
  const zhPage = readRepoFile("ai-price-site/app/zh/ai-pricing/[slug]/page.tsx");
  const enPage = readRepoFile("ai-price-site/app/en/ai-pricing/[slug]/page.tsx");
  const sharedPage = readRepoFile("ai-price-site/components/PricingDetailPage.tsx");
  const affordabilityLib = readRepoFile("ai-price-site/lib/affordability.ts");

  assert.match(zhPage, /<PricingDetailPage \{\.\.\.props\} locale="zh"/);
  assert.match(enPage, /<PricingDetailPage \{\.\.\.props\} locale="en"/);
  assert.match(sharedPage, /getCachedPlanAffordability\(product\.slug, activePlan\.slug\)/);
  assert.match(
    sharedPage,
    /\(\) => getPlanAffordability\(productSlug, planSlug\)/,
  );
  assert.match(sharedPage, /<AffordabilityComparison/);
  assert.match(sharedPage, /locale=\{locale\}/);
  assert.match(affordabilityLib, /FROM plan_affordability_summary_view/);
  assert.match(affordabilityLib, /FROM plan_affordability_detail_view/);
  assert.match(affordabilityLib, /ORDER BY affordability\.income_share_percent DESC/);
  assert.match(affordabilityLib, /LEFT JOIN latest_big_mac_prices/);
  assert.match(affordabilityLib, /assessAffordabilityQuality/);
  assert.match(affordabilityLib, /coverageRatio < 0\.8/);
  assert.match(affordabilityLib, /missing_us_baseline/);
  assert.match(affordabilityLib, /stale_income_data/);
});

test("local affordability preview is isolated and quality-gated", () => {
  const previewScript = readRepoFile(
    "ai-price-site/scripts/refresh-local-affordability-preview.cjs",
  );
  const packageJson = readRepoFile("ai-price-site/package.json");

  assert.match(previewScript, /allowedLocalHosts/);
  assert.match(previewScript, /Refusing to update a non-local database host/);
  assert.match(previewScript, /source_summary = 'Seeded local demo source'/);
  assert.match(previewScript, /'ios'::billing_platform/);
  assert.match(previewScript, /refresh_plan_affordability_metrics\('chatgpt', 'plus'\)/);
  assert.match(previewScript, /coverage >= 0\.8/);
  assert.match(previewScript, /ROLLBACK/);
  assert.match(packageJson, /"preview:affordability"/);
});

test("collector success refreshes affordability and invalidates shared pricing data", () => {
  const collectorRunner = readRepoFile("geosub-backend/scripts/run-collector-jobs.ps1");
  const adminRunner = readRepoFile("ai-price-site/app/admin/review/collection-runner.ts");

  assert.match(collectorRunner, /refresh_matching_app_store_prices\(\)/);
  assert.match(collectorRunner, /run_app_store_stability_auto_review\(FALSE, 3, 80, 14\)/);
  assert.match(collectorRunner, /quarantine_published_app_store_price_outliers\(\)/);
  assert.match(collectorRunner, /SELECT refresh_plan_affordability_metrics\(\) AS refreshed_rows/);
  assert.ok(
    collectorRunner.indexOf("refresh_matching_app_store_prices()") <
      collectorRunner.indexOf("run_app_store_stability_auto_review(FALSE, 3, 80, 14)"),
    "matching published prices should refresh before duplicate observations are archived",
  );
  assert.ok(
    collectorRunner.indexOf("quarantine_published_app_store_price_outliers()") <
      collectorRunner.indexOf("refresh_plan_affordability_metrics()"),
    "published outliers should be quarantined before affordability is refreshed",
  );
  assert.match(
    adminRunner,
    /invalidatePublicPricing\(productSlug \|\| null\)/,
    "the admin completion path should invalidate the shared product cache instead of naming one page",
  );
});

test("collector runner keeps product identity stable and serializes shell launches", () => {
  const collectorRunner = readRepoFile("geosub-backend/scripts/run-collector-jobs.ps1");
  const shellRunner = readRepoFile("geosub-backend/deploy/linux-arm64/run-collector-jobs.sh");
  const serviceUnit = readRepoFile(
    "geosub-backend/deploy/linux-arm64/systemd/geosub-collector-jobs.service",
  );
  const postDeploy = readRepoFile(
    "geosub-backend/deploy/linux-arm64/post-deploy-check.sh",
  );

  assert.match(collectorRunner, /& \$scriptPath @scriptParameters/);
  assert.match(collectorRunner, /Collector identity mismatch/);
  assert.doesNotMatch(collectorRunner, /-File \$scriptPath @arguments/);
  assert.match(shellRunner, /flock 9/);
  assert.match(shellRunner, /GEOSUB_COLLECTOR_LOCK_FILE/);
  assert.match(shellRunner, /GEOSUB_COLLECTOR_LOCK_DIR/);
  assert.doesNotMatch(shellRunner, /\/tmp\/geosub-collector-jobs\.lock/);
  assert.match(serviceUnit, /RuntimeDirectory=geosub/);
  assert.match(serviceUnit, /GEOSUB_COLLECTOR_LOCK_DIR=\/run\/geosub/);
  assert.match(postDeploy, /check_unit_not_failed "geosub-collector-jobs\.service"/);
});

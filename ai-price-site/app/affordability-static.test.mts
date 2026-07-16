import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const appDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(appDir, "../..");

function readRepoFile(fileName: string) {
  return readFileSync(resolve(repoRoot, fileName), "utf8");
}

test("applied affordability migration remains immutable", () => {
  const source = readRepoFile("geosub-backend/sql/010_refresh_affordability_function.sql");
  const checksum = createHash("sha256").update(source.replace(/\r/g, "")).digest("hex");

  assert.equal(checksum, "19c9113975d835e3c1a53a7945007e3c2afbfea37b3044417f57394e3a7ca3aa");
});

test("affordability refresh uses the same published App Store price scope as V1 rankings", () => {
  const source = readRepoFile("geosub-backend/sql/054_refresh_affordability_app_store_scope.sql");

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
  const affordabilityLib = readRepoFile("ai-price-site/lib/affordability.ts");

  assert.match(zhPage, /getPlanAffordability\(product\.slug, activePlan\.slug\)/);
  assert.match(enPage, /getPlanAffordability\(product\.slug, activePlan\.slug\)/);
  assert.match(zhPage, /<AffordabilityComparison/);
  assert.match(enPage, /<AffordabilityComparison/);
  assert.match(affordabilityLib, /FROM plan_affordability_summary_view/);
  assert.match(affordabilityLib, /FROM plan_affordability_detail_view/);
  assert.match(affordabilityLib, /ORDER BY income_share_percent DESC/);
});

test("collector success refreshes affordability after App Store auto review", () => {
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
  assert.match(adminRunner, /revalidatePath\("\/admin\/affordability"\)/);
});

test("collector runner keeps product identity stable and serializes shell launches", () => {
  const collectorRunner = readRepoFile("geosub-backend/scripts/run-collector-jobs.ps1");
  const shellRunner = readRepoFile("geosub-backend/deploy/linux-arm64/run-collector-jobs.sh");

  assert.match(collectorRunner, /& \$scriptPath @scriptParameters/);
  assert.match(collectorRunner, /Collector identity mismatch/);
  assert.doesNotMatch(collectorRunner, /-File \$scriptPath @arguments/);
  assert.match(shellRunner, /flock 9/);
  assert.match(shellRunner, /GEOSUB_COLLECTOR_LOCK_FILE/);
});

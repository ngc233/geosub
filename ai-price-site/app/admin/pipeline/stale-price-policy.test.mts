import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(testDir, "../../..");
const repoRoot = resolve(appRoot, "..");

function readAppFile(fileName: string) {
  return readFileSync(resolve(appRoot, fileName), "utf8");
}

function readRepoFile(fileName: string) {
  return readFileSync(resolve(repoRoot, fileName), "utf8");
}

test("pipeline marks published App Store prices stale by last checked date", () => {
  const source = readAppFile("app/admin/pipeline/page.tsx");

  assert.match(source, /published_stale_price_count/);
  assert.match(source, /price\.status = 'published'::publish_status/);
  assert.match(source, /price\.billing_platform = 'ios'::billing_platform/);
  assert.match(source, /price\.price_usd IS NOT NULL/);
  assert.match(source, /price\.last_checked_at < NOW\(\) - INTERVAL '14 days'/);
  assert.match(source, /published_stale_price_count = 0/);
  assert.match(source, /latest_price_checked_at IS NOT NULL/);
  assert.match(source, /label: "需复采"/);
  assert.match(source, /正式 App Store 价格超过 14 天未更新/);
  assert.match(source, /正式价超过 14 天/);
  assert.match(source, /最新 \$\{formatDate\(row\.latest_price_checked_at\)\}/);
});

test("pipeline recommendation uses published price freshness instead of only collector run age", () => {
  const source = readAppFile("app/admin/pipeline/page.tsx");

  assert.match(source, /published_stale_price_count > 0/);
  assert.match(source, /latest_price_checked_at IS NULL/);
  assert.match(source, /超过 14 天未更新的正式 App Store 价格/);
  assert.doesNotMatch(source, /超过 24 小时没有成功采集记录/);
});

test("scheduled App Store maintenance keeps daily, weekly and anomaly recheck layers", () => {
  const source = readRepoFile("geosub-backend/sql/043_app_store_collection_schedule_policy.sql");
  const qualityGate = readAppFile("scripts/check-price-quality.cjs");

  assert.match(source, /schedule_strategy', 'daily_light'/);
  assert.match(source, /accuracy_policy', 'daily_core_regions'/);
  assert.match(source, /schedule_strategy', 'weekly_full'/);
  assert.match(source, /accuracy_policy', 'weekly_common_regions'/);
  assert.match(source, /queue_app_store_anomaly_rechecks/);
  assert.match(source, /accuracy_policy', 'anomaly_recheck'/);
  assert.match(qualityGate, /GEOSUB_MAX_PUBLISHED_PRICE_AGE_DAYS \|\| 14/);
  assert.match(qualityGate, /latest published price check is older than/);
});

test("stale published prices get a focused retry lifecycle", () => {
  const lifecycle = readRepoFile("geosub-backend/sql/059_stale_app_store_price_lifecycle.sql");
  const runner = readRepoFile("geosub-backend/scripts/run-collector-jobs.ps1");
  const maintenance = readRepoFile("geosub-backend/scripts/run-price-accuracy-maintenance.ps1");
  const migrations = readRepoFile("geosub-backend/deploy/linux-arm64/db-apply-sql.sh");
  const deployCheck = readRepoFile("geosub-backend/deploy/linux-arm64/post-deploy-check.sh");

  assert.match(lifecycle, /queue_stale_app_store_price_rechecks/);
  assert.match(lifecycle, /schedule_strategy', 'stale_refresh'/);
  assert.match(lifecycle, /queued_reason', 'stale_published_prices'/);
  assert.match(lifecycle, /p_retry_cooldown_hours INTEGER DEFAULT 24/);
  assert.match(lifecycle, /p_min_successful_rechecks INTEGER DEFAULT 3/);
  assert.match(lifecycle, /status = 'review'/);
  assert.match(lifecycle, /UPPER\(country\.code\) = ANY\(stale_job\.country_codes\)/);
  assert.match(lifecycle, /availability\.status IN \('not_available', 'available_no_iap'\)/);
  assert.match(runner, /Queue-AppStoreRechecks/);
  assert.match(runner, /queue_stale_app_store_price_rechecks\(14, 20, 24\)/);
  assert.match(runner, /quarantine_unconfirmed_stale_app_store_prices\(14, 3\)/);
  assert.match(runner, /\$Job\.schedule -eq "stale_refresh"/);
  assert.match(runner, /\$jobStatusSql = "'paused'"/);
  assert.match(maintenance, /published prices older than 14 days/);
  assert.match(migrations, /sql\/059_stale_app_store_price_lifecycle\.sql/);
  assert.match(deployCheck, /sql\/059_stale_app_store_price_lifecycle\.sql/);
});

test("admin data quality pages use the same fourteen day freshness policy", () => {
  const overview = readAppFile("app/admin/data-quality/page.tsx");
  const detail = readAppFile("app/admin/data-quality/[slug]/page.tsx");

  assert.match(overview, /INTERVAL '14 days'/);
  assert.doesNotMatch(overview, /INTERVAL '7 days'/);
  assert.match(overview, /price\.billing_platform::text = 'ios'/);
  assert.match(overview, /自动复采已排队/);
  assert.match(overview, /stale_refresh_success_count/);
  assert.match(detail, /INTERVAL '14 days'/);
  assert.doesNotMatch(detail, /INTERVAL '7 days'/);
  assert.match(detail, /三轮仍无法确认的价格会移出前台/);
});

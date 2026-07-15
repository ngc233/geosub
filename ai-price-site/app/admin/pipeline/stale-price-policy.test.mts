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

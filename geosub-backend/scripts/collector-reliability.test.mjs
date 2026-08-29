import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const scriptsDir = import.meta.dirname;
const runner = await readFile(path.join(scriptsDir, "run-collector-jobs.ps1"), "utf8");
const collector = await readFile(path.join(scriptsDir, "collect-app-store-prices.ps1"), "utf8");
const renderer = await readFile(path.join(scriptsDir, "render-app-store-prices.mjs"), "utf8");
const officialWebCollector = await readFile(
  path.join(scriptsDir, "collect-official-web-prices.mjs"),
  "utf8",
);

test("scheduled collection includes AI and streaming pricing jobs", () => {
  assert.match(runner, /job\.job_type IN \('ai_pricing', 'streaming_pricing'\)/);
});
test("App Store transient failures remain active and retry only failed countries", () => {
  assert.match(runner, /app_store_partial_retry/);
  assert.match(runner, /app_store_transient_retry/);
  assert.match(runner, /retry_country_codes/);
  assert.match(
    runner,
    /\$retryableAppStoreFailure[\s\S]*?\$jobStatusSql = "'active'"/,
  );
  assert.match(
    runner,
    /retry_exhausted[\s\S]*?Temporary storefront failures must be retried/,
  );
});

test("collector emits a machine-readable country-level outcome", () => {
  assert.match(collector, /transientCountryCodes/);
  assert.match(collector, /collection_outcome/);
  assert.match(collector, /\$machineSummaryJson = \$machineSummary \| ConvertTo-Json/);
  assert.match(
    collector,
    /throw "App Store collection incomplete\.[\s\S]*?`nGEOSUB_COLLECTION_RESULT=\$machineSummaryJson"/,
  );
  assert.match(runner, /Get-CollectionResultFromText/);
  assert.match(runner, /storefront_evidence/);
});

test("App Store parsing has DOM and embedded metadata paths", () => {
  assert.match(collector, /"textPairs"/);
  assert.match(renderer, /text-pair-dom/);
  assert.match(renderer, /embedded-json/);
  assert.match(renderer, /hasInAppPurchasesSection/);
});

test("official Web parsing remains generic and pending-only", () => {
  assert.match(runner, /official_web_source_key/);
  assert.match(runner, /collect-official-web-prices\.mjs/);
  assert.match(runner, /plan_billing_cycle/);
  assert.match(runner, /& node @nodeArguments/);
  assert.doesNotMatch(runner, /"apple-music"\s*\{/);
  assert.match(officialWebCollector, /'pending'::observation_status/);
  assert.match(officialWebCollector, /'web'::billing_platform/);
  assert.match(officialWebCollector, /raw_price, currency, converted_usd/);
  assert.match(officialWebCollector, /\$6, \$7, NULL/);
  assert.match(officialWebCollector, /pilot: source\.pilot === true/);
  assert.match(officialWebCollector, /source\.evidence_note/);
  assert.match(officialWebCollector, /canonical_plan_billing_cycle_mismatch/);
  assert.doesNotMatch(officialWebCollector, /Apple Music|apple-music|apple_music/);
});

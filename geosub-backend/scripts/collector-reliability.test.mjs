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

test("software without a canonical plan spec stops before creating App Store plans", () => {
  assert.match(collector, /SELECT id, slug, name, category, status\s+FROM products/);
  const guard = collector.indexOf("Software product '$ProductSlug' requires a maintained subscription plan specification");
  const sourceWrite = collector.indexOf("$sourceId = Ensure-AppStoreSource", guard);
  const planWrite = collector.indexOf("$plan = Ensure-Plan `", guard);
  assert.ok(guard > 0 && sourceWrite > guard && planWrite > guard);
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
  assert.doesNotMatch(officialWebCollector, /source\.product_slug\s*===/);
});

test("actual batch runner exposes failed children and retains narrow legacy job scope", async () => {
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync(process.platform === "win32" ? "powershell.exe" : "pwsh", [
    "-NoProfile", "-NonInteractive", "-File", path.join(scriptsDir, "../tests/collector-batch-reliability.ps1"),
  ], { encoding: "utf8", timeout: 20_000 });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /PASS: legacy official-site scope/);
});

test("software monthly identities exclude annual, consumable and ambiguous items and remain review-only", async () => {
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync(process.platform === "win32" ? "powershell.exe" : "pwsh", [
    "-NoProfile", "-NonInteractive", "-File", path.join(scriptsDir, "../tests/software-plan-identity.ps1"),
  ], { encoding: "utf8", timeout: 20_000 });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /PASS: 14 software identity/);
});

test("manual rolling collection explicitly binds task.env instead of the retained checkout", { skip: process.platform === "win32" }, async () => {
  const fs = await import("node:fs/promises");
  const os = await import("node:os");
  const { spawnSync } = await import("node:child_process");
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "geosub-collector-env-"));
  const quote = (value) => `'${value.replaceAll("'", "'\\''")}'`;
  try {
    const live = path.join(dir, "live");
    const old = path.join(dir, "old");
    const bin = path.join(dir, "bin");
    await Promise.all([fs.mkdir(live), fs.mkdir(old), fs.mkdir(bin)]);
    await fs.writeFile(path.join(dir, "legacy.env"), `export GEOSUB_BACKEND_DIR=${quote(old)}\n`);
    await fs.writeFile(path.join(dir, "task.env"), `source ${quote(path.join(dir, "legacy.env"))}\nexport GEOSUB_BACKEND_DIR=${quote(live)}\n`);
    await fs.writeFile(path.join(bin, "flock"), "#!/bin/sh\nexit 0\n", { mode: 0o755 });
    await fs.writeFile(path.join(bin, "pwsh"), "#!/bin/sh\nprintf '%s\\n' \"$@\"\n", { mode: 0o755 });
    const r = spawnSync("bash", [path.join(scriptsDir, "../deploy/linux-arm64/run-collector-jobs.sh"), "-JobId", "test-job"], {
      encoding: "utf8", env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, GEOSUB_ENV_FILE: path.join(dir, "task.env"), GEOSUB_COLLECTOR_LOCK_DIR: path.join(dir, "locks") },
    });
    assert.equal(r.status, 0, r.stderr);
    assert.ok(r.stdout.includes(path.join(live, "scripts/run-collector-jobs.ps1")));
    assert.ok(!r.stdout.includes(old));
    assert.match(r.stdout, /-JobId\ntest-job/);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});

test("HeyGen Creator excludes weekly and Credit SKUs from the monthly identity", async () => {
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync(process.platform === "win32" ? "powershell.exe" : "pwsh", [
    "-NoProfile", "-NonInteractive", "-File", path.join(scriptsDir, "../tests/heygen-plan-identity.ps1"),
  ], { encoding: "utf8", timeout: 20_000 });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /PASS: 12 HeyGen identity cases/);
});

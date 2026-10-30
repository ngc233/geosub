import "./suno-official-web.test.mjs";
import "./app-store-purchase-metadata.test.mjs";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import "./preflight-official-web-prices.test.mjs";
import "./claude-pro-job-reuse.test.mjs";
import "./claude-pro-review-admission.test.mjs";

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

test("Kling and ReelShort retain only registered monthly identities", async () => {
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync(process.platform === "win32" ? "powershell.exe" : "pwsh", [
    "-NoProfile", "-NonInteractive", "-File",
    path.join(scriptsDir, "../tests/kling-reelshort-plan-identity.ps1"),
  ], { encoding: "utf8", timeout: 20_000 });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /PASS: 23 Kling\/ReelShort identity cases/);
});


test("reasoned anomaly repair dispatch and target resolution use actual runner functions", async () => {
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync(process.platform === "win32" ? "powershell.exe" : "pwsh", [
    "-NoProfile", "-NonInteractive", "-File",
    path.join(scriptsDir, "../tests/collector-repair-policy.ps1"),
  ], { encoding: "utf8", timeout: 20_000 });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /rule-only repair makes no collector request/);
  assert.match(result.stdout, /all original targets require positive proof/);
  assert.match(result.stdout, /current review-only registration makes no repair request/);
  assert.match(result.stdout, /unregistered donation makes no repair request/);
  assert.match(result.stdout, /registered subscription alone selects repair country/);
});

test("website capability inventory requires the complete maintained automatic source contract", async () => {
  const { describeCollectorCapability, reportCollectorCapabilities } = await import("./report-collector-capabilities.mjs");
  const { readFileSync } = await import("node:fs");
  const sources = JSON.parse(readFileSync(new URL("../data/official-web-price-sources.json", import.meta.url))).sources;
  for (const key of ["spotify", "apple-music"]) {
    const job = { product_slug: key, job_config: { collector_kind: "pricing_page", official_web_source_key: key } };
    assert.equal(describeCollectorCapability(job, sources).automatic_review, true);
    const changed = structuredClone(sources);
    changed[key].parser_version = "unverified-parser";
    assert.equal(describeCollectorCapability(job, changed).collects_prices, false);
    job.product_slug = "different-product";
    assert.equal(describeCollectorCapability(job, sources).automatic_review, false);
  }
  for (const kind of ["official_site", "pricing_page"]) {
    const report = reportCollectorCapabilities([{
      product_slug: "fixture", job_config: { collector_kind: kind, url: "https://secret.invalid/?token=do-not-output" },
    }], sources);
    assert.equal(report[0].collects_prices, false);
    assert.equal(report[0].automatic_review, false);
    assert.equal(JSON.stringify(report).includes("do-not-output"), false);
  }
});

test("actual generic website outcomes and canonical product/country filters", async () => {
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync(process.platform === "win32" ? "powershell.exe" : "pwsh", [
    "-NoProfile", "-NonInteractive", "-File", path.join(scriptsDir, "../tests/collector-web-capability.ps1"),
  ], { encoding: "utf8", timeout: 20_000 });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /default scheduler scope remains unchanged/);
  assert.match(result.stdout, /website monitor cannot claim price observations/);
});

test("legacy Linux entrypoints share canonical admission and propagate failures", {
  skip: process.platform !== "linux",
}, async () => {
  const { mkdtemp, mkdir, copyFile, writeFile, readFile, readdir, rm } = await import("node:fs/promises");
  const { tmpdir } = await import("node:os");
  const { spawn, spawnSync } = await import("node:child_process");
  const realPwsh = spawnSync("which", ["pwsh"], { encoding: "utf8" }).stdout.trim();
  const root = await mkdtemp(path.join(tmpdir(), "geosub-entrypoint-test-"));
  const deploy = path.join(root, "deploy/linux-arm64");
  const scripts = path.join(root, "scripts");
  const bin = path.join(root, "bin");
  const log = path.join(root, "calls.log");
  const envFile = path.join(root, "fixture.env");
  try {
    await mkdir(deploy, { recursive: true }); await mkdir(scripts); await mkdir(bin);
    for (const file of ["run-price-pipeline.sh", "run-collector-jobs.sh"]) {
      await copyFile(path.join(scriptsDir, "../deploy/linux-arm64", file), path.join(deploy, file));
    }
    // PowerShell prepends PSHOME to PATH; restore the fixture's fake executable before delegation.
    const legacySource = await readFile(path.join(scriptsDir, "run-price-pipeline.ps1"), "utf8");
    await writeFile(path.join(scripts, "run-price-pipeline.ps1"), legacySource.replace(
      '$ErrorActionPreference = "Stop"',
      '$ErrorActionPreference = "Stop"\n$env:PATH = "$env:GEOSUB_TEST_BIN`:$env:PATH"',
    ));
    await writeFile(envFile, "");
    await writeFile(path.join(bin, "pwsh"), [
      "#!/usr/bin/env bash", "set -eu",
      'printf "begin\\n" >> "$GEOSUB_TEST_LOG"',
      'printf "%s\\n" "$@" > "$GEOSUB_TEST_ROOT/args-$$"',
      "sleep 0.15", 'printf "end\\n" >> "$GEOSUB_TEST_LOG"',
      'exit "${GEOSUB_TEST_EXIT:-0}"', "",
    ].join("\n"), { mode: 0o755 });
    const env = {
      ...process.env, PATH: `${bin}:${process.env.PATH}`, GEOSUB_ENV_FILE: envFile,
      GEOSUB_COLLECTOR_ENV_FILE: envFile, GEOSUB_BACKEND_DIR: root,
      GEOSUB_TEST_LOG: log, GEOSUB_TEST_ROOT: root, GEOSUB_TEST_BIN: bin, GEOSUB_PRODUCT_SLUG: "chatgpt",
      GEOSUB_COUNTRIES: "US,CA", GEOSUB_COLLECTOR_LOCK_DIR: path.join(root, "lock"),
      GEOSUB_COLLECTOR_LOCK_FILE: path.join(root, "lock/shared.lock"),
      GEOSUB_INCLUDE_WEB_PRICES: "false", GEOSUB_INCLUDE_GOOGLE_PLAY: "false",
      GEOSUB_RUN_STRICT_AUTO_REVIEW: "false",
    };
    const run = file => new Promise((resolve, reject) => {
      const child = spawn("bash", [path.join(deploy, file)], { env, stdio: "ignore" });
      child.once("error", reject); child.once("exit", resolve);
    });
    assert.deepEqual(await Promise.all([run("run-price-pipeline.sh"), run("run-collector-jobs.sh")]), [0, 0]);
    assert.equal(await readFile(log, "utf8"), "begin\nend\nbegin\nend\n");
    const calls = await Promise.all((await readdir(root)).filter(name => name.startsWith("args-")).map(name => readFile(path.join(root, name), "utf8")));
    assert.ok(calls.every(call => call.includes("scripts/run-collector-jobs.ps1")));
    assert.ok(calls.some(call => call.includes("-ProductSlug\nchatgpt") && call.includes("-CountryCodes\nUS,CA")));
    assert.equal(spawnSync("bash", [path.join(deploy, "run-price-pipeline.sh")], {
      env: { ...env, GEOSUB_TEST_EXIT: "7" }, encoding: "utf8",
    }).status, 7);
    const legacyArgs = ["-NoProfile", "-NonInteractive", "-File", path.join(scripts, "run-price-pipeline.ps1")];
    const psResult = spawnSync(realPwsh, legacyArgs, { env, encoding: "utf8" });
    assert.equal(psResult.status, 0, `${psResult.stdout}\n${psResult.stderr}`);
    assert.notEqual(spawnSync(realPwsh, legacyArgs, {
      env: { ...env, GEOSUB_TEST_EXIT: "7" }, encoding: "utf8",
    }).status, 0);
    const before = await readFile(log, "utf8");
    assert.equal(spawnSync("bash", [path.join(deploy, "run-price-pipeline.sh")], {
      env: { ...env, GEOSUB_INCLUDE_WEB_PRICES: "true" }, encoding: "utf8",
    }).status, 2);
    assert.notEqual(spawnSync(realPwsh, [...legacyArgs, "-IncludeWeb"], { env, encoding: "utf8" }).status, 0);
    assert.notEqual(spawnSync(realPwsh, [...legacyArgs, "-ProductSlug", ""], { env, encoding: "utf8" }).status, 0);
    const invalidScope = spawnSync(realPwsh, [
      "-NoProfile", "-NonInteractive", "-File", path.join(scriptsDir, "run-collector-jobs.ps1"),
      "-CountryCodes", "ALL,US", "-DryRun",
    ], { env, encoding: "utf8" });
    assert.notEqual(invalidScope.status, 0);
    assert.match(invalidScope.stderr, /CountryCodes must be ISO country codes/);
    assert.notEqual(spawnSync(realPwsh, [...legacyArgs, "-DbName", "unknown-database"], { env, encoding: "utf8" }).status, 0);
    assert.equal(await readFile(log, "utf8"), before);
  } finally {
    assert.equal(path.dirname(root), tmpdir());
    await rm(root, { recursive: true, force: true });
  }
});

test("Claude scheduler fixtures reject existing databases and remote hosts before installing HTTP doubles", async () => {
  const { assertSchedulerTestDatabase } = await import("../tests/claude-pro-scheduler-fixture.mjs");
  assertSchedulerTestDatabase("postgresql://127.0.0.1:55433/geosub_collector_test_claude_scheduler_fixture");
  for (const url of [
    undefined, "invalid", "postgresql://127.0.0.1:55433/geosub_admin_preview_20261028",
    "postgresql://db.invalid:55433/geosub_collector_test_claude_scheduler_fixture",
    "postgresql://127.0.0.1:5432/geosub_collector_test_claude_scheduler_fixture",
    "postgresql://127.0.0.1:55433/geosub_collector_test_claude_scheduler_fixture/other",
  ]) assert.throws(() => assertSchedulerTestDatabase(url), /isolated_scheduler_database_required/);
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync(process.execPath, [
    "--import", path.join(scriptsDir, "../tests/claude-pro-scheduler-fixture.mjs"), "--eval", "throw Error('must_not_run')",
  ], {
    encoding: "utf8", env: { ...process.env, NODE_OPTIONS: "", GEOSUB_CLAUDE_SCHEDULER_FIXTURE: "1",
      DATABASE_URL: "postgresql://127.0.0.1:55433/geosub_admin_preview_20261028" },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /isolated_scheduler_database_required/);
  assert.doesNotMatch(result.stderr, /must_not_run/);
});


test("Captions and Pollo require explicit plan identity and retain genuine monthly conflicts", async () => {
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync(process.platform === "win32" ? "powershell.exe" : "pwsh", [
    "-NoProfile", "-NonInteractive", "-File", path.join(scriptsDir, "../tests/collector-plan-identity.ps1"),
  ], { encoding: "utf8", timeout: 20_000 });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /Captions weekly cannot become monthly Basic/);
  assert.match(result.stdout, /different explicit monthly prices remain isolated/);
  assert.match(result.stdout, /Pollo monthly SKU disagreement is not resolved by choosing cheaper price/);
});


test("stale-review acceptance cannot install its candidate on existing or remote databases", async () => {
  const { assertStaleReviewTestConnection } = await import("../tests/collector-stale-refresh.mjs");
  assertStaleReviewTestConnection({ host: "127.0.0.1", port: 55433, database: "geosub_collector_test_stale_fixture" });
  for (const patch of [
    { host: "remote.invalid" }, { port: 5432 }, { database: "geosub_admin_preview_20261028" },
    { database: "geosub_collector_test_stale_fixture/other" }, { database: "geosub_collector_test_other" },
  ]) assert.throws(() => assertStaleReviewTestConnection({
    host: "127.0.0.1", port: 55433, database: "geosub_collector_test_stale_fixture", ...patch,
  }), /isolated_stale_review_database_required/);
});


test("App Store cache provenance and capture times survive independent sampling boundaries", async () => {
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync(process.platform === "win32" ? "powershell.exe" : "pwsh", [
    "-NoProfile", "-NonInteractive", "-File", path.join(scriptsDir, "../tests/collector-sampling.ps1"), "-ClockOnly",
  ], { encoding: "utf8", timeout: 20_000 });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /static cache retains its evidence time/);
  assert.match(result.stdout, /rendered cache retains captured timestamp/);
  assert.match(result.stdout, /legacy rendered cache without time is refetched/);
});

test("sampling acceptance rejects existing and remote database connections", async () => {
  const { assertSamplingTestConnection } = await import("../tests/collector-sampling.mjs");
  assertSamplingTestConnection({ host: "127.0.0.1", port: 55433, database: "geosub_collector_test_sampling_fixture" });
  for (const patch of [{ host: "remote.invalid" }, { port: 5432 }, { database: "geosub_admin_preview_20261028" }]) {
    assert.throws(() => assertSamplingTestConnection({
      host: "127.0.0.1", port: 55433, database: "geosub_collector_test_sampling_fixture", ...patch,
    }), /isolated_sampling_database_required/);
  }
});


test("App Store canonical dispatch honors the caller Force instead of forcing ordinary samples", () => {
  const branch = runner.slice(runner.indexOf('    "app_store" {', runner.indexOf('function Invoke-CollectorScript')),
    runner.indexOf('    "google_play" {', runner.indexOf('function Invoke-CollectorScript')));
  assert.match(branch, /Force = \$Force/);
  assert.doesNotMatch(branch, /Force = \$true/);
});

test("canonical pipeline acceptance rejects existing or remote databases before installing fixtures", async () => {
  const { assertPipelineTestConnection } = await import("../tests/collector-pipeline.mjs");
  assertPipelineTestConnection({ host: "127.0.0.1", port: 55433, database: "geosub_collector_test_pipeline_fixture" });
  for (const patch of [
    { host: "remote.invalid" }, { port: 5432 }, { database: "geosub_admin_preview_20261028" },
    { database: "geosub_collector_test_pipeline_fixture/other" }, { database: "geosub_collector_test_other" },
  ]) assert.throws(() => assertPipelineTestConnection({
    host: "127.0.0.1", port: 55433, database: "geosub_collector_test_pipeline_fixture", ...patch,
  }), /isolated_pipeline_database_required/);
});


test("history replay confines the source to the local preview and the target to disposable databases", async () => {
  const { assertHistoryReplayConnection } = await import("../tests/collector-history-replay.mjs");
  const local = { host: "127.0.0.1", port: 55433 };
  assertHistoryReplayConnection({ ...local, database: "geosub_admin_preview_20261028" }, true);
  assertHistoryReplayConnection({ ...local, database: "geosub_collector_test_replay_fixture" });
  for (const patch of [
    { host: "remote.invalid" }, { port: 5432 }, { database: "production" },
    { database: "geosub_collector_test_replay_fixture/other" },
  ]) {
    assert.throws(() => assertHistoryReplayConnection({
      ...local, database: "geosub_collector_test_replay_fixture", ...patch,
    }), /isolated_history_replay_required/);
    assert.throws(() => assertHistoryReplayConnection({
      ...local, database: "geosub_admin_preview_20261028", ...patch,
    }, true), /isolated_history_replay_required/);
  }
  assert.throws(() => assertHistoryReplayConnection({ ...local, database: "geosub_admin_preview_20261028" }),
    /isolated_history_replay_required/);
});


test("live acceptance refuses existing or remote databases before any network collection", async () => {
  const { assertLiveAcceptanceConnection } = await import("../tests/collector-live-acceptance.mjs");
  const local = { host: "127.0.0.1", port: 55433, database: "geosub_collector_test_replay_live_fixture" };
  assertLiveAcceptanceConnection(local);
  for (const patch of [
    { host: "remote.invalid" }, { port: 5432 }, { database: "geosub_admin_preview_20261028" },
    { database: "geosub_collector_test_replay_fixture" }, { database: "geosub_collector_test_replay_live_fixture/other" },
  ]) assert.throws(() => assertLiveAcceptanceConnection({ ...local, ...patch }), /isolated_live_acceptance_required/);
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync(process.platform === "win32" ? "powershell.exe" : "pwsh", [
    "-NoProfile", "-NonInteractive", "-File", path.join(scriptsDir, "../tests/collector-live-acceptance.ps1"),
  ], { env: { ...process.env, DATABASE_URL: "postgresql://127.0.0.1:55433/geosub_admin_preview_20261028" },
    encoding: "utf8", timeout: 10_000 });
  assert.notEqual(result.status, 0);
  assert.match(result.stdout + result.stderr, /Disposable live acceptance database required/);
});


test("App Store pages and caches must match the requested market and application", async () => {
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync(process.platform === "win32" ? "powershell.exe" : "pwsh", [
    "-NoProfile", "-NonInteractive", "-File", path.join(scriptsDir, "../tests/app-store-page-identity.ps1"),
  ], { encoding: "utf8", timeout: 20_000 });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /wrong-market-homepage HTTP 200 is rejected before parsing/);
  assert.match(result.stdout, /legacy cache without source identity is re-fetched/);
  assert.match(result.stdout, /rendered HTTP 200 with unrelated IAP data is rejected/);
});


test("InVideo public add-ons and new plan names cannot fill the old Generative identity", async () => {
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync(process.platform === "win32" ? "powershell.exe" : "pwsh", [
    "-NoProfile", "-NonInteractive", "-File", path.join(scriptsDir, "../tests/invideo-plan-identity.ps1"),
  ], { encoding: "utf8", timeout: 20_000 });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /PASS: 11 InVideo public-item identity boundaries/);
});


test("InVideo captured locale prices do not justify resolving ambiguous or out-of-range evidence", async () => {
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync(process.platform === "win32" ? "powershell.exe" : "pwsh", [
    "-NoProfile", "-NonInteractive", "-File", path.join(scriptsDir, "../tests/invideo-price-evidence.ps1"),
  ], { encoding: "utf8", timeout: 20_000 });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /PASS: 15 InVideo price evidence checks/);
});

test("Anghami promotions and different tiers cannot fill regular monthly plans", async () => {
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync(process.platform === "win32" ? "powershell.exe" : "pwsh", [
    "-NoProfile", "-NonInteractive", "-File", path.join(scriptsDir, "../tests/anghami-plan-identity.ps1"),
  ], { encoding: "utf8", timeout: 20_000 });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  assert.match(result.stdout, /PASS: 25 Anghami regular-plan identity boundaries/);
});

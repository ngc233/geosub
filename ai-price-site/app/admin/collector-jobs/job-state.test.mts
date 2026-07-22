import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  buildCollectorRunTimeline,
  isAppStoreCollectorJob,
  isManuallyQueuedAppStoreJob,
  isRunningAppStoreJob,
  type CollectorJobStateInput,
  type CollectorRunTimelineInput,
} from "./job-state.ts";

const testDir = dirname(fileURLToPath(import.meta.url));

function job(overrides: Partial<CollectorJobStateInput> = {}): CollectorJobStateInput {
  return {
    source_type: "app_store",
    collector_kind: "app_store",
    status: "active",
    is_due: true,
    queue_pending: true,
    priority: 100,
    latest_run_status: null,
    ...overrides,
  };
}

function run(overrides: Partial<CollectorRunTimelineInput> = {}): CollectorRunTimelineInput {
  return {
    status: "running",
    runner_state: "queued_from_admin",
    process_id: null,
    error_message: null,
    output_excerpt: null,
    duration_ms: null,
    run_age_seconds: 12,
    ...overrides,
  };
}

test("app store due priority job is treated as manually queued", () => {
  assert.equal(isAppStoreCollectorJob(job()), true);
  assert.equal(isManuallyQueuedAppStoreJob(job()), true);
});

test("non app store jobs do not block product-level app store collection", () => {
  const officialPageJob = job({
    source_type: "official_page",
    collector_kind: "official_site",
  });

  assert.equal(isAppStoreCollectorJob(officialPageJob), false);
  assert.equal(isManuallyQueuedAppStoreJob(officialPageJob), false);
  assert.equal(isRunningAppStoreJob(officialPageJob), false);
});

test("running app store job is running, not queued", () => {
  const running = job({
    latest_run_status: "running",
  });

  assert.equal(isRunningAppStoreJob(running), true);
  assert.equal(isManuallyQueuedAppStoreJob(running), false);
});

test("low-priority or future app store jobs are not shown as manually queued", () => {
  assert.equal(isManuallyQueuedAppStoreJob(job({ priority: 20 })), false);
  assert.equal(isManuallyQueuedAppStoreJob(job({ is_due: false })), false);
});

test("consumed app store queue is not shown as manually queued", () => {
  assert.equal(isManuallyQueuedAppStoreJob(job({ queue_pending: false })), false);
});

test("scheduled collector runner deduplicates product and collector kind", () => {
  const runner = readFileSync(
    resolve(testDir, "../../../../geosub-backend/scripts/run-collector-jobs.ps1"),
    "utf8",
  );

  assert.match(runner, /ROW_NUMBER\(\) OVER/);
  assert.match(runner, /PARTITION BY\s+job\.product_id,[\s\S]*collector_kind/);
  assert.match(runner, /WHERE product_kind_rank = 1/);
  assert.match(runner, /\[string\]\$CollectorKind/);
  assert.match(runner, /collectorKindFilterSql/);
  assert.match(runner, /\$requestedRunId = \$RunId/);
  assert.match(runner, /\$jobRunId = Start-JobRun/);
  assert.doesNotMatch(runner, /\$runId = Start-JobRun/);
  assert.match(runner, /Console\]::OutputEncoding = \$utf8Encoding/);
});

test("queued admin run shows process startup as the active timeline step", () => {
  const timeline = buildCollectorRunTimeline(run());

  assert.equal(timeline[0].state, "done");
  assert.equal(timeline[1].key, "process");
  assert.equal(timeline[1].state, "active");
  assert.equal(timeline[2].state, "waiting");
});

test("spawned run keeps the process step active and waits for collection output", () => {
  const timeline = buildCollectorRunTimeline(
    run({
      runner_state: "spawned",
      process_id: "12345",
      run_age_seconds: 70,
    }),
  );

  assert.equal(timeline[1].state, "active");
  assert.match(timeline[1].detail, /12345/);
  assert.equal(timeline[2].state, "waiting");
});

test("collected run waits visibly for the shared automatic review", () => {
  const timeline = buildCollectorRunTimeline(
    run({
      runner_state: "collected_waiting_review",
      output_excerpt: "App Store collection complete.",
      run_age_seconds: 90,
    }),
  );

  assert.deepEqual(
    timeline.map((step) => step.state),
    ["done", "done", "done", "active"],
  );
  assert.match(timeline[3].detail, /统一自动审核/);
});

test("successful run completes the collection and handoff timeline", () => {
  const timeline = buildCollectorRunTimeline(
    run({
      status: "succeeded",
      runner_state: null,
      run_age_seconds: null,
      duration_ms: 23000,
      output_excerpt: "App Store collection complete.",
    }),
  );

  assert.deepEqual(
    timeline.map((step) => step.state),
    ["done", "done", "done", "done"],
  );
});

test("spawn failure is visible before the collection step", () => {
  const timeline = buildCollectorRunTimeline(
    run({
      status: "failed",
      runner_state: "spawn_failed",
      error_message: "Collector runner was not found.",
    }),
  );

  assert.equal(timeline[1].state, "failed");
  assert.equal(timeline[2].state, "waiting");
  assert.match(timeline[1].detail, /not found/);
});

test("stale running collection is visible as a failed run", () => {
  const timeline = buildCollectorRunTimeline(
    run({
      status: "failed",
      runner_state: "stale_running_marked_failed",
      error_message: "Collector process did not start reporting within 3 minutes.",
    }),
  );

  assert.equal(timeline[1].state, "failed");
  assert.equal(timeline[2].state, "failed");
  assert.match(timeline[1].detail, /3 minutes/);
});

test("App Store runs persist a product-scoped outcome only after automatic review", () => {
  const runner = readFileSync(
    resolve(testDir, "../../../../geosub-backend/scripts/run-collector-jobs.ps1"),
    "utf8",
  );
  const reviewCall = runner.indexOf("run_app_store_stability_auto_review");
  const outcomeCall = runner.indexOf("Add-AppStoreReviewOutcome", reviewCall);
  const completionCall = runner.indexOf("Complete-JobRun", outcomeCall);

  assert.ok(reviewCall >= 0);
  assert.ok(outcomeCall > reviewCall);
  assert.ok(completionCall > outcomeCall);
  assert.match(runner, /review_outcome/);
  assert.match(runner, /pending_stability_count/);
  assert.match(runner, /isolated_count/);
  assert.match(runner, /published_price_count/);
  assert.match(runner, /collected_waiting_review/);
});

test("collector dashboard prefers persisted outcomes and shows a product summary", () => {
  const page = readFileSync(resolve(testDir, "page.tsx"), "utf8");
  const timelineComponent = readFileSync(
    resolve(testDir, "../review/CollectorRunTimeline.tsx"),
    "utf8",
  );

  assert.match(page, /review_outcome,observed_count/);
  assert.match(page, /latest_pending_stability_count/);
  assert.match(page, /latest_has_review_outcome/);
  assert.match(page, /本轮检查/);
  assert.match(page, /下次计划/);
  assert.match(page, /已到期，等待执行器/);
  assert.match(timelineComponent, /自动通过/);
  assert.match(timelineComponent, /待稳定/);
  assert.match(timelineComponent, /隔离/);
  assert.match(timelineComponent, /正式更新/);
});

test("automatic review failure remains failed without a successful outcome", () => {
  const runner = readFileSync(
    resolve(testDir, "../../../../geosub-backend/scripts/run-collector-jobs.ps1"),
    "utf8",
  );
  const failurePayload = runner.indexOf('auto_review_status = "failed"');
  const failedCompletion = runner.indexOf("Complete-JobRun", failurePayload);

  assert.ok(failurePayload >= 0);
  assert.ok(failedCompletion > failurePayload);
});

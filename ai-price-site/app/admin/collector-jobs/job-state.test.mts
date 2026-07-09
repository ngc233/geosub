import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCollectorRunTimeline,
  isAppStoreCollectorJob,
  isManuallyQueuedAppStoreJob,
  isRunningAppStoreJob,
  type CollectorJobStateInput,
  type CollectorRunTimelineInput,
} from "./job-state.ts";

function job(overrides: Partial<CollectorJobStateInput> = {}): CollectorJobStateInput {
  return {
    source_type: "app_store",
    collector_kind: "app_store",
    status: "active",
    is_due: true,
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

import assert from "node:assert/strict";
import test from "node:test";
import {
  isAppStoreCollectorJob,
  isManuallyQueuedAppStoreJob,
  isRunningAppStoreJob,
  type CollectorJobStateInput,
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

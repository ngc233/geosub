import assert from "node:assert/strict";
import test from "node:test";
import {
  activeSeoExperimentLocks,
  getActiveSeoExperimentLock,
} from "./seo-experiment-locks.ts";

test("both active metadata experiments remain explicitly locked", () => {
  assert.equal(activeSeoExperimentLocks.length, 2);

  for (const path of [
    "/en/ai-pricing/chatgpt/pro-5x",
    "/zh/ai-pricing/chatgpt/plus",
  ]) {
    const lock = getActiveSeoExperimentLock(`${path}/`);
    assert.ok(lock);
    assert.equal(lock.automaticRelease, false);
    assert.equal(lock.earliestSettledThrough, "2026-09-03");
    assert.equal(lock.minimumCompleteObservationDays, 7);
    assert.ok(lock.lockedFields.includes("robots"));
    assert.ok(lock.lockedFields.includes("canonical"));
    assert.ok(lock.lockedFields.includes("h1"));
  }
});

test("experiment lock matching is exact-page only", () => {
  assert.equal(getActiveSeoExperimentLock("/en/ai-pricing/chatgpt"), null);
  assert.equal(
    getActiveSeoExperimentLock("/zh/ai-pricing/chatgpt/pro-5x"),
    null,
  );
});

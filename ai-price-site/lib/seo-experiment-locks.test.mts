import assert from "node:assert/strict";
import test from "node:test";
import {
  activeSeoExperimentLocks,
  getActiveSeoExperimentLock,
} from "./seo-experiment-locks.ts";

test("registered locks require manual release and match the canonical page only", () => {
  for (const lock of activeSeoExperimentLocks) {
    assert.equal(getActiveSeoExperimentLock(lock.canonicalPath), lock);
    assert.equal(getActiveSeoExperimentLock(`${lock.canonicalPath}/`), lock);
    assert.equal(getActiveSeoExperimentLock(`${lock.canonicalPath}-unrelated`), null);
    assert.equal(lock.automaticRelease, false);
    assert.ok(lock.minimumCompleteObservationDays >= 7);
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

test("interrupted Pro experiment no longer locks factual corrections", () => {
  assert.equal(getActiveSeoExperimentLock("/en/ai-pricing/chatgpt/pro-5x"), null);
});

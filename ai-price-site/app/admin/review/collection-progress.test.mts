import assert from "node:assert/strict";
import test from "node:test";
import { buildCollectionProgressState } from "./collection-progress.ts";
import type { CollectorRunHistoryRow } from "./types.ts";

function row(overrides: Partial<CollectorRunHistoryRow> = {}): CollectorRunHistoryRow {
  return {
    id: "run-1",
    product_slug: "chatgpt",
    product_name: "ChatGPT",
    source_type: "app_store",
    status: "running",
    collector_kind: "app_store",
    started_at: new Date("2026-07-10T00:00:00Z"),
    finished_at: null,
    duration_ms: null,
    error_message: null,
    output_excerpt: null,
    diagnosis: null,
    process_id: null,
    runner_state: "queued_from_admin",
    run_age_seconds: 12,
    observed_count: 0,
    pending_observation_count: 0,
    approved_observation_count: 0,
    rejected_observation_count: 0,
    ignored_observation_count: 0,
    anomaly_observation_count: 0,
    published_price_count: 0,
    ...overrides,
  };
}

test("queued collection without a run keeps a visible progress panel", () => {
  const state = buildCollectionProgressState({
    rows: [],
    collectionRun: "queued",
    collectionScope: "netflix",
  });

  assert.equal(state.visible, true);
  assert.equal(state.active, true);
  assert.equal(state.progress, null);
  assert.match(state.label, /netflix/);
});

test("admin-created running row shows script startup progress", () => {
  const state = buildCollectionProgressState({
    rows: [row()],
    collectionRun: "queued",
    collectionScope: "chatgpt",
  });

  assert.equal(state.visible, true);
  assert.equal(state.active, true);
  assert.equal(state.progress, null);
  assert.match(state.detail, /3 分钟/);
});

test("spawned running row advances the visible progress", () => {
  const state = buildCollectionProgressState({
    rows: [
      row({
        process_id: "12345",
        runner_state: "spawned",
        run_age_seconds: 61,
      }),
    ],
    collectionRun: "queued",
    collectionScope: "chatgpt",
  });

  assert.equal(state.active, true);
  assert.equal(state.progress, null);
  assert.equal(state.elapsedLabel, "1 分 01 秒");
  assert.match(state.detail, /12345/);
});

test("completed run turns the progress panel into a result panel", () => {
  const state = buildCollectionProgressState({
    rows: [
      row({
        status: "succeeded",
        runner_state: "spawned",
        process_id: "12345",
        duration_ms: 24000,
        finished_at: new Date("2026-07-10T00:00:24Z"),
        run_age_seconds: 24,
        observed_count: 15,
        published_price_count: 12,
      }),
    ],
    collectionRun: "queued",
    collectionScope: "chatgpt",
    collectionRunId: "run-1",
  });

  assert.equal(state.active, false);
  assert.equal(state.tone, "success");
  assert.equal(state.progress, null);
  assert.match(state.detail, /正式库/);
});

test("failed run keeps the failure visible in the progress panel", () => {
  const state = buildCollectionProgressState({
    rows: [
      row({
        status: "failed",
        runner_state: "stale_running_marked_failed",
        error_message: "Collector process did not start reporting within 3 minutes.",
      }),
    ],
    collectionRun: "queued",
    collectionScope: "chatgpt",
    collectionRunId: "run-1",
  });

  assert.equal(state.active, false);
  assert.equal(state.tone, "danger");
  assert.equal(state.progress, null);
  assert.match(state.detail, /3 minutes/);
});


test("a new queued request never adopts an old successful run",()=>{
 const state=buildCollectionProgressState({rows:[row({status:"succeeded",finished_at:new Date()})],collectionRun:"queued",collectionScope:"chatgpt"});
 assert.equal(state.runId,null);assert.equal(state.active,true);assert.equal(state.progress,null);
});
test("the requested run wins over a different currently running task",()=>{
 const state=buildCollectionProgressState({rows:[row({id:"other"}),row({id:"requested",status:"succeeded"})],collectionRun:"queued",collectionScope:"chatgpt",collectionRunId:"requested"});
 assert.equal(state.runId,"requested");assert.equal(state.runStatus,"succeeded");assert.equal(state.active,false);
});
test("a run from another product is never used to report completion",()=>{
 const state=buildCollectionProgressState({rows:[row({product_slug:"spotify",status:"succeeded"})],collectionRun:"queued",collectionScope:"chatgpt",collectionRunId:"run-1"});
 assert.equal(state.runId,null);assert.equal(state.active,true);
});
test("unknown backend status does not manufacture a percentage or successful result",()=>{
 const state=buildCollectionProgressState({rows:[row({status:"unknown"})],collectionRun:"queued",collectionScope:"chatgpt",collectionRunId:"run-1"});
 assert.equal(state.tone,"warning");assert.equal(state.progress,null);assert.match(state.label,/待确认/);
});

test("a finished run uses recorded duration instead of growing wall-clock age",()=>{
 const state=buildCollectionProgressState({rows:[row({status:"succeeded",duration_ms:24000,run_age_seconds:900})],collectionRun:"queued",collectionScope:"chatgpt",collectionRunId:"run-1"});
 assert.equal(state.elapsedLabel,"24 秒");
});

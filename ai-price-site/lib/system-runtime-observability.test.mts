import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  assessPoolActivity,
  buildRuntimeObservabilitySummary,
} from "./system-runtime-observability-model.ts";

test("assessPoolActivity classifies normal, busy, slow, and saturated pools", () => {
  assert.equal(
    assessPoolActivity({
      applicationName: "geosub-web",
      total: 3,
      active: 1,
      idleInTransaction: 0,
      max: 10,
      longestActiveMs: 120,
    }).status,
    "ok",
  );

  assert.equal(
    assessPoolActivity({
      applicationName: "geosub-admin",
      total: 3,
      active: 1,
      idleInTransaction: 0,
      max: 4,
      longestActiveMs: 6_200,
    }).status,
    "warning",
  );

  assert.equal(
    assessPoolActivity({
      applicationName: "geosub-admin",
      total: 4,
      active: 2,
      idleInTransaction: 0,
      max: 4,
      longestActiveMs: 400,
    }).status,
    "critical",
  );

  assert.equal(
    assessPoolActivity({
      applicationName: "geosub-web",
      total: 2,
      active: 1,
      idleInTransaction: 3,
      max: 10,
      longestActiveMs: 200,
    }).status,
    "critical",
  );
});

test("buildRuntimeObservabilitySummary groups web/admin/other pools and failure phases accurately", () => {
  const now = new Date("2026-11-26T12:00:00Z").getTime();
  const summary = buildRuntimeObservabilitySummary({
    poolRows: [
      {
        application_name: "geosub-web",
        total_connections: 4,
        active_connections: 1,
        idle_in_transaction: 0,
        longest_active_ms: 85,
      },
      {
        application_name: "geosub-admin",
        total_connections: 2,
        active_connections: 1,
        idle_in_transaction: 0,
        longest_active_ms: 340,
      },
      {
        application_name: "geosub-collector-worker",
        total_connections: 1,
        active_connections: 0,
        idle_in_transaction: 0,
        longest_active_ms: 0,
      },
    ],
    queueRow: {
      queued_runs: 0,
      active_runs: 1,
      latest_worker_claim_at: "2026-11-26T11:58:00Z",
      collector_failures_24h: 2,
      auto_review_failures_24h: 0,
      spawn_failures_24h: 0,
      total_failures_24h: 3,
    },
    dispatchMode: "queue",
    nowMs: now,
  });

  assert.equal(summary.status, "ok");
  assert.equal(summary.pools.web.total, 4);
  assert.equal(summary.pools.web.utilizationPercent, 40);
  assert.equal(summary.pools.admin.total, 2);
  assert.equal(summary.pools.admin.utilizationPercent, 50);
  assert.equal(summary.pools.otherConnections, 1);
  assert.equal(summary.collectorQueue.dispatchMode, "queue");
  assert.equal(summary.collectorQueue.failures24h.collector, 2);
  assert.equal(summary.collectorQueue.failures24h.unclassified, 1);
  assert.deepEqual(summary.warnings, []);
});

test("buildRuntimeObservabilitySummary warns when queued runs wait without a recent worker claim or review/spawn failures occur", () => {
  const now = new Date("2026-11-26T12:00:00Z").getTime();
  const summary = buildRuntimeObservabilitySummary({
    poolRows: [],
    poolsAvailable: false,
    queueRow: {
      queued_runs: 2,
      active_runs: 0,
      latest_worker_claim_at: "2026-11-26T11:40:00Z",
      collector_failures_24h: 0,
      auto_review_failures_24h: 1,
      spawn_failures_24h: 1,
      total_failures_24h: 2,
    },
    dispatchMode: "queue",
    nowMs: now,
  });

  assert.equal(summary.status, "warning");
  assert.equal(summary.pools.web.status, "unknown");
  assert.equal(summary.collectorQueue.status, "warning");
  assert.ok(summary.warnings.some((item) => item.includes("pg_stat_activity")));
  assert.ok(summary.warnings.some((item) => item.includes("无常驻 Worker 领单记录")));
  assert.ok(summary.warnings.some((item) => item.includes("spawn")));
  assert.ok(summary.warnings.some((item) => item.includes("auto_review")));
});

test("system runtime observability uses isolated adminPrisma pool and shared failure_phase SQL", () => {
  const source = readFileSync(
    new URL("./system-runtime-observability.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /adminPrisma/);
  assert.doesNotMatch(source, /\bprisma\.\$queryRaw/);
  assert.match(source, /FROM pg_stat_activity/);
  assert.match(source, /isAutoReviewFailureSql\("run"\)/);
  assert.doesNotMatch(source, /Automatic review failed after collection:/);
});

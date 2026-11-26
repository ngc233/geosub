import assert from "node:assert/strict";
import test from "node:test";
import {
  appendOutputTail,
  buildWorkerConfig,
  claimNextQueuedCollectorRun,
  executeClaimedCollectorRun,
  notifyCollectorCacheRevalidation,
  runWorkerPollCycle,
} from "./collector-queue-worker.mjs";

test("buildWorkerConfig applies safe bounds for concurrency, poll, and reconcile intervals", () => {
  const defaults = buildWorkerConfig({});
  assert.equal(defaults.concurrency, 1);
  assert.equal(defaults.pollIntervalMs, 3_000);
  assert.equal(defaults.reconcileIntervalMs, 60_000);

  const clamped = buildWorkerConfig({
    GEOSUB_COLLECTOR_WORKER_CONCURRENCY: "99",
    GEOSUB_COLLECTOR_WORKER_POLL_MS: "50",
    GEOSUB_COLLECTOR_WORKER_RECONCILE_MS: "9999999",
    GEOSUB_COLLECTOR_WORKER_ID: "worker-arm-1",
  });
  assert.equal(clamped.concurrency, 3);
  assert.equal(clamped.pollIntervalMs, 1_000);
  assert.equal(clamped.reconcileIntervalMs, 600_000);
  assert.equal(clamped.workerId, "worker-arm-1");
});

test("appendOutputTail strips null bytes and retains only the trailing window", () => {
  assert.equal(appendOutputTail("", "hello\u0000world", 20), "helloworld");
  assert.equal(appendOutputTail("123456", "7890", 6), "567890");
});

test("claimNextQueuedCollectorRun uses FOR UPDATE SKIP LOCKED and returns run identity", async () => {
  const seen = [];
  const db = {
    query: async (sql, params) => {
      seen.push({ sql, params });
      return {
        rows: [
          {
            run_id: "11111111-1111-4111-8111-111111111111",
            job_id: "22222222-2222-4222-8222-222222222222",
          },
        ],
      };
    },
  };

  const claimed = await claimNextQueuedCollectorRun(db, "worker-1");
  assert.deepEqual(claimed, {
    runId: "11111111-1111-4111-8111-111111111111",
    jobId: "22222222-2222-4222-8222-222222222222",
  });
  assert.match(seen[0].sql, /FOR UPDATE SKIP LOCKED/);
  assert.deepEqual(seen[0].params, ["worker-1"]);
});

test("executeClaimedCollectorRun revalidates cache on success and records output_excerpt + failure_phase on failure", async () => {
  const originalLog = console.log;
  const originalError = console.error;
  console.log = () => {};
  console.error = () => {};

  try {
    const config = buildWorkerConfig({
      GEOSUB_COLLECTOR_WORKER_ID: "worker-test",
      GEOSUB_INTERNAL_REVALIDATE_URL: "http://127.0.0.1:3000/api/internal/revalidate/collector-success",
      GEOSUB_INTERNAL_REVALIDATE_TOKEN: "test-token",
    });

    const revalidated = [];
    const okResult = await executeClaimedCollectorRun({
      db: { query: async () => ({ rows: [] }) },
      run: { runId: "run-ok", jobId: "job-ok" },
      config,
      runProcess: async () => ({ ok: true, outputExcerpt: "done" }),
      revalidate: async (args) => {
        revalidated.push(args);
        return { ok: true, status: 200 };
      },
    });
    assert.deepEqual(okResult, { ok: true, revalidated: true });
    assert.equal(revalidated.length, 1);
    assert.equal(revalidated[0].jobId, "job-ok");

    const failureQueries = [];
    const failResult = await executeClaimedCollectorRun({
      db: {
        query: async (sql, params) => {
          failureQueries.push({ sql, params });
          return { rows: [] };
        },
      },
      run: { runId: "run-fail", jobId: "job-fail" },
      config,
      runProcess: async () => ({
        ok: false,
        state: "process_failed",
        message: "Collector worker process exited with code 1.",
        outputExcerpt: "stderr tail line",
      }),
      revalidate: async () => {
        throw new Error("revalidate must not run on failed collection");
      },
    });
    assert.deepEqual(failResult, { ok: false, state: "process_failed" });
    assert.equal(failureQueries.length, 1);
    assert.match(failureQueries[0].sql, /'failure_phase', 'collector'/);
    assert.equal(failureQueries[0].params[0], "run-fail");
    assert.equal(failureQueries[0].params[2], "stderr tail line");
    assert.equal(failureQueries[0].params[3], "process_failed");
  } finally {
    console.log = originalLog;
    console.error = originalError;
  }
});

test("runWorkerPollCycle respects concurrency cap and runs periodic reconciliation", async () => {
  const originalLog = console.log;
  console.log = () => {};

  try {
    let reconcileCount = 0;
    const queue = [
      { run_id: "run-1", job_id: "job-1" },
      { run_id: "run-2", job_id: "job-2" },
    ];
    const db = {
      query: async (sql) => {
        if (sql.includes("reconcile_stale_collector_runs")) {
          reconcileCount += 1;
          return { rows: [] };
        }
        const next = queue.shift();
        return { rows: next ? [next] : [] };
      },
    };
    const config = buildWorkerConfig({
      GEOSUB_COLLECTOR_WORKER_CONCURRENCY: "1",
      GEOSUB_COLLECTOR_WORKER_RECONCILE_MS: "60000",
    });
    const activeRuns = new Map();
    let releaseFirst;
    const firstGate = new Promise((resolve) => {
      releaseFirst = resolve;
    });

    const cycle1 = await runWorkerPollCycle({
      db,
      config,
      activeRuns,
      now: 100_000,
      lastReconciledAt: 0,
      runProcess: async () => {
        await firstGate;
        return { ok: true, outputExcerpt: "" };
      },
      revalidate: async () => ({ ok: true }),
    });

    assert.equal(reconcileCount, 1);
    assert.deepEqual(cycle1.started, ["run-1"]);
    assert.equal(activeRuns.size, 1);

    // Second poll while run-1 is active must not claim run-2 or re-reconcile before interval.
    const cycle2 = await runWorkerPollCycle({
      db,
      config,
      activeRuns,
      now: 110_000,
      lastReconciledAt: cycle1.lastReconciledAt,
      runProcess: async () => ({ ok: true, outputExcerpt: "" }),
      revalidate: async () => ({ ok: true }),
    });
    assert.equal(reconcileCount, 1);
    assert.deepEqual(cycle2.started, []);
    assert.equal(queue.length, 1);

    releaseFirst();
    await Promise.allSettled(activeRuns.values());
    assert.equal(activeRuns.size, 0);
  } finally {
    console.log = originalLog;
  }
});

test("notifyCollectorCacheRevalidation skips cleanly without token and posts bearer token when configured", async () => {
  const skipped = await notifyCollectorCacheRevalidation({
    jobId: "job-1",
    revalidateUrl: "http://127.0.0.1:3000/api/internal/revalidate/collector-success",
    revalidateToken: "",
  });
  assert.deepEqual(skipped, { ok: false, skipped: true });

  let seenAuth = "";
  const sent = await notifyCollectorCacheRevalidation({
    jobId: "job-1",
    revalidateUrl: "http://127.0.0.1:3000/api/internal/revalidate/collector-success",
    revalidateToken: "secret-token",
    fetchImpl: async (_url, init) => {
      seenAuth = init.headers.Authorization;
      return new Response("{}", { status: 200 });
    },
  });
  assert.deepEqual(sent, { ok: true, status: 200 });
  assert.equal(seenAuth, "Bearer secret-token");
});

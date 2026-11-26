#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MAX_OUTPUT_EXCERPT_CHARS = 4_000;
const DEFAULT_CONCURRENCY = 1;
const MAX_CONCURRENCY = 3;
const DEFAULT_POLL_MS = 3_000;
const MIN_POLL_MS = 1_000;
const MAX_POLL_MS = 60_000;
const DEFAULT_RECONCILE_MS = 60_000;
const MIN_RECONCILE_MS = 15_000;
const MAX_RECONCILE_MS = 600_000;
const DEFAULT_REVALIDATE_TIMEOUT_MS = 8_000;

function boundedInt(raw, fallback, min, max) {
  const num = Number(raw);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(Math.max(Math.trunc(num), min), max);
}

export function buildWorkerConfig(env = process.env) {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const backendDir = path.resolve(
    env.GEOSUB_BACKEND_DIR || path.resolve(scriptDir, ".."),
  );
  const frontendDir = path.resolve(
    env.GEOSUB_FRONTEND_DIR || path.resolve(backendDir, "..", "ai-price-site"),
  );
  const workerId =
    env.GEOSUB_COLLECTOR_WORKER_ID?.trim() ||
    `${os.hostname()}-${process.pid}`;

  return {
    backendDir,
    frontendDir,
    workerId,
    databaseUrl: env.DATABASE_URL?.trim() || "",
    concurrency: boundedInt(
      env.GEOSUB_COLLECTOR_WORKER_CONCURRENCY,
      DEFAULT_CONCURRENCY,
      1,
      MAX_CONCURRENCY,
    ),
    pollIntervalMs: boundedInt(
      env.GEOSUB_COLLECTOR_WORKER_POLL_MS,
      DEFAULT_POLL_MS,
      MIN_POLL_MS,
      MAX_POLL_MS,
    ),
    reconcileIntervalMs: boundedInt(
      env.GEOSUB_COLLECTOR_WORKER_RECONCILE_MS,
      DEFAULT_RECONCILE_MS,
      MIN_RECONCILE_MS,
      MAX_RECONCILE_MS,
    ),
    revalidateUrl:
      env.GEOSUB_INTERNAL_REVALIDATE_URL?.trim() ||
      "http://127.0.0.1:3000/api/internal/revalidate/collector-success",
    revalidateToken: env.GEOSUB_INTERNAL_REVALIDATE_TOKEN?.trim() || "",
  };
}

export function appendOutputTail(current, chunk, maxChars = MAX_OUTPUT_EXCERPT_CHARS) {
  const cleaned = String(chunk ?? "").replaceAll("\u0000", "");
  if (!cleaned) return current;
  const combined = current + cleaned;
  return combined.length > maxChars
    ? combined.slice(combined.length - maxChars)
    : combined;
}

export async function claimNextQueuedCollectorRun(db, workerId) {
  const result = await db.query(
    `
    WITH next_run AS (
      SELECT run.id, run.job_id
      FROM collector_job_runs run
      WHERE run.status = 'running'
        AND run.raw_payload ->> 'state' = 'queued_from_admin'
        AND run.started_at > NOW() - INTERVAL '30 minutes'
      ORDER BY run.started_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    )
    UPDATE collector_job_runs run
    SET raw_payload = COALESCE(run.raw_payload, '{}'::jsonb) || jsonb_build_object(
      'state', 'worker_claimed',
      'worker_id', $1::text,
      'worker_claimed_at', NOW()::text
    )
    FROM next_run
    WHERE run.id = next_run.id
    RETURNING run.id::text AS run_id, run.job_id::text AS job_id
    `,
    [workerId],
  );
  const row = result.rows?.[0];
  return row ? { runId: row.run_id, jobId: row.job_id } : null;
}

export async function reconcileStaleRuns(db) {
  await db.query("SELECT * FROM reconcile_stale_collector_runs(3, 20, 3)");
}

export async function markWorkerRunFailed(
  db,
  { runId, state, message, outputExcerpt },
) {
  await db.query(
    `
    UPDATE collector_job_runs
    SET
      status = 'failed',
      finished_at = COALESCE(finished_at, NOW()),
      duration_ms = GREATEST(
        0,
        EXTRACT(EPOCH FROM (COALESCE(finished_at, NOW()) - started_at)) * 1000
      )::int,
      error_message = COALESCE(error_message, $2::text),
      output_excerpt = COALESCE(NULLIF(output_excerpt, ''), NULLIF($3::text, '')),
      raw_payload = COALESCE(raw_payload, '{}'::jsonb) || jsonb_build_object(
        'state', $4::text,
        'failure_phase', 'collector'
      )
    WHERE id = $1::uuid
      AND status = 'running'
    `,
    [runId, message, outputExcerpt || null, state],
  );
}

export async function notifyCollectorCacheRevalidation({
  jobId,
  revalidateUrl,
  revalidateToken,
  fetchImpl = fetch,
  timeoutMs = DEFAULT_REVALIDATE_TIMEOUT_MS,
}) {
  if (!revalidateUrl || !revalidateToken) return { ok: false, skipped: true };
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort(new DOMException("Revalidation timeout", "TimeoutError"));
  }, timeoutMs);

  try {
    const response = await fetchImpl(revalidateUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${revalidateToken}`,
      },
      body: JSON.stringify({ jobId }),
      signal: controller.signal,
    });
    return { ok: response.ok, status: response.status };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.name : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

export function spawnCollectorRunnerProcess({
  backendDir,
  jobId,
  runId,
  env = process.env,
}) {
  const linuxRunnerPath = path.join(
    backendDir,
    "deploy",
    "linux-arm64",
    "run-collector-jobs.sh",
  );
  const psRunnerPath = path.join(backendDir, "scripts", "run-collector-jobs.ps1");
  const useLinuxRunner =
    process.platform !== "win32" && existsSync(linuxRunnerPath);
  const runnerPath = useLinuxRunner ? linuxRunnerPath : psRunnerPath;

  if (!existsSync(runnerPath)) {
    throw new Error(`Collector runner was not found at ${runnerPath}.`);
  }

  const command = useLinuxRunner
    ? "bash"
    : process.platform === "win32"
      ? "powershell.exe"
      : "pwsh";
  const args = useLinuxRunner
    ? [linuxRunnerPath, "-JobId", jobId, "-Force", "-RunId", runId]
    : [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        psRunnerPath,
        "-JobId",
        jobId,
        "-Force",
        "-Limit",
        "1",
        "-RunId",
        runId,
      ];

  return new Promise((resolveRun) => {
    let outputTail = "";
    const child = spawn(command, args, {
      cwd: backendDir,
      env: useLinuxRunner
        ? {
            ...env,
            GEOSUB_BACKEND_DIR: backendDir,
            GEOSUB_COLLECTOR_JOB_LIMIT: "1",
          }
        : env,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });

    child.stdout?.on("data", (chunk) => {
      outputTail = appendOutputTail(outputTail, chunk);
    });
    child.stderr?.on("data", (chunk) => {
      outputTail = appendOutputTail(outputTail, chunk);
    });
    child.once("error", (error) => {
      resolveRun({
        ok: false,
        state: "spawn_failed",
        message: error.message,
        outputExcerpt: outputTail,
      });
    });
    child.once("exit", (code, signal) => {
      if (code === 0 && !signal) {
        resolveRun({ ok: true, outputExcerpt: outputTail });
        return;
      }
      const message = signal
        ? `Collector worker process exited${code === null ? "" : ` with code ${code}`} and signal ${signal}.`
        : `Collector worker process exited with code ${code}.`;
      resolveRun({
        ok: false,
        state: "process_failed",
        message,
        outputExcerpt: outputTail,
      });
    });
  });
}

export async function executeClaimedCollectorRun({
  db,
  run,
  config,
  runProcess = spawnCollectorRunnerProcess,
  revalidate = notifyCollectorCacheRevalidation,
}) {
  let outcome;
  try {
    outcome = await runProcess({
      backendDir: config.backendDir,
      jobId: run.jobId,
      runId: run.runId,
    });
  } catch (error) {
    outcome = {
      ok: false,
      state: "spawn_failed",
      message: error instanceof Error ? error.message : String(error),
      outputExcerpt: "",
    };
  }

  if (outcome.ok) {
    const reval = await revalidate({
      jobId: run.jobId,
      revalidateUrl: config.revalidateUrl,
      revalidateToken: config.revalidateToken,
    });
    console.log(
      JSON.stringify({
        event: "collector_worker_run_succeeded",
        workerId: config.workerId,
        runId: run.runId,
        jobId: run.jobId,
        revalidated: Boolean(reval?.ok),
      }),
    );
    return { ok: true, revalidated: Boolean(reval?.ok) };
  }

  await markWorkerRunFailed(db, {
    runId: run.runId,
    state: outcome.state || "process_failed",
    message: outcome.message || "Collector worker process failed.",
    outputExcerpt: outcome.outputExcerpt || "",
  });
  console.error(
    JSON.stringify({
      event: "collector_worker_run_failed",
      workerId: config.workerId,
      runId: run.runId,
      jobId: run.jobId,
      state: outcome.state || "process_failed",
    }),
  );
  return { ok: false, state: outcome.state || "process_failed" };
}

export async function runWorkerPollCycle({
  db,
  config,
  activeRuns,
  now = Date.now(),
  lastReconciledAt = 0,
  runProcess = spawnCollectorRunnerProcess,
  revalidate = notifyCollectorCacheRevalidation,
}) {
  let nextReconciledAt = lastReconciledAt;
  if (now - lastReconciledAt >= config.reconcileIntervalMs) {
    await reconcileStaleRuns(db);
    nextReconciledAt = now;
  }

  const started = [];
  while (activeRuns.size < config.concurrency) {
    const claimed = await claimNextQueuedCollectorRun(db, config.workerId);
    if (!claimed) break;

    const taskPromise = executeClaimedCollectorRun({
      db,
      run: claimed,
      config,
      runProcess,
      revalidate,
    }).finally(() => {
      activeRuns.delete(claimed.runId);
    });
    activeRuns.set(claimed.runId, taskPromise);
    started.push(claimed.runId);
  }

  return { started, lastReconciledAt: nextReconciledAt };
}

async function main() {
  const config = buildWorkerConfig(process.env);
  if (!config.databaseUrl) {
    throw new Error("DATABASE_URL is required for collector-queue-worker.");
  }

  const requireSite = createRequire(
    path.join(realpathSync(config.frontendDir), "package.json"),
  );
  const { Pool } = requireSite("pg");
  const pool = new Pool({
    connectionString: config.databaseUrl,
    application_name: "geosub-collector-worker",
    max: Math.max(2, config.concurrency + 1),
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
  });

  const activeRuns = new Map();
  let lastReconciledAt = 0;
  let stopping = false;

  const stop = () => {
    stopping = true;
  };
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);

  console.log(
    JSON.stringify({
      event: "collector_worker_started",
      workerId: config.workerId,
      concurrency: config.concurrency,
      pollIntervalMs: config.pollIntervalMs,
    }),
  );

  try {
    while (!stopping) {
      try {
        const result = await runWorkerPollCycle({
          db: pool,
          config,
          activeRuns,
          lastReconciledAt,
        });
        lastReconciledAt = result.lastReconciledAt;
      } catch (error) {
        console.error(
          JSON.stringify({
            event: "collector_worker_poll_error",
            workerId: config.workerId,
            errorName: error instanceof Error ? error.name : typeof error,
          }),
        );
      }

      if (!stopping) {
        await new Promise((resolveWait) =>
          setTimeout(resolveWait, config.pollIntervalMs),
        );
      }
    }

    if (activeRuns.size > 0) {
      await Promise.allSettled(activeRuns.values());
    }
  } finally {
    await pool.end().catch(() => {});
  }
}

if (
  process.argv[1] &&
  existsSync(process.argv[1]) &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
) {
  main().catch((error) => {
    console.error(
      JSON.stringify({
        event: "collector_worker_fatal",
        errorName: error instanceof Error ? error.name : typeof error,
      }),
    );
    process.exitCode = 1;
  });
}

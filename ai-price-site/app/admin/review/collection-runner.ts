import "server-only";

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "../../../lib/prisma";
import {
  type CollectionRunResult,
  type CollectionRunStatus,
} from "./collection-status";

const MANUAL_COLLECTION_COOLDOWN_SECONDS = 120;
const MANUAL_COLLECTION_FRESH_HOURS = 12;
const COLLECTOR_START_TIMEOUT_MINUTES = 3;
const COLLECTOR_RUN_TIMEOUT_MINUTES = 20;

type StartedCollectorProcess = {
  pid: number | null;
  backendRoot: string;
  runnerPath: string;
  command: string;
};

function resolveBackendRoot() {
  const candidates = [
    process.env.GEOSUB_BACKEND_ROOT,
    process.env.GEOSUB_BACKEND_DIR,
    path.resolve(process.cwd(), "geosub-backend"),
    path.resolve(process.cwd(), "..", "geosub-backend"),
    path.resolve(process.cwd(), "..", "..", "geosub-backend"),
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    const scriptRunnerPath = path.join(candidate, "scripts", "run-collector-jobs.ps1");
    const linuxRunnerPath = path.join(candidate, "deploy", "linux-arm64", "run-collector-jobs.sh");

    if (existsSync(scriptRunnerPath) || existsSync(linuxRunnerPath)) {
      return candidate;
    }
  }

  throw new Error("Collector backend directory was not found. Set GEOSUB_BACKEND_ROOT or GEOSUB_BACKEND_DIR.");
}

async function getProductCollectionReadiness(productSlug: string) {
  const rows = await prisma.$queryRaw<
    Array<{
      product_id: string | null;
      app_store_job_count: number;
    }>
  >`
    SELECT
      product.id::text AS product_id,
      COUNT(job.id) FILTER (WHERE source.id IS NOT NULL)::int AS app_store_job_count
    FROM products product
    LEFT JOIN collector_jobs job
      ON job.product_id = product.id
      AND job.job_type = 'ai_pricing'
      AND job.status <> 'archived'
    LEFT JOIN price_sources source
      ON source.id = job.source_id
      AND source.type = 'app_store'::price_source_type
    WHERE product.slug = ${productSlug}
    GROUP BY product.id
    LIMIT 1
  `;

  return rows[0] ?? null;
}

async function markCollectorRunProcessExit(
  runId: string | null | undefined,
  status: "spawn_failed" | "process_failed",
  message: string,
) {
  if (!runId) {
    return;
  }

  try {
    await prisma.$queryRaw`
      UPDATE collector_job_runs
      SET
        status = 'failed',
        finished_at = COALESCE(finished_at, NOW()),
        duration_ms = GREATEST(0, EXTRACT(EPOCH FROM (COALESCE(finished_at, NOW()) - started_at)) * 1000)::int,
        error_message = COALESCE(error_message, ${message}),
        raw_payload = COALESCE(raw_payload, '{}'::jsonb) || jsonb_build_object('state', ${status})
      WHERE id = ${runId}::uuid
        AND status = 'running'
    `;
  } catch {
    // The page can still reconcile stale rows on the next load.
  }
}

async function markCollectorRunSpawned(runId: string | null, started: StartedCollectorProcess) {
  if (!runId) {
    return;
  }

  try {
    await prisma.$queryRaw`
      UPDATE collector_job_runs
      SET raw_payload = COALESCE(raw_payload, '{}'::jsonb) || jsonb_build_object(
        'state', 'spawned',
        'pid', ${started.pid},
        'backend_root', ${started.backendRoot},
        'runner_path', ${started.runnerPath},
        'command', ${started.command}
      )
      WHERE id = ${runId}::uuid
    `;
  } catch {
    // This metadata is diagnostic only; the collector can still finish normally.
  }
}

export async function reconcileStaleCollectorRuns(jobId?: string | null) {
  const jobFilter = jobId ? Prisma.sql`AND job_id = ${jobId}::uuid` : Prisma.empty;
  const startTimeoutMessage = `Collector process did not start reporting within ${COLLECTOR_START_TIMEOUT_MINUTES} minutes.`;
  const runTimeoutMessage = "Collector process did not finish within the expected time window.";

  await prisma.$executeRaw`
    UPDATE collector_job_runs
    SET
      status = 'failed',
      finished_at = NOW(),
      duration_ms = GREATEST(0, EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000)::int,
      error_message = COALESCE(
        error_message,
        CASE
          WHEN raw_payload ->> 'state' = 'queued_from_admin'
            THEN ${startTimeoutMessage}
          ELSE ${runTimeoutMessage}
        END
      ),
      raw_payload = COALESCE(raw_payload, '{}'::jsonb) || jsonb_build_object(
        'state',
        'stale_running_marked_failed',
        'timeout_minutes',
        CASE
          WHEN raw_payload ->> 'state' = 'queued_from_admin'
            THEN ${COLLECTOR_START_TIMEOUT_MINUTES}
          ELSE ${COLLECTOR_RUN_TIMEOUT_MINUTES}
        END
      )
    WHERE status = 'running'
      ${jobFilter}
      AND (
        (
          raw_payload ->> 'state' = 'queued_from_admin'
          AND started_at < NOW() - (${COLLECTOR_START_TIMEOUT_MINUTES} || ' minutes')::interval
        )
        OR started_at < NOW() - (${COLLECTOR_RUN_TIMEOUT_MINUTES} || ' minutes')::interval
      )
  `;
}

export function startCollectorJobInBackground(
  jobId: string,
  runId?: string | null,
): StartedCollectorProcess {
  const backendRoot = resolveBackendRoot();
  const scriptRunnerPath = path.join(backendRoot, "scripts", "run-collector-jobs.ps1");
  const linuxRunnerPath = path.join(backendRoot, "deploy", "linux-arm64", "run-collector-jobs.sh");
  const useLinuxRunner = process.platform !== "win32" && existsSync(linuxRunnerPath);
  const runnerPath = useLinuxRunner ? linuxRunnerPath : scriptRunnerPath;

  if (!existsSync(runnerPath)) {
    throw new Error(`Collector runner was not found at ${runnerPath}.`);
  }

  const command = useLinuxRunner ? "bash" : process.platform === "win32" ? "powershell.exe" : "pwsh";
  const args = useLinuxRunner
    ? [linuxRunnerPath, "-JobId", jobId, "-Force", ...(runId ? ["-RunId", runId] : [])]
    : [
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        scriptRunnerPath,
        "-JobId",
        jobId,
        "-Force",
        "-Limit",
        "1",
        ...(runId ? ["-RunId", runId] : []),
      ];
  const child = spawn(
    command,
    args,
    {
      cwd: backendRoot,
      detached: true,
      env: useLinuxRunner
        ? {
            ...process.env,
            GEOSUB_BACKEND_DIR: backendRoot,
            GEOSUB_COLLECTOR_JOB_LIMIT: "1",
          }
        : process.env,
      stdio: "ignore",
      windowsHide: true,
    }
  );

  child.once("error", (error) => {
    void markCollectorRunProcessExit(runId, "spawn_failed", error.message);
  });
  child.once("exit", (code, signal) => {
    if ((code !== null && code !== 0) || signal) {
      const message = signal
        ? `Collector process exited${code === null ? "" : ` with code ${code}`} and signal ${signal}.`
        : `Collector process exited with code ${code}.`;
      void markCollectorRunProcessExit(runId, "process_failed", message);
    }
  });
  child.unref();

  return {
    pid: child.pid ?? null,
    backendRoot,
    runnerPath,
    command,
  };
}

async function createRunningCollectorRun(jobId: string) {
  await reconcileStaleCollectorRuns(jobId);

  const rows = await prisma.$queryRaw<Array<{ run_id: string; should_start: boolean }>>`
    WITH scoped_job AS (
      SELECT
        job.id,
        job.product_id,
        job.source_id,
        COALESCE(job.job_config ->> 'collector_kind', 'unknown') AS collector_kind
      FROM collector_jobs job
      WHERE job.id = ${jobId}::uuid
      LIMIT 1
    ),
    existing_run AS (
      SELECT run.id::text AS run_id
      FROM collector_job_runs run
      JOIN scoped_job job ON job.id = run.job_id
      WHERE run.status = 'running'
        AND (
          (
            run.raw_payload ->> 'state' = 'queued_from_admin'
            AND run.started_at > NOW() - INTERVAL '3 minutes'
          )
          OR (
            COALESCE(run.raw_payload ->> 'state', '') <> 'queued_from_admin'
            AND run.started_at > NOW() - INTERVAL '20 minutes'
          )
        )
      ORDER BY run.started_at DESC
      LIMIT 1
    ),
    inserted AS (
      INSERT INTO collector_job_runs (
        id,
        job_id,
        product_id,
        source_id,
        status,
        collector_kind,
        started_at,
        raw_payload,
        created_at
      )
      SELECT
        gen_random_uuid(),
        id,
        product_id,
        source_id,
        'running',
        collector_kind,
        NOW(),
        '{"state":"queued_from_admin"}'::jsonb,
        NOW()
      FROM scoped_job
      WHERE NOT EXISTS (SELECT 1 FROM existing_run)
      RETURNING id::text AS run_id
    )
    SELECT run_id, TRUE AS should_start
    FROM inserted
    UNION ALL
    SELECT run_id, FALSE AS should_start
    FROM existing_run
    LIMIT 1
  `;

  return {
    runId: rows[0]?.run_id ?? null,
    shouldStart: rows[0]?.should_start ?? true,
  };
}

export async function startCollectorJobRunInBackground(jobId: string) {
  let runId: string | null = null;
  let shouldStart = true;

  try {
    const runningRun = await createRunningCollectorRun(jobId);
    runId = runningRun.runId;
    shouldStart = runningRun.shouldStart;
  } catch {
    runId = null;
  }

  if (!shouldStart) {
    return runId;
  }

  try {
    const started = startCollectorJobInBackground(jobId, runId);
    await markCollectorRunSpawned(runId, started);
  } catch (error) {
    if (runId) {
      await markCollectorRunProcessExit(
        runId,
        "spawn_failed",
        error instanceof Error ? error.message : "Failed to start collector process.",
      );
    }
    throw error;
  }

  return runId;
}

export async function queueAndRunAppStoreCollection(productSlug: string): Promise<CollectionRunResult> {
  if (productSlug) {
    const readiness = await getProductCollectionReadiness(productSlug);

    if (!readiness) {
      return {
        queuedCount: 0,
        runStatus: "not_found",
      };
    }

    if (readiness.app_store_job_count <= 0) {
      return {
        queuedCount: 0,
        runStatus: "not_configured",
      };
    }
  }

  const rows = productSlug
    ? await prisma.$queryRaw<Array<{ job_id: string }>>`
        WITH scoped_product AS (
          SELECT id
          FROM products
          WHERE slug = ${productSlug}
          LIMIT 1
        ),
        queued AS (
          UPDATE collector_jobs job
          SET
            status = 'active',
            next_run_at = NOW(),
            last_error = NULL,
            priority = GREATEST(priority, 100),
            updated_at = NOW()
          FROM price_sources source, scoped_product product
          WHERE source.id = job.source_id
            AND source.type = 'app_store'::price_source_type
            AND job.product_id = product.id
            AND job.job_type = 'ai_pricing'
            AND job.status <> 'archived'
          RETURNING job.id
        )
        SELECT id::text AS job_id
        FROM queued
      `
    : await prisma.$queryRaw<Array<{ job_id: string }>>`
        WITH pending_products AS (
          SELECT DISTINCT product_id
          FROM price_observations
          WHERE status = 'pending'::observation_status
            AND billing_platform = 'ios'::billing_platform
        ),
        queued AS (
          UPDATE collector_jobs job
          SET
            status = 'active',
            next_run_at = NOW(),
            last_error = NULL,
            priority = GREATEST(priority, 100),
            updated_at = NOW()
          FROM price_sources source
          WHERE source.id = job.source_id
            AND source.type = 'app_store'::price_source_type
            AND job.job_type = 'ai_pricing'
            AND job.status <> 'archived'
            AND (
              EXISTS (
                SELECT 1
                FROM pending_products pending
                WHERE pending.product_id = job.product_id
              )
              OR NOT EXISTS (SELECT 1 FROM pending_products)
            )
            AND NOT EXISTS (
              SELECT 1
              FROM collector_job_runs run
              WHERE run.job_id = job.id
                AND run.status = 'succeeded'
                AND run.started_at > NOW() - (${MANUAL_COLLECTION_FRESH_HOURS} || ' hours')::interval
            )
          RETURNING job.id
        )
        SELECT id::text AS job_id
        FROM queued
      `;

  const candidateJobIds = rows.map((row) => row.job_id).filter(Boolean);
  const recentlyRunRows = candidateJobIds.length
    ? await prisma.$queryRaw<Array<{ job_id: string }>>`
        SELECT DISTINCT run.job_id::text
        FROM collector_job_runs run
        WHERE run.job_id::text IN (${Prisma.join(candidateJobIds)})
          AND run.started_at > NOW() - (${MANUAL_COLLECTION_COOLDOWN_SECONDS} || ' seconds')::interval
      `
    : [];
  const recentlyRunJobIds = new Set(recentlyRunRows.map((row) => row.job_id));
  const runnableJobIds = candidateJobIds.filter((jobId) => !recentlyRunJobIds.has(jobId));
  let queuedCount = 0;
  let runStatus: CollectionRunStatus = candidateJobIds.length > 0 ? "queued" : productSlug ? "fresh" : "none";

  if (candidateJobIds.length > 0 && runnableJobIds.length === 0) {
    runStatus = "cooldown";
  }

  for (const jobId of runnableJobIds) {
    try {
      await startCollectorJobRunInBackground(jobId);
      queuedCount += 1;
      runStatus = "queued";
    } catch {
      if (queuedCount === 0) {
        runStatus = "failed";
      }
    }
  }

  revalidatePath("/admin/review");
  revalidatePath("/admin/pipeline");
  revalidatePath("/admin/collector-jobs");
  revalidatePath("/admin/affordability");
  revalidatePath("/zh/ai-pricing/chatgpt");

  return {
    queuedCount,
    runStatus,
  };
}

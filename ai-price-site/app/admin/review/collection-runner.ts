import "server-only";

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "../../../lib/prisma";

const MANUAL_COLLECTION_COOLDOWN_SECONDS = 120;
const MANUAL_COLLECTION_FRESH_HOURS = 12;

export type CollectionRunStatus = "queued" | "fresh" | "none" | "cooldown" | "succeeded" | "failed";

export type CollectionRunResult = {
  queuedCount: number;
  runStatus: CollectionRunStatus;
};

export function buildCollectionRedirectPath(
  { queuedCount, runStatus }: CollectionRunResult,
  productSlug?: string,
) {
  const redirectParams = new URLSearchParams({
    collectionQueued: String(queuedCount),
    collectionRun: runStatus,
  });
  const trimmedProductSlug = String(productSlug ?? "").trim();

  if (trimmedProductSlug) {
    redirectParams.set("collectionScope", trimmedProductSlug);
    redirectParams.set("q", trimmedProductSlug);
  }

  return `/admin/review?${redirectParams.toString()}`;
}

function startCollectorJobInBackground(jobId: string) {
  const backendRoot =
    process.env.GEOSUB_BACKEND_ROOT || process.env.GEOSUB_BACKEND_DIR || path.resolve(process.cwd(), "..", "geosub-backend");
  const scriptRunnerPath = path.join(backendRoot, "scripts", "run-collector-jobs.ps1");
  const linuxRunnerPath = path.join(backendRoot, "deploy", "linux-arm64", "run-collector-jobs.sh");
  const useLinuxRunner = process.platform !== "win32" && existsSync(linuxRunnerPath);
  const command = useLinuxRunner ? "bash" : process.platform === "win32" ? "powershell.exe" : "pwsh";
  const args = useLinuxRunner
    ? [linuxRunnerPath, "-JobId", jobId, "-Force"]
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

  child.unref();
}

export async function queueAndRunAppStoreCollection(productSlug: string): Promise<CollectionRunResult> {
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

  const jobIds = rows.map((row) => row.job_id).filter(Boolean);
  const queuedCount = jobIds.length;
  const recentlyRunRows = jobIds.length
    ? await prisma.$queryRaw<Array<{ job_id: string }>>`
        SELECT DISTINCT run.job_id::text
        FROM collector_job_runs run
        WHERE run.job_id::text IN (${Prisma.join(jobIds)})
          AND run.started_at > NOW() - (${MANUAL_COLLECTION_COOLDOWN_SECONDS} || ' seconds')::interval
      `
    : [];
  const recentlyRunJobIds = new Set(recentlyRunRows.map((row) => row.job_id));
  const runnableJobIds = jobIds.filter((jobId) => !recentlyRunJobIds.has(jobId));
  let runStatus: CollectionRunStatus = queuedCount > 0 ? "queued" : productSlug ? "fresh" : "none";

  if (queuedCount > 0 && runnableJobIds.length === 0) {
    runStatus = "cooldown";
  }

  for (const jobId of runnableJobIds) {
    try {
      startCollectorJobInBackground(jobId);
      runStatus = "queued";
    } catch {
      runStatus = "failed";
    }
  }

  revalidatePath("/admin/review");
  revalidatePath("/admin/collector-jobs");
  revalidatePath("/admin/affordability");
  revalidatePath("/zh/ai-pricing/chatgpt");

  return {
    queuedCount,
    runStatus,
  };
}

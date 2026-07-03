"use server";

import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "../../../lib/prisma";

const execFileAsync = promisify(execFile);
const MANUAL_COLLECTION_COOLDOWN_SECONDS = 120;
const MANUAL_COLLECTION_FRESH_HOURS = 12;

function getObservationId(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    throw new Error("Missing observation id.");
  }

  return id;
}

export async function approveObservation(formData: FormData) {
  const id = getObservationId(formData);

  await prisma.$queryRaw`
    SELECT approve_price_observation(CAST(${id} AS uuid)) AS region_price_id
  `;

  await prisma.$queryRaw`
    SELECT refresh_plan_affordability_metrics() AS refreshed_rows
  `;

  await prisma.$queryRaw`
    SELECT refresh_inferred_app_store_tax_profiles() AS inserted_rows
  `;

  revalidatePath("/admin/review");
  revalidatePath("/admin/affordability");
  revalidatePath("/zh/ai-pricing/chatgpt");
}

export async function ignoreObservation(formData: FormData) {
  const id = getObservationId(formData);

  await prisma.$queryRaw`
    WITH action AS (
      SELECT ignore_price_observation(CAST(${id} AS uuid), 'Ignored from review center') AS ignored
    )
    SELECT 1::int AS result
    FROM action
  `;

  revalidatePath("/admin/review");
}

export async function rejectObservation(formData: FormData) {
  const id = getObservationId(formData);

  await prisma.$queryRaw`
    WITH action AS (
      SELECT reject_price_observation(CAST(${id} AS uuid), 'Rejected from review center') AS rejected
    )
    SELECT 1::int AS result
    FROM action
  `;

  revalidatePath("/admin/review");
}

export async function runAutoReview() {
  await prisma.$queryRaw`
    SELECT *
    FROM run_app_store_stability_auto_review(FALSE, 3, 80, 14)
  `;

  await prisma.$queryRaw`
    SELECT refresh_plan_affordability_metrics() AS refreshed_rows
  `;

  await prisma.$queryRaw`
    SELECT refresh_inferred_app_store_tax_profiles() AS inserted_rows
  `;

  revalidatePath("/admin/review");
  revalidatePath("/admin/affordability");
  revalidatePath("/zh/ai-pricing/chatgpt");

  redirect("/admin/review?autoReview=completed");
}

export async function queueAppStoreCollectionAndReview(formData?: FormData) {
  const productSlug = String(formData?.get("productSlug") ?? "").trim();
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
  let runStatus = queuedCount > 0 ? "queued" : productSlug ? "fresh" : "none";

  if (queuedCount > 0 && runnableJobIds.length === 0) {
    runStatus = "cooldown";
  }

  for (const jobId of runnableJobIds) {
    const backendRoot =
      process.env.GEOSUB_BACKEND_ROOT || path.resolve(process.cwd(), "..", "geosub-backend");
    const runnerPath = path.join(backendRoot, "scripts", "run-collector-jobs.ps1");
    const shell = process.platform === "win32" ? "powershell.exe" : "pwsh";

    try {
      await execFileAsync(
        shell,
        [
          "-NoProfile",
          "-ExecutionPolicy",
          "Bypass",
          "-File",
          runnerPath,
          "-JobId",
          jobId,
          "-Force",
          "-Limit",
          "1",
        ],
        {
          cwd: backendRoot,
          timeout: 180_000,
          windowsHide: true,
          maxBuffer: 1024 * 1024 * 4,
        }
      );
      runStatus = "succeeded";
    } catch {
      runStatus = "failed";
    }
  }

  await prisma.$queryRaw`
    SELECT *
    FROM run_app_store_stability_auto_review(FALSE, 3, 80, 14)
  `;

  await prisma.$queryRaw`
    SELECT refresh_plan_affordability_metrics() AS refreshed_rows
  `;

  await prisma.$queryRaw`
    SELECT refresh_inferred_app_store_tax_profiles() AS inserted_rows
  `;

  revalidatePath("/admin/review");
  revalidatePath("/admin/collector-jobs");
  revalidatePath("/admin/affordability");
  revalidatePath("/zh/ai-pricing/chatgpt");

  const redirectParams = new URLSearchParams({
    collectionQueued: String(queuedCount),
    collectionRun: runStatus,
  });

  if (productSlug) {
    redirectParams.set("collectionScope", productSlug);
    redirectParams.set("q", productSlug);
  }

  redirect(`/admin/review?${redirectParams.toString()}`);
}

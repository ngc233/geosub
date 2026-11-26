"use server";

import {
  AdminCommandInputError,
  executeAdminCommand,
} from "../../../lib/admin-command";
import {
  activationPreflightConditionSql,
  formatActivationPreflightError,
} from "../../../lib/admin-product-scope";
import { adminPrisma } from "../../../lib/prisma";
import { startCollectorJobRunInBackground } from "../review/collection-runner";

function cleanText(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

function parseJobId(raw: unknown) {
  const formData = raw as FormData;
  const id = cleanText(formData.get("id"));

  if (!id) {
    throw new AdminCommandInputError("缺少采集任务 ID，无法执行操作。");
  }

  return id;
}

function parseProductId(raw: unknown) {
  const formData = raw as FormData;
  const productId = cleanText(formData.get("productId"));

  if (!productId) {
    throw new AdminCommandInputError("缺少产品 ID，无法触发批量采集。");
  }

  return productId;
}

export async function runCollectorJobNow(formData: FormData) {
  const result = await executeAdminCommand({
    name: "collector_jobs.run_now",
    capability: "manage",
    input: formData,
    parseInput: parseJobId,
    db: adminPrisma,
    preflight: async ({ input: id, db }) => {
      const preflightCondition = activationPreflightConditionSql("product", "job");
      const guarded = await db.$queryRaw<
        Array<{
          id: string;
          product_slug: string | null;
          preflight_message: string | null;
        }>
      >`
        SELECT
          job.id::text,
          product.slug AS product_slug,
          job.job_config ->> 'activation_preflight_message' AS preflight_message
        FROM collector_jobs job
        JOIN products product ON product.id = job.product_id
        WHERE job.id = ${id}::uuid
          AND ${preflightCondition}
      `;
      if (guarded.length) {
        throw new AdminCommandInputError(
          formatActivationPreflightError({
            productSlug: guarded[0]?.product_slug,
            preflightMessage: guarded[0]?.preflight_message,
          }),
        );
      }
    },
    execute: async ({ input: id, tx }) => {
      await tx.$queryRaw`
        UPDATE collector_jobs
        SET
          status = 'active',
          next_run_at = NOW(),
          last_error = NULL,
          priority = GREATEST(priority, 100),
          updated_at = NOW()
        WHERE id = ${id}::uuid
      `;
      return { id };
    },
    audit: ({ input: id }) => ({
      action: "run_now",
      targetType: "collector_job",
      targetId: id,
      note: "Marked collector job to run immediately from admin UI.",
    }),
    invalidate: ["pricing"],
    revalidatePaths: [
      "/admin/collector-jobs",
      "/admin/review",
      "/admin/pipeline",
    ],
    afterCommit: async ({ input: id }) => {
      await startCollectorJobRunInBackground(id);
    },
  });

  if (!result.ok) {
    return { ok: false, error: result.message };
  }
}

export async function runProductCollectorJobsNow(formData: FormData) {
  const result = await executeAdminCommand({
    name: "collector_jobs.run_product_now",
    capability: "manage",
    input: formData,
    parseInput: parseProductId,
    db: adminPrisma,
    execute: async ({ input: productId, tx }) => {
      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        UPDATE collector_jobs job
        SET
          status = 'active',
          next_run_at = NOW(),
          last_error = NULL,
          priority = GREATEST(priority, 100),
          updated_at = NOW()
        FROM price_sources source
        WHERE source.id = job.source_id
          AND COALESCE(
            job.job_config ->> 'collector_kind',
            source.type::text,
            'unknown'
          ) = 'app_store'
          AND job.product_id = ${productId}::uuid
          AND job.job_type IN ('ai_pricing', 'streaming_pricing')
          AND job.status <> 'archived'
        RETURNING job.id::text
      `;
      return { jobIds: rows.map((row) => row.id).filter(Boolean) };
    },
    audit: ({ input: productId, data }) => ({
      action: "run_now",
      targetType: "collector_product",
      targetId: productId,
      note: `Queued and started ${data.jobIds.length} App Store collector jobs for this product from admin UI.`,
    }),
    invalidate: ["pricing"],
    revalidatePaths: [
      "/admin/collector-jobs",
      "/admin/review",
      "/admin/pipeline",
    ],
    afterCommit: async ({ data }) => {
      for (const jobId of data.jobIds) {
        await startCollectorJobRunInBackground(jobId);
      }
    },
  });

  if (!result.ok) {
    return { ok: false, error: result.message };
  }
}

export async function pauseCollectorJob(formData: FormData) {
  const result = await executeAdminCommand({
    name: "collector_jobs.pause",
    capability: "manage",
    input: formData,
    parseInput: parseJobId,
    db: adminPrisma,
    execute: async ({ input: id, tx }) => {
      await tx.$queryRaw`
        UPDATE collector_jobs
        SET
          status = 'paused',
          updated_at = NOW()
        WHERE id = ${id}::uuid
      `;
      return { id };
    },
    audit: ({ input: id }) => ({
      action: "pause",
      targetType: "collector_job",
      targetId: id,
      note: "Paused collector job from admin UI.",
    }),
    invalidate: ["pricing"],
    revalidatePaths: ["/admin/collector-jobs"],
  });

  if (!result.ok) {
    return { ok: false, error: result.message };
  }
}

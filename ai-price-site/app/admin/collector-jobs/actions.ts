"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../../lib/admin-auth";
import { invalidateAdminPricingReadModels } from "../../../lib/admin-read-model-cache";
import { prisma } from "../../../lib/prisma";
import { startCollectorJobRunInBackground } from "../review/collection-runner";

function cleanText(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

function getJobId(formData: FormData) {
  const id = cleanText(formData.get("id"));

  if (!id) {
    throw new Error("Missing collector job id.");
  }

  return id;
}

export async function runCollectorJobNow(formData: FormData) {
  const admin = await requireAdmin("manage");
  const id = getJobId(formData);
  const guarded = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT job.id::text FROM collector_jobs job
    JOIN products product ON product.id = job.product_id
    WHERE job.id = ${id}::uuid AND product.slug = 'claude'
      AND job.job_config ->> 'collector_kind' = 'pricing_page'
  `;
  if (guarded.length) {
    return {ok:false,error:'请从 Claude 采集配置检查启用条件，再确认加入周期调度。'};
  }

  await prisma.$transaction(async (tx) => {
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

    await tx.$queryRaw`
      INSERT INTO audit_logs (
        id,
        actor_id,
        action,
        target_type,
        target_id,
        note,
        created_at
      )
      VALUES (
        gen_random_uuid(),
        ${admin.id}::uuid,
        'run_now',
        'collector_job',
        ${id}::uuid,
        'Marked collector job to run immediately from admin UI.',
        NOW()
      )
    `;
  });

  await startCollectorJobRunInBackground(id);

  invalidateAdminPricingReadModels();
  revalidatePath("/admin/collector-jobs");
  revalidatePath("/admin/review");
  revalidatePath("/admin/pipeline");
}

export async function runProductCollectorJobsNow(formData: FormData) {
  const admin = await requireAdmin("manage");
  const productId = cleanText(formData.get("productId"));

  if (!productId) {
    throw new Error("Missing product id.");
  }

  const jobIds = await prisma.$transaction(async (tx) => {
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
    const matchedJobIds = rows.map((row) => row.id).filter(Boolean);

    await tx.$queryRaw`
      INSERT INTO audit_logs (
        id,
        actor_id,
        action,
        target_type,
        target_id,
        note,
        created_at
      )
      VALUES (
        gen_random_uuid(),
        ${admin.id}::uuid,
        'run_now',
        'collector_product',
        ${productId}::uuid,
        ${`Queued and started ${matchedJobIds.length} App Store collector jobs for this product from admin UI.`},
        NOW()
      )
    `;

    return matchedJobIds;
  });

  for (const jobId of jobIds) {
    await startCollectorJobRunInBackground(jobId);
  }

  invalidateAdminPricingReadModels();
  revalidatePath("/admin/collector-jobs");
  revalidatePath("/admin/review");
  revalidatePath("/admin/pipeline");
}

export async function pauseCollectorJob(formData: FormData) {
  const admin = await requireAdmin("manage");
  const id = getJobId(formData);

  await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`
      UPDATE collector_jobs
      SET
        status = 'paused',
        updated_at = NOW()
      WHERE id = ${id}::uuid
    `;

    await tx.$queryRaw`
      INSERT INTO audit_logs (
        id,
        actor_id,
        action,
        target_type,
        target_id,
        note,
        created_at
      )
      VALUES (
        gen_random_uuid(),
        ${admin.id}::uuid,
        'pause',
        'collector_job',
        ${id}::uuid,
        'Paused collector job from admin UI.',
        NOW()
      )
    `;
  });

  invalidateAdminPricingReadModels();
  revalidatePath("/admin/collector-jobs");
}

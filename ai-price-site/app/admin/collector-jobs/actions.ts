"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../../lib/admin-auth";
import { prisma } from "../../../lib/prisma";

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
  const admin = await requireAdmin();
  const id = getJobId(formData);

  await prisma.$queryRaw`
    UPDATE collector_jobs
    SET
      status = 'active',
      next_run_at = NOW(),
      last_error = NULL,
      priority = GREATEST(priority, 100),
      updated_at = NOW()
    WHERE id = ${id}::uuid
  `;

  await prisma.$queryRaw`
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

  revalidatePath("/admin/collector-jobs");
}

export async function runProductCollectorJobsNow(formData: FormData) {
  const admin = await requireAdmin();
  const productId = cleanText(formData.get("productId"));

  if (!productId) {
    throw new Error("Missing product id.");
  }

  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    UPDATE collector_jobs
    SET
      status = 'active',
      next_run_at = NOW(),
      last_error = NULL,
      priority = GREATEST(priority, 100),
      updated_at = NOW()
    WHERE product_id = ${productId}::uuid
      AND status <> 'archived'
    RETURNING id::text
  `;

  await prisma.$queryRaw`
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
      ${`Queued ${rows.length} collector jobs for this product from admin UI.`},
      NOW()
    )
  `;

  revalidatePath("/admin/collector-jobs");
}

export async function pauseCollectorJob(formData: FormData) {
  const admin = await requireAdmin();
  const id = getJobId(formData);

  await prisma.$queryRaw`
    UPDATE collector_jobs
    SET
      status = 'paused',
      updated_at = NOW()
    WHERE id = ${id}::uuid
  `;

  await prisma.$queryRaw`
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

  revalidatePath("/admin/collector-jobs");
}

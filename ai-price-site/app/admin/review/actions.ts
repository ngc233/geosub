"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "../../../lib/prisma";
import { queueAndRunAppStoreCollection } from "./collection-runner";

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
  const { queuedCount, runStatus } = await queueAndRunAppStoreCollection(productSlug);
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

"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../../../lib/prisma";

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

  revalidatePath("/admin/price-observations");
  revalidatePath("/admin/affordability");
  revalidatePath("/zh/ai-pricing/chatgpt");
}

export async function ignoreObservation(formData: FormData) {
  const id = getObservationId(formData);

  await prisma.$queryRaw`
    SELECT ignore_price_observation(CAST(${id} AS uuid), 'Ignored from admin review page') AS result
  `;

  revalidatePath("/admin/price-observations");
}

export async function rejectObservation(formData: FormData) {
  const id = getObservationId(formData);

  await prisma.$queryRaw`
    SELECT reject_price_observation(CAST(${id} AS uuid), 'Rejected from admin review page') AS result
  `;

  revalidatePath("/admin/price-observations");
}
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  approvePriceObservation,
  ignorePriceObservation,
  rejectPriceObservation,
  runAppStoreStabilityAutoReview,
} from "../../../lib/admin-price-review";
import { buildCollectionRedirectPath } from "./collection-status";
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

  await approvePriceObservation(id, { taxProfiles: true });

  revalidatePath("/admin/review");
  revalidatePath("/admin/affordability");
  revalidatePath("/zh/ai-pricing/chatgpt");
}

export async function ignoreObservation(formData: FormData) {
  const id = getObservationId(formData);

  await ignorePriceObservation(id, "Ignored from review center");

  revalidatePath("/admin/review");
}

export async function rejectObservation(formData: FormData) {
  const id = getObservationId(formData);

  await rejectPriceObservation(id, "Rejected from review center");

  revalidatePath("/admin/review");
}

export async function runAutoReview() {
  await runAppStoreStabilityAutoReview();

  revalidatePath("/admin/review");
  revalidatePath("/admin/affordability");
  revalidatePath("/zh/ai-pricing/chatgpt");

  redirect("/admin/review?autoReview=completed");
}

export async function queueAppStoreCollectionAndReview(formData?: FormData) {
  const productSlug = String(formData?.get("productSlug") ?? "").trim();
  const result = await queueAndRunAppStoreCollection(productSlug);

  redirect(buildCollectionRedirectPath(result, productSlug));
}

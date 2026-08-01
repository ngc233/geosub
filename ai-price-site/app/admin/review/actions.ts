"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  approvePriceObservation,
  ignorePriceObservation,
  rejectPriceObservation,
  runAppStoreStabilityAutoReview,
} from "../../../lib/admin-price-review";
import { requireAdmin } from "../../../lib/admin-auth";
import { prisma } from "../../../lib/prisma";
import { invalidatePublicPricing } from "../../../lib/public-pricing-cache-actions";
import { buildCollectionRedirectPath } from "./collection-status";
import { queueAndRunAppStoreCollection } from "./collection-runner";

function getObservationId(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    throw new Error("Missing observation id.");
  }

  return id;
}

async function getObservationProductSlug(id: string) {
  const observation = await prisma.priceObservation.findUnique({
    where: { id },
    select: { product: { select: { slug: true } } },
  });

  return observation?.product.slug ?? null;
}

export async function approveObservation(formData: FormData) {
  await requireAdmin();
  const id = getObservationId(formData);
  const productSlug = await getObservationProductSlug(id);

  await approvePriceObservation(id, { taxProfiles: true });
  invalidatePublicPricing(productSlug);

  revalidatePath("/admin/review");
  revalidatePath("/admin/affordability");
}

export async function ignoreObservation(formData: FormData) {
  await requireAdmin();
  const id = getObservationId(formData);

  await ignorePriceObservation(id, "Ignored from review center");

  revalidatePath("/admin/review");
}

export async function rejectObservation(formData: FormData) {
  await requireAdmin();
  const id = getObservationId(formData);

  await rejectPriceObservation(id, "Rejected from review center");

  revalidatePath("/admin/review");
}

export async function runAutoReview() {
  await requireAdmin();
  await runAppStoreStabilityAutoReview();
  invalidatePublicPricing();

  revalidatePath("/admin/review");
  revalidatePath("/admin/affordability");

  redirect("/admin/review?autoReview=completed");
}

export async function queueAppStoreCollectionAndReview(formData?: FormData) {
  await requireAdmin();
  const productSlug = String(formData?.get("productSlug") ?? "").trim();
  const result = await queueAndRunAppStoreCollection(productSlug);

  redirect(buildCollectionRedirectPath(result, productSlug));
}

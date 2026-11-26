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
import { invalidateAdminPricingReadModels } from "../../../lib/admin-read-model-cache";
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
  const admin = await requireAdmin("manage");
  const id = getObservationId(formData);
  const productSlug = await getObservationProductSlug(id);

  await approvePriceObservation(id, {
    actorId: admin.id,
    taxProfiles: true,
    note: "Approved from review center",
  });
  invalidatePublicPricing(productSlug);

  revalidatePath("/admin/review");
  revalidatePath("/admin/affordability");
}

export async function ignoreObservation(formData: FormData) {
  const admin = await requireAdmin("manage");
  const id = getObservationId(formData);

  await ignorePriceObservation(id, "Ignored from review center", admin.id);
  invalidateAdminPricingReadModels();

  revalidatePath("/admin/review");
}

export async function rejectObservation(formData: FormData) {
  const admin = await requireAdmin("manage");
  const id = getObservationId(formData);

  await rejectPriceObservation(id, "Rejected from review center", admin.id);
  invalidateAdminPricingReadModels();

  revalidatePath("/admin/review");
}

export async function runAutoReview() {
  const admin = await requireAdmin("manage");
  await runAppStoreStabilityAutoReview(admin.id);
  invalidatePublicPricing();

  revalidatePath("/admin/review");
  revalidatePath("/admin/affordability");

  redirect("/admin/review?autoReview=completed");
}

export async function queueAppStoreCollectionAndReview(formData?: FormData) {
  const admin = await requireAdmin("manage");
  const productSlug = String(formData?.get("productSlug") ?? "").trim();
  const result = await queueAndRunAppStoreCollection(productSlug);

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "queue_app_store_collection",
      targetType: "collector_product",
      newValue: {
        productSlug: productSlug || null,
        queuedCount: result.queuedCount,
        runStatus: result.runStatus,
      },
      note: productSlug
        ? `Queued App Store collection for ${productSlug} from review center.`
        : "Queued App Store collection from review center.",
    },
  });

  invalidateAdminPricingReadModels();
  redirect(buildCollectionRedirectPath(result, productSlug));
}

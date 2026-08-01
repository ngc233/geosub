"use server";

import { revalidatePath } from "next/cache";
import {
  approvePriceObservation,
  ignorePriceObservation,
  rejectPriceObservation,
} from "../../../lib/admin-price-review";
import { requireAdmin } from "../../../lib/admin-auth";
import { prisma } from "../../../lib/prisma";
import { invalidatePublicPricing } from "../../../lib/public-pricing-cache-actions";

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

  await approvePriceObservation(id);
  invalidatePublicPricing(productSlug);

  revalidatePath("/admin/price-observations");
  revalidatePath("/admin/affordability");
}

export async function ignoreObservation(formData: FormData) {
  await requireAdmin();
  const id = getObservationId(formData);

  await ignorePriceObservation(id, "Ignored from admin review page");

  revalidatePath("/admin/price-observations");
}

export async function rejectObservation(formData: FormData) {
  await requireAdmin();
  const id = getObservationId(formData);

  await rejectPriceObservation(id, "Rejected from admin review page");

  revalidatePath("/admin/price-observations");
}

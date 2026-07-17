"use server";

import { revalidatePath } from "next/cache";
import {
  approvePriceObservation,
  ignorePriceObservation,
  rejectPriceObservation,
} from "../../../lib/admin-price-review";
import { requireAdmin } from "../../../lib/admin-auth";

function getObservationId(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    throw new Error("Missing observation id.");
  }

  return id;
}

export async function approveObservation(formData: FormData) {
  await requireAdmin();
  const id = getObservationId(formData);

  await approvePriceObservation(id);

  revalidatePath("/admin/price-observations");
  revalidatePath("/admin/affordability");
  revalidatePath("/zh/ai-pricing/chatgpt");
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

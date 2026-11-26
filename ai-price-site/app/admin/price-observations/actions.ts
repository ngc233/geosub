"use server";

import {
  AdminCommandInputError,
  executeAdminCommand,
} from "../../../lib/admin-command";
import {
  approvePriceObservation,
  ignorePriceObservation,
  rejectPriceObservation,
} from "../../../lib/admin-price-review";
import { adminPrisma } from "../../../lib/prisma";
import { invalidatePublicPricing } from "../../../lib/public-pricing-cache-actions";

function parseObservationId(raw: unknown): string {
  const formData = raw as FormData;
  const id = String(formData.get("id") ?? "").trim();

  if (!id) {
    throw new AdminCommandInputError("缺少价格观测记录 ID，无法执行审核操作。");
  }

  return id;
}

async function getObservationProductSlug(id: string) {
  const observation = await adminPrisma.priceObservation.findUnique({
    where: { id },
    select: { product: { select: { slug: true } } },
  });

  return observation?.product.slug ?? null;
}

export async function approveObservation(formData: FormData) {
  const result = await executeAdminCommand({
    name: "price_observations.approve",
    capability: "manage",
    input: formData,
    parseInput: parseObservationId,
    transactional: false,
    execute: async ({ admin, input: id }) => {
      const productSlug = await getObservationProductSlug(id);
      await approvePriceObservation(id, {
        actorId: admin.id,
        note: "Approved from admin review page",
      });
      return { productSlug };
    },
    invalidate: ["pricing"],
    revalidatePaths: ["/admin/price-observations", "/admin/affordability"],
    afterCommit: ({ data: { productSlug } }) => {
      invalidatePublicPricing(productSlug);
    },
  });

  if (!result.ok) {
    return { ok: false, error: result.message };
  }
}

export async function ignoreObservation(formData: FormData) {
  const result = await executeAdminCommand({
    name: "price_observations.ignore",
    capability: "manage",
    input: formData,
    parseInput: parseObservationId,
    transactional: false,
    execute: async ({ admin, input: id }) => {
      await ignorePriceObservation(id, "Ignored from admin review page", admin.id);
      return { id };
    },
    invalidate: ["pricing"],
    revalidatePaths: ["/admin/price-observations"],
  });

  if (!result.ok) {
    return { ok: false, error: result.message };
  }
}

export async function rejectObservation(formData: FormData) {
  const result = await executeAdminCommand({
    name: "price_observations.reject",
    capability: "manage",
    input: formData,
    parseInput: parseObservationId,
    transactional: false,
    execute: async ({ admin, input: id }) => {
      await rejectPriceObservation(id, "Rejected from admin review page", admin.id);
      return { id };
    },
    invalidate: ["pricing"],
    revalidatePaths: ["/admin/price-observations"],
  });

  if (!result.ok) {
    return { ok: false, error: result.message };
  }
}

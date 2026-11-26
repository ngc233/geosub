"use server";

import { redirect } from "next/navigation";
import {
  AdminCommandInputError,
  executeAdminCommand,
} from "../../../lib/admin-command";
import {
  approvePriceObservation,
  ignorePriceObservation,
  rejectPriceObservation,
  runAppStoreStabilityAutoReview,
} from "../../../lib/admin-price-review";
import { adminPrisma } from "../../../lib/prisma";
import { invalidatePublicPricing } from "../../../lib/public-pricing-cache-actions";
import { buildCollectionRedirectPath } from "./collection-status";
import { queueAndRunAppStoreCollection } from "./collection-runner";

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
    name: "review.observation.approve",
    capability: "manage",
    input: formData,
    parseInput: parseObservationId,
    transactional: false,
    execute: async ({ admin, input: id }) => {
      const productSlug = await getObservationProductSlug(id);
      await approvePriceObservation(id, {
        actorId: admin.id,
        taxProfiles: true,
        note: "Approved from review center",
      });
      return { productSlug };
    },
    invalidate: ["pricing"],
    revalidatePaths: ["/admin/review", "/admin/affordability"],
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
    name: "review.observation.ignore",
    capability: "manage",
    input: formData,
    parseInput: parseObservationId,
    transactional: false,
    execute: async ({ admin, input: id }) => {
      await ignorePriceObservation(id, "Ignored from review center", admin.id);
      return { id };
    },
    invalidate: ["pricing"],
    revalidatePaths: ["/admin/review"],
  });

  if (!result.ok) {
    return { ok: false, error: result.message };
  }
}

export async function rejectObservation(formData: FormData) {
  const result = await executeAdminCommand({
    name: "review.observation.reject",
    capability: "manage",
    input: formData,
    parseInput: parseObservationId,
    transactional: false,
    execute: async ({ admin, input: id }) => {
      await rejectPriceObservation(id, "Rejected from review center", admin.id);
      return { id };
    },
    invalidate: ["pricing"],
    revalidatePaths: ["/admin/review"],
  });

  if (!result.ok) {
    return { ok: false, error: result.message };
  }
}

export async function runAutoReview() {
  const result = await executeAdminCommand({
    name: "review.auto_review.run",
    capability: "manage",
    input: null,
    transactional: false,
    execute: async ({ admin }) => {
      await runAppStoreStabilityAutoReview(admin.id);
      return { completed: true };
    },
    invalidate: ["pricing"],
    revalidatePaths: ["/admin/review", "/admin/affordability"],
    afterCommit: () => {
      invalidatePublicPricing();
      redirect("/admin/review?autoReview=completed");
    },
  });

  if (!result.ok) {
    return { ok: false, error: result.message };
  }
}

export async function queueAppStoreCollectionAndReview(formData?: FormData) {
  const result = await executeAdminCommand({
    name: "review.collection.queue",
    capability: "manage",
    input: formData,
    parseInput: (raw) => {
      const fd = raw as FormData | undefined;
      return String(fd?.get("productSlug") ?? "").trim();
    },
    transactional: false,
    execute: async ({ input: productSlug }) => {
      const collectionResult = await queueAndRunAppStoreCollection(productSlug);
      return { productSlug, collectionResult };
    },
    audit: ({ data }) => ({
      action: "queue_app_store_collection",
      targetType: "collector_product",
      newValue: {
        productSlug: data.productSlug || null,
        queuedCount: data.collectionResult.queuedCount,
        runStatus: data.collectionResult.runStatus,
      },
      note: data.productSlug
        ? `Queued App Store collection for ${data.productSlug} from review center.`
        : "Queued App Store collection from review center.",
    }),
    invalidate: ["pricing"],
    afterCommit: ({ data }) => {
      redirect(buildCollectionRedirectPath(data.collectionResult, data.productSlug));
    },
  });

  if (!result.ok) {
    return { ok: false, error: result.message };
  }
}

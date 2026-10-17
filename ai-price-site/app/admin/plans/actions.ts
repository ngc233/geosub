"use server";

import { BillingCycle, PublishStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "../../../lib/admin-auth";
import { AdminSaveConflict, adminRecordVersion, assertAdminVersion, attemptAdminSave } from "../../../lib/admin-save";
import { prisma } from "../../../lib/prisma";
import { invalidatePublicPricing } from "../../../lib/public-pricing-cache-actions";

const cycles = new Set<string>(Object.values(BillingCycle));
const statuses = new Set<string>(Object.values(PublishStatus));

function text(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

function validSlug(value: string) {
  return value.length <= 120 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function validId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function parseOrder(value: FormDataEntryValue | null) {
  const number = Number(text(value));
  return Number.isSafeInteger(number) && number >= 0 && number <= 100000 ? number : null;
}

export async function createPlanAction(formData: FormData) {
  const admin = await requireAdmin("manage");
  const productId = text(formData.get("productId"));
  const name = text(formData.get("name"));
  const slug = text(formData.get("slug"));
  const billingCycle = text(formData.get("billingCycle"));
  const sortOrder = parseOrder(formData.get("sortOrder"));
  if (!validId(productId) || !name || name.length > 160 || !validSlug(slug) || !cycles.has(billingCycle) || sortOrder === null) {
    return { error: "请填写有效的产品、套餐名称、英文 slug、计费周期和排序值。输入仍保留。" };
  }

  const result = await attemptAdminSave(prisma, async (db) => {
    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product || product.status === "ARCHIVED") {
      throw new AdminSaveConflict("产品不存在或已归档，请核对后重试。");
    }
    const plan = await db.plan.create({
      data: { productId, name, slug, billingCycle: billingCycle as BillingCycle, sortOrder, status: "DRAFT" },
    });
    await db.auditLog.create({
      data: {
        actorId: admin.id,
        action: "create",
        targetType: "plan",
        targetId: plan.id,
        newValue: { productId, name, slug, billingCycle, sortOrder, status: "DRAFT" },
        note: "Created a draft plan in GeoSub Admin; no price was published.",
      },
    });
    return { productSlug: product.slug, planSlug: plan.slug };
  });
  if (!result.ok) return { error: result.error };
  revalidatePath("/admin/plans");
  invalidatePublicPricing(result.value.productSlug);
  return { message: `草稿套餐 ${result.value.planSlug} 已创建。继续核对来源和价格后再发布。` };
}

export async function updatePlanAction(formData: FormData) {
  const admin = await requireAdmin("manage");
  const id = text(formData.get("id"));
  const name = text(formData.get("name"));
  const slug = text(formData.get("slug"));
  const billingCycle = text(formData.get("billingCycle"));
  const status = text(formData.get("status"));
  const sortOrder = parseOrder(formData.get("sortOrder"));
  if (!validId(id) || !name || name.length > 160 || !validSlug(slug) || !cycles.has(billingCycle) || !statuses.has(status) || sortOrder === null) {
    return { error: "套餐名称、英文 slug、周期、状态或排序值无效。输入仍保留。" };
  }

  const result = await attemptAdminSave(prisma, async (db) => {
    await db.$queryRaw`SELECT id FROM plans WHERE id = ${id}::uuid FOR UPDATE`;
    const current = await db.plan.findUnique({ where: { id }, include: { product: true } });
    if (!current) throw new AdminSaveConflict("套餐已不存在，请返回套餐库核对。");
    assertAdminVersion(current, formData.get("recordVersion"));

    const priceCount = await db.regionPrice.count({ where: { planId: id } });
    const observationCount = await db.priceObservation.count({ where: { planId: id } });
    if ((slug !== current.slug || billingCycle !== current.billingCycle) && (priceCount > 0 || observationCount > 0)) {
      throw new AdminSaveConflict("已有价格或观测记录，不能改套餐身份或周期；请归档后建立新套餐。");
    }
    if (status === "ARCHIVED" && (priceCount > 0 || current.product.status === "PUBLISHED")) {
      throw new AdminSaveConflict("已发布产品或已有正式价格的套餐不能从此页面归档，请先单独核对公开影响。");
    }
    if (status === "PUBLISHED" && current.status !== "PUBLISHED") {
      const verified = await db.regionPrice.count({
        where: { planId: id, status: "PUBLISHED", dataQuality: "VERIFIED" },
      });
      if (current.product.status !== "PUBLISHED" || verified === 0) {
        throw new AdminSaveConflict("产品和至少一条已核验正式价格发布后，才能发布套餐。");
      }
    }

    const updated = await db.plan.update({
      where: { id },
      data: { name, slug, billingCycle: billingCycle as BillingCycle, status: status as PublishStatus, sortOrder },
    });
    await db.auditLog.create({
      data: {
        actorId: admin.id,
        action: "update",
        targetType: "plan",
        targetId: id,
        oldValue: { name: current.name, slug: current.slug, billingCycle: current.billingCycle, status: current.status, sortOrder: current.sortOrder },
        newValue: { name, slug, billingCycle, status, sortOrder },
        note: "Updated plan identity and publication state in GeoSub Admin.",
      },
    });
    return { productSlug: current.product.slug, version: adminRecordVersion(updated) };
  });
  if (!result.ok) return { error: result.error };
  revalidatePath("/admin/plans");
  revalidatePath(`/admin/plans/${id}/edit`);
  invalidatePublicPricing(result.value.productSlug);
  return { recordVersion: result.value.version, message: "套餐已保存。" };
}

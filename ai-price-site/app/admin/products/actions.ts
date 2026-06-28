"use server";

import { ProductCategory, PublishStatus } from "@prisma/client";
import { redirect } from "next/navigation";
import { requireAdmin } from "../../../lib/admin-auth";
import { prisma } from "../../../lib/prisma";

function cleanText(value: FormDataEntryValue | null) {
  return String(value || "").trim();
}

function cleanOptionalText(value: FormDataEntryValue | null) {
  const text = cleanText(value);
  return text.length > 0 ? text : null;
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");
}

function parseSortOrder(value: FormDataEntryValue | null) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function parseCategory(value: FormDataEntryValue | null): ProductCategory {
  const category = cleanText(value);

  if (
    category === "AI" ||
    category === "STREAMING" ||
    category === "SOFTWARE" ||
    category === "GAME" ||
    category === "GIFT_CARD" ||
    category === "VPN" ||
    category === "PAYMENT" ||
    category === "OTHER"
  ) {
    return category;
  }

  return "AI";
}

function parseStatus(value: FormDataEntryValue | null): PublishStatus {
  const status = cleanText(value);

  if (
    status === "DRAFT" ||
    status === "REVIEW" ||
    status === "PUBLISHED" ||
    status === "ARCHIVED"
  ) {
    return status;
  }

  return "DRAFT";
}

export async function createProductAction(formData: FormData) {
  const admin = await requireAdmin();

  const name = cleanText(formData.get("name"));
  const slug = normalizeSlug(cleanText(formData.get("slug")));
  const category = parseCategory(formData.get("category"));
  const status = parseStatus(formData.get("status"));

  if (!name || !slug) {
    redirect("/admin/products/new?error=missing");
  }

  const exists = await prisma.product.findUnique({
    where: {
      slug,
    },
  });

  if (exists) {
    redirect("/admin/products/new?error=slug");
  }

  const product = await prisma.product.create({
    data: {
      name,
      slug,
      category,
      provider: cleanOptionalText(formData.get("provider")),
      logoUrl: cleanOptionalText(formData.get("logoUrl")),
      description: cleanOptionalText(formData.get("description")),
      officialUrl: cleanOptionalText(formData.get("officialUrl")),
      status,
      featured: formData.get("featured") === "on",
      sortOrder: parseSortOrder(formData.get("sortOrder")),
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "create",
      targetType: "product",
      targetId: product.id,
      newValue: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        category: product.category,
        status: product.status,
      },
      note: "Created product from GeoSub Admin.",
    },
  });

  redirect("/admin/products");
}

export async function updateProductAction(formData: FormData) {
  const admin = await requireAdmin();

  const id = cleanText(formData.get("id"));
  const name = cleanText(formData.get("name"));
  const slug = normalizeSlug(cleanText(formData.get("slug")));
  const category = parseCategory(formData.get("category"));
  const status = parseStatus(formData.get("status"));

  if (!id || !name || !slug) {
    redirect("/admin/products?error=missing");
  }

  const current = await prisma.product.findUnique({
    where: {
      id,
    },
  });

  if (!current) {
    redirect("/admin/products?error=not-found");
  }

  const slugOwner = await prisma.product.findUnique({
    where: {
      slug,
    },
  });

  if (slugOwner && slugOwner.id !== id) {
    redirect(`/admin/products/${id}/edit?error=slug`);
  }

  const updated = await prisma.product.update({
    where: {
      id,
    },
    data: {
      name,
      slug,
      category,
      provider: cleanOptionalText(formData.get("provider")),
      logoUrl: cleanOptionalText(formData.get("logoUrl")),
      description: cleanOptionalText(formData.get("description")),
      officialUrl: cleanOptionalText(formData.get("officialUrl")),
      status,
      featured: formData.get("featured") === "on",
      sortOrder: parseSortOrder(formData.get("sortOrder")),
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "update",
      targetType: "product",
      targetId: updated.id,
      oldValue: {
        id: current.id,
        name: current.name,
        slug: current.slug,
        category: current.category,
        status: current.status,
        featured: current.featured,
        sortOrder: current.sortOrder,
      },
      newValue: {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        category: updated.category,
        status: updated.status,
        featured: updated.featured,
        sortOrder: updated.sortOrder,
      },
      note: "Updated product from GeoSub Admin.",
    },
  });

  redirect("/admin/products");
}

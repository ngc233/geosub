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

function normalizeNameForMatch(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

async function findAppStoreApp(productName: string) {
  const response = await fetch(
    `https://itunes.apple.com/search?term=${encodeURIComponent(productName)}&entity=software&limit=5`,
    {
      headers: {
        "User-Agent": "GeoSubAdmin/1.0",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as {
    results?: Array<{
      trackId?: number;
      trackName?: string;
      trackViewUrl?: string;
      sellerName?: string;
    }>;
  };

  const expected = normalizeNameForMatch(productName);
  const candidates = data.results || [];
  const exact =
    candidates.find((candidate) => normalizeNameForMatch(candidate.trackName || "") === expected) ||
    candidates.find((candidate) => {
      const trackName = normalizeNameForMatch(candidate.trackName || "");
      return trackName.includes(expected) || expected.includes(trackName);
    });

  if (!exact?.trackId || !exact.trackViewUrl) {
    return null;
  }

  return {
    appStoreId: String(exact.trackId),
    appStoreUrl: exact.trackViewUrl,
    appStoreName: exact.trackName || productName,
    sellerName: exact.sellerName || null,
  };
}

async function configureAppStoreSourceForProduct({
  productId,
  productName,
  provider,
  appStoreUrl,
  appStoreId,
}: {
  productId: string;
  productName: string;
  provider: string | null;
  appStoreUrl: string;
  appStoreId: string;
}) {
  return prisma.$queryRaw<Array<{ source_id: string }>>`
    WITH upserted_source AS (
      INSERT INTO price_sources (
        id,
        source_key,
        name,
        source_level,
        type,
        provider,
        base_url,
        country_url_pattern,
        requires_javascript,
        requires_account,
        requires_geo,
        terms_risk,
        reliability_score,
        status,
        note,
        created_at,
        updated_at
      )
      VALUES (
        gen_random_uuid(),
        ${`product-${productId}-app-store`}::text,
        ${`${productName} App Store`}::text,
        'A'::source_level,
        'app_store'::price_source_type,
        ${provider || productName}::text,
        ${appStoreUrl}::text,
        ${appStoreUrl}::text,
        FALSE,
        FALSE,
        TRUE,
        'low'::risk_level,
        85,
        'active'::source_status,
        'Automatically configured from product onboarding.',
        NOW(),
        NOW()
      )
      ON CONFLICT (source_key)
      DO UPDATE SET
        name = EXCLUDED.name,
        provider = EXCLUDED.provider,
        base_url = EXCLUDED.base_url,
        country_url_pattern = EXCLUDED.country_url_pattern,
        reliability_score = EXCLUDED.reliability_score,
        status = 'active'::source_status,
        updated_at = NOW()
      RETURNING id
    ),
    upserted_job AS (
      INSERT INTO collector_jobs (
        id,
        source_id,
        product_id,
        job_type,
        schedule,
        status,
        next_run_at,
        job_config,
        priority,
        created_at,
        updated_at
      )
      SELECT
        gen_random_uuid(),
        id,
        ${productId}::uuid,
        'ai_pricing',
        'daily',
        'active',
        NOW(),
        jsonb_build_object(
          'created_from', 'product_onboarding',
          'source_kind', 'app-store',
          'product_id', ${productId}::uuid,
          'url', ${appStoreUrl}::text,
          'app_store_id', ${appStoreId}::text,
          'collector_kind', 'app_store'
        ),
        100,
        NOW(),
        NOW()
      FROM upserted_source
      WHERE NOT EXISTS (
        SELECT 1
        FROM collector_jobs existing
        WHERE existing.product_id = ${productId}::uuid
          AND existing.source_id = (SELECT id FROM upserted_source)
          AND existing.job_type = 'ai_pricing'
          AND existing.status <> 'archived'
      )
      RETURNING id
    )
    SELECT id::text AS source_id FROM upserted_source
  `;
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

  const appStoreApp = await findAppStoreApp(product.name).catch(() => null);
  if (appStoreApp) {
    const rows = await configureAppStoreSourceForProduct({
      productId: product.id,
      productName: product.name,
      provider: product.provider,
      appStoreUrl: appStoreApp.appStoreUrl,
      appStoreId: appStoreApp.appStoreId,
    });

    await prisma.auditLog.create({
      data: {
        actorId: admin.id,
        action: "auto_configure",
        targetType: "product_app_store_source",
        targetId: rows[0]?.source_id || product.id,
        newValue: {
          productId: product.id,
          appStoreId: appStoreApp.appStoreId,
          appStoreUrl: appStoreApp.appStoreUrl,
          appStoreName: appStoreApp.appStoreName,
          sellerName: appStoreApp.sellerName,
        },
        note: "Automatically configured App Store source from product onboarding.",
      },
    });

    redirect(`/admin/products/${product.id}/edit?created=1&appStoreAuto=found`);
  }

  redirect(`/admin/products/${product.id}/edit?created=1&appStoreAuto=not-found`);
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

function extractAppStoreId(value: string | null) {
  if (!value) return null;

  const match = value.match(/id(\d{6,})/i) || value.match(/^\d{6,}$/);
  return match ? match[1] : null;
}

export async function saveProductAppStoreSourceAction(formData: FormData) {
  const admin = await requireAdmin();

  const productId = cleanText(formData.get("productId"));
  const appStoreUrl = cleanOptionalText(formData.get("appStoreUrl"));
  const appStoreId =
    cleanOptionalText(formData.get("appStoreId")) || extractAppStoreId(appStoreUrl);

  if (!productId) {
    redirect("/admin/products?error=missing");
  }

  if (!appStoreUrl || !appStoreId) {
    redirect(`/admin/products/${productId}/edit?sourceError=app-store`);
  }

  const product = await prisma.product.findUnique({
    where: {
      id: productId,
    },
  });

  if (!product) {
    redirect("/admin/products?error=not-found");
  }

  const rows = await configureAppStoreSourceForProduct({
    productId: product.id,
    productName: product.name,
    provider: product.provider,
    appStoreUrl,
    appStoreId,
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "upsert",
      targetType: "product_app_store_source",
      targetId: rows[0]?.source_id || product.id,
      newValue: {
        productId: product.id,
        appStoreUrl,
        appStoreId,
      },
      note: "Configured App Store source and collector job from product edit page.",
    },
  });

  redirect(`/admin/products/${product.id}/edit?sourceSaved=1`);
}

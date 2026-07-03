"use server";

import { ProductCategory, PublishStatus, StructuredDataType } from "@prisma/client";
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

function parseStructuredDataType(value: FormDataEntryValue | null): StructuredDataType {
  const text = cleanText(value);

  if (
    text === "ARTICLE" ||
    text === "BLOG_POSTING" ||
    text === "HOW_TO" ||
    text === "FAQ_PAGE" ||
    text === "NEWS_ARTICLE" ||
    text === "TECH_ARTICLE" ||
    text === "NONE"
  ) {
    return text;
  }

  return "NONE";
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
      sellerUrl?: string;
      artworkUrl512?: string;
      artworkUrl100?: string;
      artworkUrl60?: string;
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
    sellerUrl: exact.sellerUrl || null,
    artworkUrl: normalizeAppStoreArtworkUrl(
      exact.artworkUrl512 || exact.artworkUrl100 || exact.artworkUrl60 || null,
    ),
  };
}

function normalizeAppStoreArtworkUrl(value: string | null | undefined) {
  const url = value?.trim();

  if (!url) {
    return null;
  }

  return url.replace(/\/\d+x\d+bb\.(jpg|jpeg|png|webp)$/i, "/512x512bb.$1");
}

function getHtmlAttribute(tag: string, attributeName: string) {
  const match = tag.match(
    new RegExp(`${attributeName}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"),
  );

  return match?.[2] || match?.[3] || match?.[4] || null;
}

function toAbsoluteUrl(value: string, baseUrl: string) {
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return null;
  }
}

function getOfficialIconScore(tag: string) {
  const rel = getHtmlAttribute(tag, "rel")?.toLowerCase() || "";
  const href = getHtmlAttribute(tag, "href")?.toLowerCase() || "";
  const type = getHtmlAttribute(tag, "type")?.toLowerCase() || "";
  const sizes = getHtmlAttribute(tag, "sizes")?.toLowerCase() || "";

  if (!rel.includes("icon")) {
    return -1;
  }

  let score = 0;
  if (href.endsWith(".svg") || type.includes("svg")) score += 1000;
  if (href.endsWith(".png") || type.includes("png")) score += 700;
  if (rel.includes("apple-touch-icon")) score += 500;
  if (href.includes("favicon")) score -= 150;

  const sizeMatches = Array.from(sizes.matchAll(/(\d+)x(\d+)/g));
  for (const match of sizeMatches) {
    const width = Number(match[1]);
    const height = Number(match[2]);
    if (Number.isFinite(width) && Number.isFinite(height)) {
      score += Math.min(width, height);
    }
  }

  if (sizes === "any") score += 256;

  return score;
}

async function lookupAppStoreArtwork(appStoreId: string | null) {
  if (!appStoreId) {
    return null;
  }

  const response = await fetch(
    `https://itunes.apple.com/lookup?id=${encodeURIComponent(appStoreId)}`,
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
      trackName?: string;
      sellerName?: string;
      sellerUrl?: string;
      artworkUrl512?: string;
      artworkUrl100?: string;
      artworkUrl60?: string;
    }>;
  };
  const app = data.results?.[0];
  const logoUrl = normalizeAppStoreArtworkUrl(
    app?.artworkUrl512 || app?.artworkUrl100 || app?.artworkUrl60 || null,
  );

  if (!logoUrl) {
    return null;
  }

  return {
    logoUrl,
    appName: app?.trackName || null,
    sellerName: app?.sellerName || null,
    sellerUrl: app?.sellerUrl || null,
  };
}

async function fetchOfficialSiteIcon(officialUrl: string | null) {
  if (!officialUrl) {
    return null;
  }

  let siteUrl: URL;
  try {
    siteUrl = new URL(officialUrl);
  } catch {
    return null;
  }

  const response = await fetch(siteUrl.toString(), {
    headers: {
      "User-Agent": "GeoSubAdmin/1.0",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return `${siteUrl.origin}/favicon.ico`;
  }

  const html = await response.text();
  const linkTags = html.match(/<link\b[^>]*>/gi) || [];
  const finalUrl = response.url || siteUrl.toString();
  const iconCandidates = linkTags
    .map((tag) => {
      const href = getHtmlAttribute(tag, "href");
      const absoluteUrl = href ? toAbsoluteUrl(href, finalUrl) : null;

      return {
        url: absoluteUrl,
        score: getOfficialIconScore(tag),
      };
    })
    .filter((candidate) => candidate.url && !candidate.url.startsWith("data:") && candidate.score >= 0)
    .sort((a, b) => b.score - a.score);

  if (iconCandidates[0]?.url) {
    return iconCandidates[0].url;
  }

  return `${siteUrl.origin}/favicon.ico`;
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

  let product = await prisma.product.create({
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

  const initialOfficialLogoUrl = product.logoUrl
    ? null
    : await fetchOfficialSiteIcon(product.officialUrl).catch(() => null);
  if (initialOfficialLogoUrl) {
    product = await prisma.product.update({
      where: {
        id: product.id,
      },
      data: {
        logoUrl: initialOfficialLogoUrl,
      },
    });
  }

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
    const officialUrl = product.officialUrl || appStoreApp.sellerUrl || null;
    const officialLogoUrl =
      !product.logoUrl && officialUrl
        ? await fetchOfficialSiteIcon(officialUrl).catch(() => null)
        : null;
    const fallbackLogoUrl =
      !product.logoUrl && !officialLogoUrl ? appStoreApp.artworkUrl : null;

    if (
      (!product.logoUrl && (officialLogoUrl || fallbackLogoUrl)) ||
      (!product.officialUrl && appStoreApp.sellerUrl)
    ) {
      product = await prisma.product.update({
        where: {
          id: product.id,
        },
        data: {
          logoUrl: product.logoUrl || officialLogoUrl || fallbackLogoUrl,
          officialUrl: product.officialUrl || appStoreApp.sellerUrl,
        },
      });
    }

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
          sellerUrl: appStoreApp.sellerUrl,
          logoUrl: product.logoUrl || officialLogoUrl || appStoreApp.artworkUrl,
          logoSource: officialLogoUrl ? "official-site" : "app-store",
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

export async function syncProductOfficialLogoAction(formData: FormData) {
  const admin = await requireAdmin();

  const productId = cleanText(formData.get("productId"));
  const formAppStoreId = cleanOptionalText(formData.get("appStoreId"));

  if (!productId) {
    redirect("/admin/products?error=missing");
  }

  const product = await prisma.product.findUnique({
    where: {
      id: productId,
    },
  });

  if (!product) {
    redirect("/admin/products?error=not-found");
  }

  const appStoreRows = await prisma.$queryRaw<Array<{
    app_store_id: string | null;
    app_store_url: string | null;
  }>>`
    SELECT
      job.job_config ->> 'app_store_id' AS app_store_id,
      source.base_url AS app_store_url
    FROM collector_jobs job
    JOIN price_sources source ON source.id = job.source_id
    WHERE job.product_id = ${product.id}::uuid
      AND source.type = 'app_store'
      AND job.status <> 'archived'
    ORDER BY job.updated_at DESC, job.created_at DESC
    LIMIT 1
  `;
  const storedAppStoreId =
    appStoreRows[0]?.app_store_id || extractAppStoreId(appStoreRows[0]?.app_store_url || null);
  const appStoreId = formAppStoreId || storedAppStoreId;
  let appStoreLogo =
    product.officialUrl || !appStoreId
      ? null
      : await lookupAppStoreArtwork(appStoreId).catch(() => null);
  const officialUrl = product.officialUrl || appStoreLogo?.sellerUrl || null;
  const officialSiteLogo = await fetchOfficialSiteIcon(officialUrl).catch(() => null);

  if (!officialSiteLogo && !appStoreLogo) {
    appStoreLogo = await lookupAppStoreArtwork(appStoreId).catch(() => null);
  }

  const logoUrl = officialSiteLogo || appStoreLogo?.logoUrl;
  const logoSource = officialSiteLogo ? "official-site" : "app-store";

  if (!logoUrl) {
    redirect(`/admin/products/${product.id}/edit?logoError=not-found`);
  }

  await prisma.product.update({
    where: {
      id: product.id,
    },
    data: {
      logoUrl,
      officialUrl: product.officialUrl || officialUrl,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "sync",
      targetType: "product_logo",
      targetId: product.id,
      oldValue: {
        logoUrl: product.logoUrl,
      },
      newValue: {
        logoUrl,
        logoSource,
        appStoreId,
        officialUrl,
        appName: appStoreLogo?.appName || null,
        sellerName: appStoreLogo?.sellerName || null,
      },
      note: "Synced product logo from official App Store artwork or official website icon.",
    },
  });

  redirect(`/admin/products/${product.id}/edit?logoSynced=${logoSource}`);
}

export async function saveProductSeoAction(formData: FormData) {
  const admin = await requireAdmin();

  const productId = cleanText(formData.get("productId"));
  const title = cleanText(formData.get("title"));

  if (!productId || !title) {
    redirect("/admin/products?error=missing");
  }

  const product = await prisma.product.findUnique({
    where: {
      id: productId,
    },
  });

  if (!product) {
    redirect("/admin/products?error=not-found");
  }

  const existing = await prisma.seoMeta.findFirst({
    where: {
      productId,
      planId: null,
      articleId: null,
      categoryId: null,
      locale: "ZH",
    },
  });

  const data = {
    productId,
    planId: null,
    articleId: null,
    categoryId: null,
    locale: "ZH" as const,
    title,
    description: cleanOptionalText(formData.get("description")),
    h1: cleanOptionalText(formData.get("h1")),
    canonicalUrl: cleanOptionalText(formData.get("canonicalUrl")),
    schemaType: parseStructuredDataType(formData.get("schemaType")),
    status: parseStatus(formData.get("status")),
  };

  const seo = existing
    ? await prisma.seoMeta.update({
        where: {
          id: existing.id,
        },
        data,
      })
    : await prisma.seoMeta.create({
        data,
      });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: existing ? "update" : "create",
      targetType: "product_seo",
      targetId: seo.id,
      newValue: {
        productId,
        title: seo.title,
        status: seo.status,
      },
      note: "Saved product SEO metadata from product edit page.",
    },
  });

  redirect(`/admin/products/${product.id}/edit?seoSaved=1`);
}

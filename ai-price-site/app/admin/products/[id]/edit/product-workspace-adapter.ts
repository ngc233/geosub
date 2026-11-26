import "server-only";

import type { BillingCycle, BillingPlatform, DataQuality, Product, PublishStatus, SeoMeta } from "@prisma/client";
import { adminPrisma as prisma } from "../../../../../lib/prisma";

export type ProductWorkspaceTab = "overview" | "plans" | "sources" | "prices" | "seo";

export function parseProductWorkspaceTab(raw?: string): ProductWorkspaceTab {
  if (
    raw === "overview" ||
    raw === "plans" ||
    raw === "sources" ||
    raw === "prices" ||
    raw === "seo"
  ) {
    return raw;
  }
  return "overview";
}

export type ProductWorkspacePlanItem = {
  id: string;
  slug: string;
  name: string;
  billingCycle: BillingCycle;
  status: PublishStatus;
  sortOrder: number;
  priceCount: number;
  updatedAt: Date;
};

export type ProductWorkspaceJobItem = {
  id: string;
  jobType: string;
  collectorKind: string;
  status: string;
  schedule: string | null;
  nextRunAt: Date | string | null;
  appStoreId: string | null;
  sourceName: string | null;
  baseUrl: string | null;
  latestRunStatus: string | null;
  latestRunStartedAt: Date | string | null;
};

export type ProductWorkspacePriceItem = {
  id: string;
  planName: string;
  countryCode: string;
  countryName: string;
  localPrice: number;
  currency: string;
  priceUsd: number;
  billingPlatform: BillingPlatform;
  dataQuality: DataQuality;
  lastCheckedAt: Date | null;
  sourceName: string | null;
};

export type ProductWorkspaceViewModel = {
  product: Product;
  tab: ProductWorkspaceTab;
  counts: {
    plans: number;
    prices: number;
    jobs: number;
    pendingObservations: number;
  };
  appStoreSource: { baseUrl: string | null } | null;
  latestAppStoreJob: {
    id: string;
    status: string;
    next_run_at: Date | string | null;
    app_store_id: string | null;
  } | null;
  plans: ProductWorkspacePlanItem[];
  jobs: ProductWorkspaceJobItem[];
  prices: ProductWorkspacePriceItem[];
  seoMeta: SeoMeta | null;
};

/**
 * Thin ViewModel adapter for the Single-Product Multi-Tab Workspace (/admin/products/[id]/edit).
 * Fetches lightweight tab counts up front and loads tab-specific details on demand.
 */
export async function loadProductWorkspaceView(
  id: string,
  tab: ProductWorkspaceTab,
): Promise<ProductWorkspaceViewModel | null> {
  const product = await prisma.product.findUnique({
    where: { id },
  });

  if (!product) {
    return null;
  }

  const [
    planCount,
    priceCount,
    jobCountRows,
    pendingObsCount,
    appStoreJobRows,
  ] = await Promise.all([
    prisma.plan.count({
      where: { productId: product.id, status: { not: "ARCHIVED" } },
    }),
    prisma.regionPrice.count({
      where: { productId: product.id, status: "PUBLISHED" },
    }),
    prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count
      FROM collector_jobs
      WHERE product_id = ${product.id}::uuid
        AND status <> 'archived'
    `,
    prisma.priceObservation.count({
      where: { productId: product.id, status: "PENDING" },
    }),
    prisma.$queryRaw<
      Array<{
        id: string;
        status: string;
        next_run_at: Date | string | null;
        app_store_id: string | null;
        baseUrl: string | null;
      }>
    >`
      SELECT
        job.id::text,
        job.status,
        job.next_run_at,
        job.job_config ->> 'app_store_id' AS app_store_id,
        source.base_url AS "baseUrl"
      FROM collector_jobs job
      JOIN price_sources source ON source.id = job.source_id
      WHERE job.product_id = ${product.id}::uuid
        AND COALESCE(
          job.job_config ->> 'collector_kind',
          source.type::text,
          'unknown'
        ) = 'app_store'
        AND job.status <> 'archived'
      ORDER BY
        (job.status = 'active') DESC,
        (job.schedule = 'daily') DESC,
        job.updated_at DESC
      LIMIT 1
    `,
  ]);

  const latestAppStoreRow = appStoreJobRows[0] || null;

  let plans: ProductWorkspacePlanItem[] = [];
  let jobs: ProductWorkspaceJobItem[] = [];
  let prices: ProductWorkspacePriceItem[] = [];
  let seoMeta: SeoMeta | null = null;

  if (tab === "plans") {
    const rawPlans = await prisma.plan.findMany({
      where: { productId: product.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        _count: {
          select: { regionPrices: true },
        },
      },
    });
    plans = rawPlans.map((plan) => ({
      id: plan.id,
      slug: plan.slug,
      name: plan.name,
      billingCycle: plan.billingCycle,
      status: plan.status,
      sortOrder: plan.sortOrder,
      priceCount: plan._count.regionPrices,
      updatedAt: plan.updatedAt,
    }));
  } else if (tab === "sources") {
    const rawJobs = await prisma.$queryRaw<
      Array<{
        id: string;
        job_type: string;
        collector_kind: string;
        status: string;
        schedule: string | null;
        next_run_at: Date | string | null;
        app_store_id: string | null;
        source_name: string | null;
        base_url: string | null;
        latest_run_status: string | null;
        latest_run_started_at: Date | string | null;
      }>
    >`
      SELECT
        job.id::text,
        job.job_type,
        COALESCE(job.job_config ->> 'collector_kind', source.type::text, 'unknown') AS collector_kind,
        job.status,
        job.schedule,
        job.next_run_at,
        job.job_config ->> 'app_store_id' AS app_store_id,
        source.name AS source_name,
        source.base_url,
        latest.status AS latest_run_status,
        latest.started_at AS latest_run_started_at
      FROM collector_jobs job
      LEFT JOIN price_sources source ON source.id = job.source_id
      LEFT JOIN LATERAL (
        SELECT status, started_at
        FROM collector_job_runs
        WHERE job_id = job.id
        ORDER BY started_at DESC
        LIMIT 1
      ) latest ON TRUE
      WHERE job.product_id = ${product.id}::uuid
        AND job.status <> 'archived'
      ORDER BY (job.status = 'active') DESC, job.updated_at DESC
    `;

    jobs = rawJobs.map((row) => ({
      id: row.id,
      jobType: row.job_type,
      collectorKind: row.collector_kind,
      status: row.status,
      schedule: row.schedule,
      nextRunAt: row.next_run_at,
      appStoreId: row.app_store_id,
      sourceName: row.source_name,
      baseUrl: row.base_url,
      latestRunStatus: row.latest_run_status,
      latestRunStartedAt: row.latest_run_started_at,
    }));
  } else if (tab === "prices") {
    const rawPrices = await prisma.regionPrice.findMany({
      where: { productId: product.id, status: "PUBLISHED" },
      orderBy: [{ priceUsd: "asc" }],
      take: 60,
      include: {
        plan: { select: { name: true } },
        country: { select: { code: true, nameZh: true, nameEn: true } },
        primarySource: { select: { name: true } },
      },
    });
    prices = rawPrices.map((row) => ({
      id: row.id,
      planName: row.plan.name,
      countryCode: row.country.code,
      countryName: row.country.nameZh || row.country.nameEn,
      localPrice: Number(row.localPrice),
      currency: row.currency,
      priceUsd: Number(row.priceUsd),
      billingPlatform: row.billingPlatform,
      dataQuality: row.dataQuality,
      lastCheckedAt: row.lastCheckedAt,
      sourceName: row.primarySource?.name ?? null,
    }));
  } else if (tab === "seo") {
    seoMeta = await prisma.seoMeta.findFirst({
      where: {
        productId: product.id,
        planId: null,
        articleId: null,
        categoryId: null,
        locale: "ZH",
      },
    });
  }

  return {
    product,
    tab,
    counts: {
      plans: planCount,
      prices: priceCount,
      jobs: Number(jobCountRows[0]?.count ?? 0),
      pendingObservations: pendingObsCount,
    },
    appStoreSource: latestAppStoreRow ? { baseUrl: latestAppStoreRow.baseUrl } : null,
    latestAppStoreJob: latestAppStoreRow
      ? {
          id: latestAppStoreRow.id,
          status: latestAppStoreRow.status,
          next_run_at: latestAppStoreRow.next_run_at,
          app_store_id: latestAppStoreRow.app_store_id,
        }
      : null,
    plans,
    jobs,
    prices,
    seoMeta,
  };
}

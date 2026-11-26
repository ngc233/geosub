import "server-only";

import { Prisma, type ProductCategory } from "@prisma/client";
import {
  assessProductOperationalStatus,
  countAdminOperationalAssessments,
  getAdminOperationalTotal,
  isArchivedPublishStatus,
  type AdminOperationalStatus,
} from "../../../lib/admin-operational-status";
import {
  buildAdminListHref,
  paginateAdminItems,
  parseAdminListParams,
  type AdminSortDirection,
} from "../../../lib/admin-list-params";
import { measureAdminWorkload } from "../../../lib/admin-performance";
import { matchesAdminProduct, parseAdminProductFilter } from "../../../lib/admin-workflow-context";
import { prisma } from "../../../lib/prisma";

export type CategoryValue =
  | "all"
  | "ai"
  | "software"
  | "streaming"
  | "game"
  | "gift_card"
  | "payment"
  | "vpn"
  | "other";

export type CategoryConfig = {
  value: CategoryValue;
  label: string;
  shortLabel: string;
  dbValue?: ProductCategory;
  description: string;
};

export const PRODUCT_CATEGORIES: readonly CategoryConfig[] = [
  {
    value: "all",
    label: "全部服务",
    shortLabel: "全部",
    description: "所有已录入的数字服务、订阅、游戏平台与充值服务。",
  },
  {
    value: "ai",
    label: "AI 订阅",
    shortLabel: "AI",
    dbValue: "AI" as ProductCategory,
    description: "ChatGPT、Claude、Gemini、Perplexity 等 AI 服务。",
  },
  {
    value: "software",
    label: "软件订阅",
    shortLabel: "软件",
    dbValue: "SOFTWARE" as ProductCategory,
    description: "Microsoft 365、Adobe、Canva、Notion 等软件服务。",
  },
  {
    value: "streaming",
    label: "流媒体",
    shortLabel: "流媒体",
    dbValue: "STREAMING" as ProductCategory,
    description: "Netflix、Disney+、Spotify、YouTube Premium 等内容订阅。",
  },
  {
    value: "game",
    label: "游戏 / Steam",
    shortLabel: "游戏",
    dbValue: "GAME" as ProductCategory,
    description: "Steam、Xbox Game Pass、PlayStation Plus 等游戏服务。",
  },
  {
    value: "gift_card",
    label: "礼品卡",
    shortLabel: "礼品卡",
    dbValue: "GIFT_CARD" as ProductCategory,
    description: "Apple、Google Play、Steam 等数字礼品卡。",
  },
  {
    value: "payment",
    label: "支付工具",
    shortLabel: "支付",
    dbValue: "PAYMENT" as ProductCategory,
    description: "支付、虚拟卡与账号相关服务。",
  },
  {
    value: "vpn",
    label: "网络工具",
    shortLabel: "网络工具",
    dbValue: "VPN" as ProductCategory,
    description: "后台保留数据分类。",
  },
  {
    value: "other",
    label: "其他",
    shortLabel: "其他",
    dbValue: "OTHER" as ProductCategory,
    description: "暂未归类的数字服务。",
  },
];

export const PRODUCT_SORT_COLUMNS = [
  "name",
  "plans",
  "countries",
  "prices",
  "checked",
] as const;

export type ProductSortColumn = (typeof PRODUCT_SORT_COLUMNS)[number];

type ProductAssetRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  provider: string | null;
  status: string;
  sort_order: number | null;
  created_at: Date | string;
  plan_count: unknown;
  price_count: unknown;
  country_count: unknown;
  min_price_usd: unknown;
  max_price_usd: unknown;
  verified_price_count: unknown;
  stale_price_count: unknown;
  pending_price_count: unknown;
  missing_source_count: unknown;
  app_store_job_count: unknown;
  latest_run_status: string | null;
  pending_observation_count: unknown;
  blocked_observation_count: unknown;
  published_price_count: unknown;
  published_stale_price_count: unknown;
  last_checked_at: Date | string | null;
};

export type ProductCatalogItem = {
  id: string;
  slug: string;
  name: string;
  category: ProductCategory;
  categoryLabel: string;
  provider: string | null;
  status: string;
  planCount: number;
  priceCount: number;
  countryCount: number;
  minPriceUsd: number | null;
  maxPriceUsd: number | null;
  lastCheckedAt: Date | null;
  operationalStatus: AdminOperationalStatus;
  operationalReason: string;
};

export type ProductsCatalogViewModel = {
  selectedCategory: CategoryConfig;
  selectedState: "all" | AdminOperationalStatus;
  q: string;
  productSlug: string;
  sort: ProductSortColumn;
  direction: AdminSortDirection;
  activeTotal: number;
  archivedCount: number;
  totalPlans: number;
  totalPrices: number;
  countryCoverage: number;
  issueCount: number;
  operationalCounts: ReturnType<typeof countAdminOperationalAssessments>;
  categoryCounts: Array<{ value: CategoryValue; shortLabel: string; count: number; issueCount: number }>;
  items: ProductCatalogItem[];
  pagination: {
    page: number;
    totalPages: number;
    total: number;
    pageSize: number;
  };
  currentParams: Record<string, string | undefined>;
};

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") return Number(value);
  if (value && typeof value === "object" && "toNumber" in value) {
    return Number((value as { toNumber: () => number }).toNumber());
  }
  return 0;
}

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined) return null;
  const num = toNumber(value);
  return Number.isFinite(num) ? num : null;
}

function toDate(value: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getSelectedCategory(value?: string): CategoryConfig {
  const normalized = String(value || "all").toLowerCase();
  return PRODUCT_CATEGORIES.find((item) => item.value === normalized) || PRODUCT_CATEGORIES[0];
}

async function getProductAssets() {
  return prisma.$queryRaw<ProductAssetRow[]>`
    SELECT
      product.id::text,
      product.slug,
      product.name,
      product.category::text AS category,
      product.provider,
      product.status::text AS status,
      product.sort_order,
      product.created_at,
      COALESCE(plan_stats.plan_count, 0)::int AS plan_count,
      COALESCE(price_stats.price_count, 0)::int AS price_count,
      COALESCE(price_stats.country_count, 0)::int AS country_count,
      price_stats.min_price_usd,
      price_stats.max_price_usd,
      COALESCE(price_stats.verified_price_count, 0)::int AS verified_price_count,
      COALESCE(price_stats.stale_price_count, 0)::int AS stale_price_count,
      COALESCE(price_stats.pending_price_count, 0)::int AS pending_price_count,
      COALESCE(price_stats.missing_source_count, 0)::int AS missing_source_count,
      COALESCE(job_stats.app_store_job_count, 0)::int AS app_store_job_count,
      latest_run.status AS latest_run_status,
      COALESCE(observation_stats.pending_observation_count, 0)::int AS pending_observation_count,
      COALESCE(observation_stats.blocked_observation_count, 0)::int AS blocked_observation_count,
      COALESCE(published_stats.published_price_count, 0)::int AS published_price_count,
      COALESCE(published_stats.published_stale_price_count, 0)::int AS published_stale_price_count,
      price_stats.last_checked_at
    FROM products product
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS plan_count
      FROM plans plan
      WHERE plan.product_id = product.id
        AND plan.status <> 'archived'::publish_status
    ) plan_stats ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*)::int AS price_count,
        COUNT(DISTINCT price.country_id)::int AS country_count,
        MIN(price.price_usd) AS min_price_usd,
        MAX(price.price_usd) AS max_price_usd,
        COUNT(*) FILTER (WHERE price.data_quality = 'verified'::data_quality)::int AS verified_price_count,
        COUNT(*) FILTER (WHERE price.data_quality = 'stale'::data_quality)::int AS stale_price_count,
        COUNT(*) FILTER (WHERE price.data_quality = 'pending_review'::data_quality)::int AS pending_price_count,
        COUNT(*) FILTER (WHERE price.primary_source_id IS NULL)::int AS missing_source_count,
        MAX(COALESCE(price.last_checked_at, price.updated_at)) AS last_checked_at
      FROM region_prices price
      WHERE price.product_id = product.id
        AND price.status <> 'archived'::publish_status
    ) price_stats ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*) FILTER (
        WHERE COALESCE(
          job.job_config ->> 'collector_kind',
          source.type::text,
          'unknown'
        ) = 'app_store'
      )::int AS app_store_job_count
      FROM collector_jobs job
      LEFT JOIN price_sources source ON source.id = job.source_id
      WHERE job.product_id = product.id
        AND job.job_type IN ('ai_pricing', 'streaming_pricing')
        AND job.status <> 'archived'
    ) job_stats ON TRUE
    LEFT JOIN LATERAL (
      SELECT run.status
      FROM collector_jobs scoped_job
      JOIN collector_job_runs run ON run.job_id = scoped_job.id
      WHERE scoped_job.product_id = product.id
        AND scoped_job.job_type IN ('ai_pricing', 'streaming_pricing')
        AND COALESCE(scoped_job.job_config ->> 'collector_kind', run.collector_kind, 'unknown') = 'app_store'
      ORDER BY run.started_at DESC
      LIMIT 1
    ) latest_run ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*)::int AS pending_observation_count,
        COUNT(*) FILTER (WHERE COALESCE(observation.anomaly_flag, FALSE))::int AS blocked_observation_count
      FROM price_observations observation
      WHERE observation.product_id = product.id
        AND observation.status = 'pending'::observation_status
        AND observation.billing_platform = 'ios'::billing_platform
    ) observation_stats ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*)::int AS published_price_count,
        COUNT(*) FILTER (
          WHERE price.last_checked_at IS NULL
            OR price.last_checked_at < NOW() - INTERVAL '14 days'
        )::int AS published_stale_price_count
      FROM region_prices price
      WHERE price.product_id = product.id
        AND price.status = 'published'::publish_status
        AND price.billing_platform = 'ios'::billing_platform
    ) published_stats ON TRUE
    ORDER BY product.sort_order ASC, product.created_at ASC, product.name ASC
  `;
}

async function getCountryCoverage(category?: CategoryValue) {
  const categoryFilter =
    category && category !== "all"
      ? Prisma.sql`AND product.category = ${category}::product_category`
      : Prisma.empty;

  const rows = await prisma.$queryRaw<Array<{ country_count: unknown }>>`
    SELECT COUNT(DISTINCT price.country_id)::int AS country_count
    FROM region_prices price
    JOIN products product ON product.id = price.product_id
    WHERE price.status <> 'archived'::publish_status
      AND product.status <> 'archived'::publish_status
    ${categoryFilter}
  `;

  return toNumber(rows[0]?.country_count);
}

function compareItems(
  left: ProductCatalogItem,
  right: ProductCatalogItem,
  sort: ProductSortColumn,
  direction: AdminSortDirection,
) {
  const factor = direction === "desc" ? -1 : 1;
  if (sort === "plans") return (left.planCount - right.planCount) * factor;
  if (sort === "countries") return (left.countryCount - right.countryCount) * factor;
  if (sort === "prices") return (left.priceCount - right.priceCount) * factor;
  if (sort === "checked") {
    const a = left.lastCheckedAt?.getTime() ?? 0;
    const b = right.lastCheckedAt?.getTime() ?? 0;
    return (a - b) * factor;
  }
  return left.name.localeCompare(right.name, "zh-CN") * factor;
}

export function buildProductsHref(
  current: Record<string, string | undefined>,
  patch: Record<string, string | number | undefined>,
) {
  return buildAdminListHref("/admin/products", current, patch);
}

/**
 * Thin ViewModel adapter for /admin/products.
 * Keeps existing SQL queries untouched in Phase 1 while giving the UI a clean,
 * sortable table contract ready for Phase 2 SQL pagination & adminPrisma cutover.
 */
export async function loadProductsCatalogView(rawParams: {
  category?: string;
  page?: string;
  q?: string;
  product?: string;
  state?: string;
  sort?: string;
  dir?: string;
}): Promise<ProductsCatalogViewModel> {
  const productFilter = parseAdminProductFilter(rawParams);
  const selectedCategory = getSelectedCategory(rawParams.category);
  const selectedState: "all" | AdminOperationalStatus = [
    "not_started",
    "pending",
    "exception",
    "published",
  ].includes(String(rawParams.state))
    ? (String(rawParams.state) as AdminOperationalStatus)
    : "all";

  const listParams = parseAdminListParams(rawParams, {
    sortable: PRODUCT_SORT_COLUMNS,
    defaultSort: "name",
    defaultDirection: "asc",
  });

  const [rawRows, countryCoverage] = await measureAdminWorkload("products.page-data", () =>
    Promise.all([getProductAssets(), getCountryCoverage(selectedCategory.value)]),
  );

  const normalized = rawRows.map((row) => {
    const category = row.category.toUpperCase() as ProductCategory;
    const status = row.status.toUpperCase();
    const planCount = toNumber(row.plan_count);
    const priceCount = toNumber(row.price_count);
    const countryCount = toNumber(row.country_count);
    const assessment = assessProductOperationalStatus({
      publishStatus: status,
      planCount,
      activeCollectorJobCount: toNumber(row.app_store_job_count),
      latestRunStatus: row.latest_run_status,
      pendingWorkCount: toNumber(row.pending_observation_count),
      blockedCount: toNumber(row.blocked_observation_count),
      publishedPriceCount: toNumber(row.published_price_count),
      priceCount,
      verifiedPriceCount: toNumber(row.verified_price_count),
      stalePriceCount: toNumber(row.published_stale_price_count),
      missingSourceCount: toNumber(row.missing_source_count),
    });

    const catConfig = PRODUCT_CATEGORIES.find((item) => item.dbValue === category);

    return {
      assessment,
      item: {
        id: row.id,
        slug: row.slug,
        name: row.name,
        category,
        categoryLabel: catConfig?.shortLabel || String(category),
        provider: row.provider,
        status,
        planCount,
        priceCount,
        countryCount,
        minPriceUsd: toNullableNumber(row.min_price_usd),
        maxPriceUsd: toNullableNumber(row.max_price_usd),
        lastCheckedAt: toDate(row.last_checked_at),
        operationalStatus: assessment?.status ?? "not_started",
        operationalReason: assessment?.reason ?? "",
      } satisfies ProductCatalogItem,
    };
  });

  const archivedCount = normalized.filter((entry) =>
    isArchivedPublishStatus(entry.item.status),
  ).length;

  const activeEntries = normalized.filter(
    (entry) =>
      !isArchivedPublishStatus(entry.item.status) &&
      matchesAdminProduct(entry.item, productFilter),
  );

  const categoryEntries =
    selectedCategory.value === "all"
      ? activeEntries
      : activeEntries.filter((entry) => entry.item.category === selectedCategory.dbValue);

  const operationalCounts = countAdminOperationalAssessments(
    categoryEntries.map((entry) => entry.assessment),
  );
  const activeTotal = getAdminOperationalTotal(operationalCounts);

  const stateEntries =
    selectedState === "all"
      ? categoryEntries
      : categoryEntries.filter((entry) => entry.item.operationalStatus === selectedState);

  const sortedItems = stateEntries.map((entry) => entry.item);
  if (rawParams.sort) {
    sortedItems.sort((left, right) =>
      compareItems(
        left,
        right,
        listParams.sort as ProductSortColumn,
        listParams.direction,
      ),
    );
  }

  const paged = paginateAdminItems(sortedItems, rawParams.page, 25);

  const categoryCounts = PRODUCT_CATEGORIES.map((category) => {
    const matched =
      category.value === "all"
        ? activeEntries
        : activeEntries.filter((entry) => entry.item.category === category.dbValue);
    return {
      value: category.value,
      shortLabel: category.shortLabel,
      count: matched.length,
      issueCount: matched.filter((entry) => entry.item.operationalStatus !== "published").length,
    };
  });

  const currentParams: Record<string, string | undefined> = {
    product: productFilter.product || undefined,
    q: productFilter.q || undefined,
    category: selectedCategory.value !== "all" ? selectedCategory.value : undefined,
    state: selectedState !== "all" ? selectedState : undefined,
    sort: rawParams.sort ? listParams.sort : undefined,
    dir: rawParams.sort ? listParams.direction : undefined,
    page: paged.page > 1 ? String(paged.page) : undefined,
  };

  return {
    selectedCategory,
    selectedState,
    q: productFilter.q,
    productSlug: productFilter.product,
    sort: (rawParams.sort ? listParams.sort : "name") as ProductSortColumn,
    direction: listParams.direction,
    activeTotal,
    archivedCount,
    totalPlans: categoryEntries.reduce((sum, entry) => sum + entry.item.planCount, 0),
    totalPrices: categoryEntries.reduce((sum, entry) => sum + entry.item.priceCount, 0),
    countryCoverage,
    issueCount: categoryEntries.filter(
      (entry) => entry.item.operationalStatus !== "published",
    ).length,
    operationalCounts,
    categoryCounts,
    items: paged.items,
    pagination: {
      page: paged.page,
      totalPages: paged.totalPages,
      total: paged.total,
      pageSize: paged.pageSize,
    },
    currentParams,
  };
}

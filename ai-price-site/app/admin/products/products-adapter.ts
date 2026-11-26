import "server-only";

import { Prisma, type ProductCategory } from "@prisma/client";
import {
  assessProductOperationalStatus,
  countAdminOperationalAssessments,
  getAdminOperationalTotal,
  type AdminOperationalStatus,
} from "../../../lib/admin-operational-status";
import {
  buildAdminListHref,
  parseAdminListParams,
  type AdminSortDirection,
} from "../../../lib/admin-list-params";
import { measureAdminWorkload } from "../../../lib/admin-performance";
import { parseAdminProductFilter } from "../../../lib/admin-workflow-context";
import { adminPrisma as prisma } from "../../../lib/prisma";
import {
  queryCanonicalProductsPage,
  type CanonicalCatalogSort,
} from "../../../lib/admin-product-status-read-model";

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
  categoryCounts: Array<{
    value: CategoryValue;
    shortLabel: string;
    count: number;
    issueCount: number;
  }>;
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

export function buildProductsHref(
  current: Record<string, string | undefined>,
  patch: Record<string, string | number | undefined>,
) {
  return buildAdminListHref("/admin/products", current, patch);
}

/**
 * ViewModel adapter for /admin/products backed by the canonical
 * adminPrisma product-status read model with SQL-level filtering, sorting,
 * and LIMIT/OFFSET pagination.
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

  const sqlSort: CanonicalCatalogSort = rawParams.sort
    ? (listParams.sort as ProductSortColumn)
    : "default";

  const [canonicalPage, countryCoverage] = await measureAdminWorkload("products.page-data", () =>
    Promise.all([
      queryCanonicalProductsPage({
        product: productFilter.product || undefined,
        q: productFilter.q || undefined,
        category: selectedCategory.value,
        state: selectedState,
        sort: sqlSort,
        direction: listParams.direction,
        page: rawParams.page,
        pageSize: 25,
      }),
      getCountryCoverage(selectedCategory.value),
    ]),
  );

  const items: ProductCatalogItem[] = canonicalPage.rows.map((row) => {
    const category = row.product_category.toUpperCase() as ProductCategory;
    const status = row.product_status.toUpperCase();
    const planCount = toNumber(row.plan_count);
    const priceCount = toNumber(row.price_count);
    const countryCount = toNumber(row.country_count);
    const assessment = assessProductOperationalStatus({
      publishStatus: status,
      planCount,
      activeCollectorJobCount:
        toNumber(row.app_store_job_count) + toNumber(row.official_web_job_count),
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
      id: row.product_id,
      slug: row.product_slug,
      name: row.product_name,
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
      operationalStatus: row.operational_status,
      operationalReason: assessment?.reason ?? "",
    };
  });

  const operationalCounts = canonicalPage.operationalCounts;
  const activeTotal = getAdminOperationalTotal(operationalCounts);

  const categoryCounts = PRODUCT_CATEGORIES.map((category) => {
    let count = 0;
    let issueCount = 0;
    for (const summary of canonicalPage.summaryRows) {
      if (category.value !== "all" && summary.category.toLowerCase() !== category.value) {
        continue;
      }
      const n = toNumber(summary.product_count);
      count += n;
      if (summary.operational_status !== "published") {
        issueCount += n;
      }
    }
    return {
      value: category.value,
      shortLabel: category.shortLabel,
      count,
      issueCount,
    };
  });

  const currentParams: Record<string, string | undefined> = {
    product: productFilter.product || undefined,
    q: productFilter.q || undefined,
    category: selectedCategory.value !== "all" ? selectedCategory.value : undefined,
    state: selectedState !== "all" ? selectedState : undefined,
    sort: rawParams.sort ? listParams.sort : undefined,
    dir: rawParams.sort ? listParams.direction : undefined,
    page: canonicalPage.pagination.page > 1 ? String(canonicalPage.pagination.page) : undefined,
  };

  return {
    selectedCategory,
    selectedState,
    q: productFilter.q,
    productSlug: productFilter.product,
    sort: (rawParams.sort ? listParams.sort : "name") as ProductSortColumn,
    direction: listParams.direction,
    activeTotal,
    archivedCount: canonicalPage.archivedCount,
    totalPlans: canonicalPage.totalPlans,
    totalPrices: canonicalPage.totalPrices,
    countryCoverage,
    issueCount:
      operationalCounts.not_started + operationalCounts.pending + operationalCounts.exception,
    operationalCounts,
    categoryCounts,
    items,
    pagination: {
      page: canonicalPage.pagination.page,
      totalPages: canonicalPage.pagination.totalPages,
      total: canonicalPage.pagination.total,
      pageSize: canonicalPage.pagination.pageSize,
    },
    currentParams,
  };
}

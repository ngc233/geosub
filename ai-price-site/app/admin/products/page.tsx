import Link from "next/link";
import { Plus } from "lucide-react";
import { Prisma, type ProductCategory } from "@prisma/client";
import { AdminLinkButton } from "../../../components/admin/AdminButton";
import { AdminCard, AdminPageHeader } from "../../../components/admin/AdminCard";
import SegmentedControl from "../../../components/ui/SegmentedControl";
import { prisma } from "../../../lib/prisma";

type CategoryValue =
  | "all"
  | "ai"
  | "software"
  | "streaming"
  | "game"
  | "gift_card"
  | "payment"
  | "vpn"
  | "other";

const categoryConfigs: Array<{
  value: CategoryValue;
  label: string;
  shortLabel: string;
  dbValue?: ProductCategory;
  description: string;
}> = [
  {
    value: "all",
    label: "全部服务",
    shortLabel: "全部",
    description: "所有已录入的数字服务、订阅、游戏平台、礼品卡和虚拟服务。",
  },
  {
    value: "ai",
    label: "AI 订阅",
    shortLabel: "AI",
    dbValue: "AI" as ProductCategory,
    description: "ChatGPT、Claude、Gemini、Perplexity、Midjourney 等 AI 服务。",
  },
  {
    value: "software",
    label: "软件订阅",
    shortLabel: "软件",
    dbValue: "SOFTWARE" as ProductCategory,
    description: "Microsoft 365、Adobe、Canva、Notion、JetBrains 等软件服务。",
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
    description: "Steam、Xbox Game Pass、PlayStation Plus、Nintendo 等游戏服务。",
  },
  {
    value: "gift_card",
    label: "礼品卡 / 充值卡",
    shortLabel: "礼品卡",
    dbValue: "GIFT_CARD" as ProductCategory,
    description: "Apple、Google Play、Steam、Xbox、PlayStation 等数字礼品卡。",
  },
  {
    value: "payment",
    label: "支付 / 虚拟服务",
    shortLabel: "支付",
    dbValue: "PAYMENT" as ProductCategory,
    description: "支付、账号、虚拟服务相关数据。",
  },
  {
    value: "vpn",
    label: "网络工具",
    shortLabel: "网络工具",
    dbValue: "VPN" as ProductCategory,
    description: "后台保留数据分类，简体中文前台不作为主导航展示。",
  },
  {
    value: "other",
    label: "其他 / 待归类",
    shortLabel: "其他",
    dbValue: "OTHER" as ProductCategory,
    description: "暂时无法归入明确业务线的服务。",
  },
];

function getSelectedCategory(value?: string) {
  const normalized = String(value || "all").toLowerCase();

  return (
    categoryConfigs.find((category) => category.value === normalized) ||
    categoryConfigs[0]
  );
}

function statusLabel(status: string) {
  if (status === "PUBLISHED") return "已发布";
  if (status === "DRAFT") return "草稿";
  if (status === "REVIEW") return "待审核";
  if (status === "ARCHIVED") return "已归档";
  return status;
}

function statusClassName(status: string) {
  if (status === "PUBLISHED") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (status === "DRAFT") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  if (status === "REVIEW") {
    return "bg-blue-50 text-blue-700 ring-blue-200";
  }

  return "bg-slate-100 text-slate-600 ring-slate-200";
}

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
  last_checked_at: Date | string | null;
};

type ProductAsset = {
  id: string;
  slug: string;
  name: string;
  category: ProductCategory;
  provider: string | null;
  status: string;
  planCount: number;
  priceCount: number;
  countryCount: number;
  minPriceUsd: number | null;
  maxPriceUsd: number | null;
  verifiedPriceCount: number;
  stalePriceCount: number;
  pendingPriceCount: number;
  missingSourceCount: number;
  lastCheckedAt: Date | null;
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
  const number = toNumber(value);
  return Number.isFinite(number) ? number : null;
}

function toDate(value: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeCategory(value: string): ProductCategory {
  return value.toUpperCase() as ProductCategory;
}

function normalizeStatus(value: string) {
  return value.toUpperCase();
}

function normalizeProductAsset(row: ProductAssetRow): ProductAsset {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: normalizeCategory(row.category),
    provider: row.provider,
    status: normalizeStatus(row.status),
    planCount: toNumber(row.plan_count),
    priceCount: toNumber(row.price_count),
    countryCount: toNumber(row.country_count),
    minPriceUsd: toNullableNumber(row.min_price_usd),
    maxPriceUsd: toNullableNumber(row.max_price_usd),
    verifiedPriceCount: toNumber(row.verified_price_count),
    stalePriceCount: toNumber(row.stale_price_count),
    pendingPriceCount: toNumber(row.pending_price_count),
    missingSourceCount: toNumber(row.missing_source_count),
    lastCheckedAt: toDate(row.last_checked_at),
  };
}

async function getProductAssets() {
  const rows = await prisma.$queryRaw<ProductAssetRow[]>`
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
      price_stats.last_checked_at
    FROM products product
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS plan_count
      FROM plans plan
      WHERE plan.product_id = product.id
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
    ) price_stats ON TRUE
    ORDER BY product.sort_order ASC, product.created_at ASC, product.name ASC
  `;

  return rows.map(normalizeProductAsset);
}

async function getCountryCoverage(category?: CategoryValue) {
  const categoryFilter =
    category && category !== "all"
      ? Prisma.sql`WHERE product.category = ${category}::product_category`
      : Prisma.empty;

  const rows = await prisma.$queryRaw<Array<{ country_count: unknown }>>`
    SELECT COUNT(DISTINCT price.country_id)::int AS country_count
    FROM region_prices price
    JOIN products product ON product.id = price.product_id
    ${categoryFilter}
  `;

  return toNumber(rows[0]?.country_count);
}

function getHealth(product: ProductAsset) {
  if (product.planCount === 0) {
    return {
      label: "无套餐",
      tone: "danger",
      detail: "该服务还没有套餐，无法形成可用价格页。",
    };
  }

  if (product.priceCount === 0) {
    return {
      label: "无价格",
      tone: "danger",
      detail: "该服务已有套餐，但还没有区域价格。",
    };
  }

  const staleCount = product.stalePriceCount;

  if (staleCount > 0) {
    return {
      label: `过期 ${staleCount}`,
      tone: "danger",
      detail: "存在过期价格，需要优先更新。",
    };
  }

  const noSourceCount = product.missingSourceCount;

  if (noSourceCount > 0) {
    return {
      label: `缺来源 ${noSourceCount}`,
      tone: "warning",
      detail: "部分价格缺少主来源，后续需要补来源。",
    };
  }

  const pendingCount = product.pendingPriceCount;

  if (pendingCount > 0) {
    return {
      label: `待审核 ${pendingCount}`,
      tone: "warning",
      detail: "部分价格仍处于待审核状态。",
    };
  }

  return {
    label: "正常",
    tone: "success",
    detail: "该服务已有套餐、价格和可用数据质量。",
  };
}

function healthClassName(tone: string) {
  if (tone === "success") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (tone === "danger") {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  if (tone === "warning") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function formatDate(value: Date | null) {
  if (!value) return "—";

  return value.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function formatUsd(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }

  return `$${value.toFixed(2)}`;
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    category?: string;
  }>;
}) {
  const params = searchParams ? await searchParams : {};
  const selectedCategory = getSelectedCategory(params?.category);

  const [allProducts, countryCoverage] = await Promise.all([
    getProductAssets(),
    getCountryCoverage(selectedCategory.value),
  ]);

  const products =
    selectedCategory.value === "all"
      ? allProducts
      : allProducts.filter(
          (product) => product.category === selectedCategory.dbValue
        );

  const categoryStats = categoryConfigs
    .filter((category) => category.value !== "all")
    .map((category) => {
      const categoryProducts = allProducts.filter(
        (product) => product.category === category.dbValue
      );

      const planCount = categoryProducts.reduce((sum, product) => sum + product.planCount, 0);

      const priceCount = categoryProducts.reduce((sum, product) => sum + product.priceCount, 0);

      const issueCount = categoryProducts.filter((product) => {
        const health = getHealth(product);
        return health.tone !== "success";
      }).length;

      return {
        ...category,
        productCount: categoryProducts.length,
        planCount,
        priceCount,
        issueCount,
      };
    });

  const totalPlans = products.reduce((sum, product) => sum + product.planCount, 0);

  const totalPrices = products.reduce((sum, product) => sum + product.priceCount, 0);

  const issueProducts = products.filter((product) => {
    const health = getHealth(product);
    return health.tone !== "success";
  });

  return (
    <div>
      <AdminPageHeader
        eyebrow="Products"
        title="产品 / 服务库"
        description="管理 GeoSub 的数字服务资产。先录入产品，再补套餐、价格和来源，最终进入前台展示。"
        action={
          <div className="flex flex-wrap gap-2">
            <AdminLinkButton
              href="/admin/discovery"
              variant="secondary"
            >
              从发现线索导入
            </AdminLinkButton>
            <AdminLinkButton
              href="/admin/products/new"
            >
              <Plus size={16} strokeWidth={2} />
              新增产品
            </AdminLinkButton>
          </div>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <AdminCard>
          <div className="text-sm font-bold text-slate-500">当前分类</div>
          <div className="mt-2 text-2xl font-black text-slate-950">
            {selectedCategory.shortLabel}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            {selectedCategory.description}
          </div>
        </AdminCard>

        <AdminCard>
          <div className="text-sm font-bold text-slate-500">产品 / 套餐</div>
          <div className="mt-2 text-2xl font-black text-slate-950">
            {products.length} / {totalPlans}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            当前筛选范围内的产品与套餐数量。
          </div>
        </AdminCard>

        <AdminCard>
          <div className="text-sm font-bold text-slate-500">价格 / 国家</div>
          <div className="mt-2 text-2xl font-black text-slate-950">
            {totalPrices} / {countryCoverage}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            当前分类的区域价格和国家覆盖。
          </div>
        </AdminCard>

        <AdminCard>
          <div className="text-sm font-bold text-slate-500">需处理服务</div>
          <div className="mt-2 text-2xl font-black text-slate-950">
            {issueProducts.length}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            无套餐、无价格、缺来源或价格过期的服务。
          </div>
        </AdminCard>
      </div>

      <AdminCard className="mb-6">
        <div className="mb-5 flex flex-col gap-2">
          <h2 className="text-lg font-black text-slate-950">
            分类总览
          </h2>
          <p className="text-sm text-slate-500">
            产品库后期不按大表平铺，而是先看分类资产健康度。点击卡片可快速进入对应分类。
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {categoryStats.map((category) => {
            const active = selectedCategory.value === category.value;

            return (
              <Link
                key={category.value}
                href={`/admin/products?category=${category.value}`}
                className={[
                  "rounded-xl border p-5 transition",
                  active
                    ? "border-blue-200 bg-blue-50 shadow-sm ring-1 ring-blue-100"
                    : "border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/50",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-base font-black text-slate-950">
                      {category.label}
                    </div>
                    <div className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                      {category.description}
                    </div>
                  </div>

                  {category.issueCount > 0 ? (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-black text-amber-700 ring-1 ring-amber-200">
                      问题 {category.issueCount}
                    </span>
                  ) : (
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-200">
                      正常
                    </span>
                  )}
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl bg-white/80 px-3 py-3 ring-1 ring-slate-100">
                    <div className="text-lg font-black text-slate-950">
                      {category.productCount}
                    </div>
                    <div className="mt-1 text-[11px] font-bold text-slate-400">
                      产品
                    </div>
                  </div>

                  <div className="rounded-xl bg-white/80 px-3 py-3 ring-1 ring-slate-100">
                    <div className="text-lg font-black text-slate-950">
                      {category.planCount}
                    </div>
                    <div className="mt-1 text-[11px] font-bold text-slate-400">
                      套餐
                    </div>
                  </div>

                  <div className="rounded-xl bg-white/80 px-3 py-3 ring-1 ring-slate-100">
                    <div className="text-lg font-black text-slate-950">
                      {category.priceCount}
                    </div>
                    <div className="mt-1 text-[11px] font-bold text-slate-400">
                      价格
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </AdminCard>

      <AdminCard>
        <div className="mb-5 flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-950">
                产品资产列表
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                这里重点不是最低价，而是判断每个产品是否有套餐、是否有国家覆盖、是否缺来源、是否可以进入前台展示。
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/admin/plans"
                className="text-sm font-black text-blue-700 hover:text-blue-900"
              >
                套餐库 →
              </Link>

              <Link
                href="/admin/prices"
                className="text-sm font-black text-blue-700 hover:text-blue-900"
              >
                价格库 →
              </Link>
            </div>
          </div>

          <SegmentedControl
            ariaLabel="产品分类"
            value={selectedCategory.value}
            tone="blue"
            items={categoryConfigs.map((category) => ({
              label: category.shortLabel,
              value: category.value,
              href:
                category.value === "all"
                  ? "/admin/products"
                  : `/admin/products?category=${category.value}`,
            }))}
          />
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <div className="min-w-[1120px]">
          <div className="grid grid-cols-[minmax(150px,1.2fr)_120px_120px_80px_80px_90px_120px_100px_100px_80px] gap-0 bg-slate-50 px-5 py-3 text-xs font-black uppercase tracking-wide text-slate-400">
            <div>服务</div>
            <div>分类</div>
            <div>服务商</div>
            <div>套餐</div>
            <div>国家</div>
            <div>价格</div>
            <div>数据健康</div>
            <div>最后检查</div>
            <div>状态</div>
            <div>操作</div>
          </div>

          <div className="divide-y divide-slate-100 bg-white">
            {products.map((product) => {
              const health = getHealth(product);
              const category = categoryConfigs.find(
                (item) => item.dbValue === product.category
              );

              return (
                <div
                  key={product.id}
                  className="grid grid-cols-[minmax(150px,1.2fr)_120px_120px_80px_80px_90px_120px_100px_100px_80px] items-center gap-0 px-5 py-4 text-sm"
                >
                  <div>
                    <Link
                      href={`/admin/products/${product.id}/edit`}
                      className="font-black text-slate-950 transition hover:text-blue-700"
                    >
                      {product.name}
                    </Link>
                    <div className="mt-1 font-mono text-xs text-slate-400">
                      {product.slug}
                    </div>
                    {product.minPriceUsd !== null || product.maxPriceUsd !== null ? (
                      <div className="mt-2 text-xs font-bold text-slate-400">
                        {formatUsd(product.minPriceUsd)} - {formatUsd(product.maxPriceUsd)}
                      </div>
                    ) : null}
                  </div>

                  <div className="text-slate-600">
                    {category?.shortLabel || String(product.category)}
                  </div>

                  <div className="text-slate-500">
                    {product.provider || "—"}
                  </div>

                  <div className="font-bold text-slate-700">
                    {product.planCount}
                  </div>

                  <div className="font-bold text-slate-700">
                    {product.countryCount}
                  </div>

                  <div className="font-bold text-slate-700">
                    {product.priceCount}
                  </div>

                  <div>
                    <span
                      title={health.detail}
                      className={[
                        "inline-flex rounded-full px-2.5 py-1 text-xs font-black ring-1",
                        healthClassName(health.tone),
                      ].join(" ")}
                    >
                      {health.label}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-slate-500">
                    {formatDate(product.lastCheckedAt)}
                  </div>

                  <div>
                    <span
                      className={[
                        "inline-flex rounded-full px-2.5 py-1 text-xs font-black ring-1",
                        statusClassName(String(product.status)),
                      ].join(" ")}
                    >
                      {statusLabel(String(product.status))}
                    </span>
                  </div>

                  <div>
                    <Link
                      href={`/admin/products/${product.id}/edit`}
                      className="text-xs font-black text-blue-700 transition hover:text-blue-900"
                    >
                      编辑
                    </Link>
                  </div>
                </div>
              );
            })}

            {products.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <div className="text-sm font-bold text-slate-500">
                  当前分类暂无产品。
                </div>
                <div className="mt-2 text-sm text-slate-400">
                  可以手动新增产品，也可以先去发现线索里把候选产品导入产品库。
                </div>
                <div className="mt-5 flex justify-center gap-3">
                  <AdminLinkButton
                    href="/admin/products/new"
                  >
                    <Plus size={16} strokeWidth={2} />
                    新增产品
                  </AdminLinkButton>
                  <AdminLinkButton
                    href="/admin/discovery"
                    variant="secondary"
                  >
                    去发现线索
                  </AdminLinkButton>
                </div>
              </div>
            ) : null}
          </div>
          </div>
        </div>
      </AdminCard>
    </div>
  );
}

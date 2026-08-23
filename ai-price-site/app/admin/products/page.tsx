import AdminLink from "@/components/admin/AdminLink";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { ArrowRight, Plus } from "lucide-react";
import { Prisma, type ProductCategory } from "@prisma/client";
import { AdminLinkButton } from "../../../components/admin/AdminButton";
import { AdminCard, AdminPageHeader } from "../../../components/admin/AdminCard";
import SegmentedControl from "../../../components/ui/SegmentedControl";
import {
  adminOperationalStatusMeta,
  assessProductOperationalStatus,
  countAdminOperationalAssessments,
  getAdminOperationalTotal,
  isArchivedPublishStatus,
  type AdminOperationalStatus,
} from "../../../lib/admin-operational-status";
import { measureAdminWorkload } from "../../../lib/admin-performance";
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
  appStoreJobCount: number;
  latestRunStatus: string | null;
  pendingObservationCount: number;
  blockedObservationCount: number;
  publishedPriceCount: number;
  publishedStalePriceCount: number;
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
    appStoreJobCount: toNumber(row.app_store_job_count),
    latestRunStatus: row.latest_run_status,
    pendingObservationCount: toNumber(row.pending_observation_count),
    blockedObservationCount: toNumber(row.blocked_observation_count),
    publishedPriceCount: toNumber(row.published_price_count),
    publishedStalePriceCount: toNumber(row.published_stale_price_count),
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
        WHERE source.type = 'app_store'::price_source_type
      )::int AS app_store_job_count
      FROM collector_jobs job
      LEFT JOIN price_sources source ON source.id = job.source_id
      WHERE job.product_id = product.id
        AND job.job_type = 'ai_pricing'
        AND job.status <> 'archived'
    ) job_stats ON TRUE
    LEFT JOIN LATERAL (
      SELECT run.status
      FROM collector_jobs scoped_job
      JOIN collector_job_runs run ON run.job_id = scoped_job.id
      WHERE scoped_job.product_id = product.id
        AND scoped_job.job_type = 'ai_pricing'
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

  return rows.map(normalizeProductAsset);
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

function assessProduct(product: ProductAsset) {
  return assessProductOperationalStatus({
    publishStatus: product.status,
    planCount: product.planCount,
    activeCollectorJobCount: product.appStoreJobCount,
    latestRunStatus: product.latestRunStatus,
    pendingWorkCount: product.pendingObservationCount,
    blockedCount: product.blockedObservationCount,
    publishedPriceCount: product.publishedPriceCount,
    priceCount: product.priceCount,
    verifiedPriceCount: product.verifiedPriceCount,
    stalePriceCount: product.publishedStalePriceCount,
    missingSourceCount: product.missingSourceCount,
  });
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
    state?: string;
  }>;
}) {
  const params = searchParams ? await searchParams : {};
  const selectedCategory = getSelectedCategory(params?.category);
  const selectedState = ["not_started", "pending", "exception", "published"].includes(
    String(params?.state),
  )
    ? (String(params?.state) as AdminOperationalStatus)
    : "all";

  const [allProducts, countryCoverage] = await measureAdminWorkload(
    "products.page-data",
    () => Promise.all([
      getProductAssets(),
      getCountryCoverage(selectedCategory.value),
    ]),
  );

  const archivedCount = allProducts.filter((product) =>
    isArchivedPublishStatus(product.status),
  ).length;
  const activeProducts = allProducts.filter(
    (product) => !isArchivedPublishStatus(product.status),
  );
  const categoryProducts =
    selectedCategory.value === "all"
      ? activeProducts
      : activeProducts.filter(
          (product) => product.category === selectedCategory.dbValue
        );
  const operationalCounts = countAdminOperationalAssessments(
    categoryProducts.map(assessProduct),
  );
  const activeTotal = getAdminOperationalTotal(operationalCounts);
  const products = selectedState === "all"
    ? categoryProducts
    : categoryProducts.filter((product) => assessProduct(product)?.status === selectedState);
  const buildFilterHref = ({
    category = selectedCategory.value,
    state = selectedState,
  }: {
    category?: CategoryValue;
    state?: "all" | AdminOperationalStatus;
  }) => {
    const query = new URLSearchParams();
    if (category !== "all") query.set("category", category);
    if (state !== "all") query.set("state", state);
    const suffix = query.toString();
    return suffix ? `/admin/products?${suffix}` : "/admin/products";
  };

  const categoryStats = categoryConfigs
    .filter((category) => category.value !== "all")
    .map((category) => {
      const categoryProducts = activeProducts.filter(
        (product) => product.category === category.dbValue
      );

      const planCount = categoryProducts.reduce((sum, product) => sum + product.planCount, 0);

      const priceCount = categoryProducts.reduce((sum, product) => sum + product.priceCount, 0);

      const issueCount = categoryProducts.filter(
        (product) => assessProduct(product)?.status !== "published",
      ).length;

      return {
        ...category,
        productCount: categoryProducts.length,
        planCount,
        priceCount,
        issueCount,
      };
    });

  const totalPlans = categoryProducts.reduce((sum, product) => sum + product.planCount, 0);

  const totalPrices = categoryProducts.reduce((sum, product) => sum + product.priceCount, 0);

  const issueProducts = categoryProducts.filter(
    (product) => assessProduct(product)?.status !== "published",
  );

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
            {activeTotal} / {totalPlans}
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
            当前分类需要补资料、采集、审核或修复的服务；归档 {archivedCount} 个另计。
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
              <AdminLink
                key={category.value}
                href={buildFilterHref({ category: category.value })}
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
              </AdminLink>
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
              <AdminLink
                href="/admin/plans"
                className="inline-flex items-center gap-1.5 text-sm font-black text-blue-700 hover:text-blue-900"
              >
                套餐库
                <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.8} />
              </AdminLink>

              <AdminLink
                href="/admin/prices"
                className="inline-flex items-center gap-1.5 text-sm font-black text-blue-700 hover:text-blue-900"
              >
                价格库
                <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.8} />
              </AdminLink>
            </div>
          </div>

          <div className="max-w-full overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <SegmentedControl
              ariaLabel="产品分类"
              value={selectedCategory.value}
              tone="blue"
              className="min-w-[720px]"
              items={categoryConfigs.map((category) => ({
                label: category.shortLabel,
                value: category.value,
                href: buildFilterHref({ category: category.value }),
              }))}
            />
          </div>

          <div className="max-w-full overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <SegmentedControl
              ariaLabel="产品运营状态"
              value={selectedState}
              tone="blue"
              className="min-w-[520px]"
              items={[
                { label: `全部 ${activeTotal}`, value: "all", href: buildFilterHref({ state: "all" }) },
                ...(["exception", "pending", "not_started", "published"] as AdminOperationalStatus[]).map(
                  (status) => ({
                    label: `${adminOperationalStatusMeta[status].label} ${operationalCounts[status]}`,
                    value: status,
                    href: buildFilterHref({ state: status }),
                  }),
                ),
              ]}
            />
          </div>
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
            <div>当前原因</div>
            <div>最后检查</div>
            <div>状态</div>
            <div>操作</div>
          </div>

          <div className="divide-y divide-slate-100 bg-white">
            {products.map((product) => {
              const assessment = assessProduct(product);
              const category = categoryConfigs.find(
                (item) => item.dbValue === product.category
              );

              return (
                <div
                  key={product.id}
                  className="grid grid-cols-[minmax(150px,1.2fr)_120px_120px_80px_80px_90px_120px_100px_100px_80px] items-center gap-0 px-5 py-4 text-sm"
                >
                  <div>
                    <AdminLink
                      href={`/admin/products/${product.id}/edit`}
                      className="font-black text-slate-950 transition hover:text-blue-700"
                    >
                      {product.name}
                    </AdminLink>
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

                  <div className="text-xs leading-5 text-slate-500">
                    {assessment?.reason}
                  </div>

                  <div className="text-xs font-bold text-slate-500">
                    {formatDate(product.lastCheckedAt)}
                  </div>

                  <div>
                    <AdminStatusBadge
                      status={assessment?.status ?? "not_started"}
                      title={assessment?.reason}
                    />
                  </div>

                  <div>
                    <AdminLink
                      href={`/admin/products/${product.id}/edit`}
                      className="text-xs font-black text-blue-700 transition hover:text-blue-900"
                    >
                      编辑
                    </AdminLink>
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

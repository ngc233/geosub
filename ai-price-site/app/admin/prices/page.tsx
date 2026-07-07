import Link from "next/link";
import { AdminCard, AdminPageHeader } from "../../../components/admin/AdminCard";
import { prisma } from "../../../lib/prisma";

const categoryOrder = ["ai", "software", "streaming", "game", "gift_card", "payment", "vpn", "other"];

const categoryMeta: Record<string, { label: string; description: string }> = {
  ai: { label: "AI 订阅", description: "ChatGPT、Gemini、Claude 等 AI 服务。" },
  software: { label: "软件订阅", description: "Microsoft、Adobe、Canva 等软件。" },
  streaming: { label: "流媒体", description: "Netflix、Spotify、YouTube 等订阅。" },
  game: { label: "游戏 / Steam", description: "Steam、Xbox、PlayStation 等服务。" },
  gift_card: { label: "礼品卡", description: "Apple、Google Play、Steam 等礼品卡。" },
  payment: { label: "支付 / 虚拟服务", description: "支付、账号、虚拟服务相关价格。" },
  vpn: { label: "网络工具", description: "VPN、代理、网络工具。" },
  other: { label: "其他", description: "暂未归入主要业务线的服务。" },
};

function categoryLabel(category: string) {
  return categoryMeta[category]?.label || category;
}

function statusLabel(status: string) {
  if (status === "PUBLISHED") return "已发布";
  if (status === "DRAFT") return "草稿";
  if (status === "REVIEW") return "待审核";
  if (status === "ARCHIVED") return "已归档";
  return status;
}

function qualityLabel(quality: string) {
  if (quality === "VERIFIED") return "已验证";
  if (quality === "ESTIMATED") return "估算";
  if (quality === "STALE") return "过期";
  if (quality === "PENDING_REVIEW") return "待审核";
  return quality;
}

function qualityClassName(quality: string) {
  if (quality === "VERIFIED") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (quality === "ESTIMATED") return "bg-blue-50 text-blue-700 ring-blue-200";
  if (quality === "STALE") return "bg-red-50 text-red-700 ring-red-200";
  return "bg-amber-50 text-amber-700 ring-amber-200";
}

function statusClassName(status: string) {
  if (status === "PUBLISHED") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (status === "ARCHIVED") return "bg-slate-100 text-slate-600 ring-slate-200";
  if (status === "REVIEW") return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-slate-50 text-slate-600 ring-slate-200";
}

function productStatusClassName(status: string) {
  if (status === "PUBLISHED") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (status === "REVIEW") return "bg-blue-50 text-blue-700 ring-blue-200";
  if (status === "ARCHIVED") return "bg-slate-100 text-slate-600 ring-slate-200";
  return "bg-amber-50 text-amber-700 ring-amber-200";
}

function formatMoney(amount: number, currency: string) {
  return `${amount.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${currency}`;
}

function formatUsd(amount: number) {
  return `$${amount.toFixed(2)}`;
}

function formatDate(value: Date | string | null) {
  if (!value) return "未记录";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未记录";
  return date.toLocaleDateString("zh-CN");
}

function platformLabel(platform: string | null) {
  if (platform === "IOS") return "App Store";
  if (platform === "ANDROID") return "Google Play";
  if (platform === "WEB") return "Web";
  return platform || "未知";
}

type ProductPriceSummaryRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  provider: string | null;
  status: string;
  plan_count: unknown;
  plans_with_prices_count: unknown;
  price_count: unknown;
  country_count: unknown;
  min_price_usd: unknown;
  max_price_usd: unknown;
  verified_price_count: unknown;
  stale_price_count: unknown;
  no_source_price_count: unknown;
};

type ProductPriceSummary = {
  id: string;
  slug: string;
  name: string;
  category: string;
  provider: string | null;
  status: string;
  planCount: number;
  plansWithPricesCount: number;
  priceCount: number;
  countryCount: number;
  minPriceUsd: number | null;
  maxPriceUsd: number | null;
  verifiedPriceCount: number;
  stalePriceCount: number;
  noSourcePriceCount: number;
};

type PriceSiteStatsRow = {
  price_count: unknown;
  country_count: unknown;
  min_price_usd: unknown;
  max_price_usd: unknown;
  stale_price_count: unknown;
  no_source_price_count: unknown;
};

type PriceDetailRow = {
  id: string;
  product_name: string;
  product_slug: string;
  category: string;
  plan_name: string;
  plan_slug: string;
  country_code: string;
  country_name_zh: string | null;
  country_name_en: string | null;
  billing_platform: string;
  local_price: unknown;
  currency: string;
  price_usd: unknown;
  diff_vs_us_percent: unknown;
  status: string;
  data_quality: string;
  source_name: string | null;
  confidence_score: number | null;
  last_checked_at: Date | string | null;
  updated_at: Date | string | null;
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

function normalizeStatus(value: string | null) {
  return String(value || "").toUpperCase();
}

function normalizeProductSummary(row: ProductPriceSummaryRow): ProductPriceSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    provider: row.provider,
    status: normalizeStatus(row.status),
    planCount: toNumber(row.plan_count),
    plansWithPricesCount: toNumber(row.plans_with_prices_count),
    priceCount: toNumber(row.price_count),
    countryCount: toNumber(row.country_count),
    minPriceUsd: toNullableNumber(row.min_price_usd),
    maxPriceUsd: toNullableNumber(row.max_price_usd),
    verifiedPriceCount: toNumber(row.verified_price_count),
    stalePriceCount: toNumber(row.stale_price_count),
    noSourcePriceCount: toNumber(row.no_source_price_count),
  };
}

async function getProductPriceSummaries() {
  const rows = await prisma.$queryRaw<ProductPriceSummaryRow[]>`
    SELECT
      product.id::text,
      product.slug,
      product.name,
      product.category::text AS category,
      product.provider,
      product.status::text AS status,
      COALESCE(plan_stats.plan_count, 0)::int AS plan_count,
      COALESCE(price_stats.plans_with_prices_count, 0)::int AS plans_with_prices_count,
      COALESCE(price_stats.price_count, 0)::int AS price_count,
      COALESCE(price_stats.country_count, 0)::int AS country_count,
      price_stats.min_price_usd,
      price_stats.max_price_usd,
      COALESCE(price_stats.verified_price_count, 0)::int AS verified_price_count,
      COALESCE(price_stats.stale_price_count, 0)::int AS stale_price_count,
      COALESCE(price_stats.no_source_price_count, 0)::int AS no_source_price_count
    FROM products product
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS plan_count
      FROM plans plan
      WHERE plan.product_id = product.id
    ) plan_stats ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*)::int AS price_count,
        COUNT(DISTINCT price.plan_id)::int AS plans_with_prices_count,
        COUNT(DISTINCT price.country_id)::int AS country_count,
        MIN(price.price_usd) AS min_price_usd,
        MAX(price.price_usd) AS max_price_usd,
        COUNT(*) FILTER (WHERE price.data_quality = 'verified'::data_quality)::int AS verified_price_count,
        COUNT(*) FILTER (WHERE price.data_quality = 'stale'::data_quality)::int AS stale_price_count,
        COUNT(*) FILTER (WHERE price.primary_source_id IS NULL)::int AS no_source_price_count
      FROM region_prices price
      WHERE price.product_id = product.id
    ) price_stats ON TRUE
    ORDER BY product.category ASC, product.sort_order ASC, product.name ASC
  `;

  return rows.map(normalizeProductSummary);
}

async function getSitePriceStats() {
  const rows = await prisma.$queryRaw<PriceSiteStatsRow[]>`
    SELECT
      COUNT(*)::int AS price_count,
      COUNT(DISTINCT country_id)::int AS country_count,
      MIN(price_usd) AS min_price_usd,
      MAX(price_usd) AS max_price_usd,
      COUNT(*) FILTER (WHERE data_quality = 'stale'::data_quality)::int AS stale_price_count,
      COUNT(*) FILTER (WHERE primary_source_id IS NULL)::int AS no_source_price_count
    FROM region_prices
  `;
  const row = rows[0];

  return {
    priceCount: toNumber(row?.price_count),
    countryCount: toNumber(row?.country_count),
    minPriceUsd: toNullableNumber(row?.min_price_usd),
    maxPriceUsd: toNullableNumber(row?.max_price_usd),
    stalePriceCount: toNumber(row?.stale_price_count),
    noSourcePriceCount: toNumber(row?.no_source_price_count),
  };
}

async function getPriceDetailRows({ page, pageSize }: { page: number; pageSize: number }) {
  const offset = (page - 1) * pageSize;

  return prisma.$queryRaw<PriceDetailRow[]>`
    SELECT
      price.id::text,
      product.name AS product_name,
      product.slug AS product_slug,
      product.category::text AS category,
      plan.name AS plan_name,
      plan.slug AS plan_slug,
      country.code AS country_code,
      country.name_zh AS country_name_zh,
      country.name_en AS country_name_en,
      price.billing_platform::text AS billing_platform,
      price.local_price,
      price.currency,
      price.price_usd,
      price.diff_vs_us_percent,
      price.status::text AS status,
      price.data_quality::text AS data_quality,
      source.name AS source_name,
      price.confidence_score,
      price.last_checked_at,
      price.updated_at
    FROM region_prices price
    JOIN products product ON product.id = price.product_id
    JOIN plans plan ON plan.id = price.plan_id
    JOIN countries country ON country.id = price.country_id
    LEFT JOIN price_sources source ON source.id = price.primary_source_id
    ORDER BY product.category ASC, product.sort_order ASC, product.name ASC, plan.sort_order ASC, price.price_usd ASC
    LIMIT ${pageSize}
    OFFSET ${offset}
  `;
}

async function getTaxCoverage() {
  const rows = await prisma.$queryRaw<Array<{
    with_tax_profile: bigint;
    verified_tax_profile: bigint;
    needs_review_tax_profile: bigint;
    published_country_count: bigint;
  }>>`
    SELECT
      COUNT(*) FILTER (WHERE tax_profile.id IS NOT NULL) AS with_tax_profile,
      COUNT(*) FILTER (WHERE tax_profile.review_status = 'verified') AS verified_tax_profile,
      COUNT(*) FILTER (WHERE tax_profile.review_status = 'needs_review') AS needs_review_tax_profile,
      COUNT(*) AS published_country_count
    FROM (
      SELECT DISTINCT country_id
      FROM region_prices
      WHERE status = 'published'::publish_status
    ) published_countries
    LEFT JOIN country_tax_profiles tax_profile
      ON tax_profile.country_id = published_countries.country_id
      AND tax_profile.status = 'active'
  `;

  const row = rows[0];

  return {
    withTaxProfile: Number(row?.with_tax_profile ?? 0),
    verifiedTaxProfile: Number(row?.verified_tax_profile ?? 0),
    needsReviewTaxProfile: Number(row?.needs_review_tax_profile ?? 0),
    publishedCountryCount: Number(row?.published_country_count ?? 0),
  };
}

function sortCategories(categories: string[]) {
  return [...categories].sort((a, b) => {
    const indexA = categoryOrder.indexOf(a);
    const indexB = categoryOrder.indexOf(b);
    if (indexA !== -1 || indexB !== -1) {
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    }
    return a.localeCompare(b);
  });
}

function getPriceRange(products: ProductPriceSummary[]) {
  const minValues = products
    .map((product) => product.minPriceUsd)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const maxValues = products
    .map((product) => product.maxPriceUsd)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  return {
    min: minValues.length ? Math.min(...minValues) : null,
    max: maxValues.length ? Math.max(...maxValues) : null,
  };
}

export default async function AdminPricesPage({
  searchParams,
}: {
  searchParams?: Promise<{
    pricePage?: string;
  }>;
}) {
  const params = searchParams ? await searchParams : {};
  const detailPageSize = 50;
  const detailPage = Math.max(1, Number(params.pricePage ?? 1) || 1);
  const [products, siteStats, detailRows, taxCoverage] = await Promise.all([
    getProductPriceSummaries(),
    getSitePriceStats(),
    getPriceDetailRows({ page: detailPage, pageSize: detailPageSize }),
    getTaxCoverage(),
  ]);
  const publishedProducts = products.filter((product) => product.status === "PUBLISHED");
  const productsWithPrices = products.filter((product) => product.priceCount > 0);
  const plansWithPrices = products.reduce(
    (sum, product) => sum + product.plansWithPricesCount,
    0,
  );
  const range = {
    min: siteStats.minPriceUsd,
    max: siteStats.maxPriceUsd,
  };
  const categories = sortCategories(Array.from(new Set(products.map((product) => product.category))));
  const missingTaxProfileCount = Math.max(
    taxCoverage.publishedCountryCount - taxCoverage.withTaxProfile,
    0,
  );
  const detailTotalPages = Math.max(1, Math.ceil(siteStats.priceCount / detailPageSize));
  const safeDetailPage = Math.min(detailPage, detailTotalPages);
  const buildDetailPageHref = (nextPage: number) => {
    const query = new URLSearchParams();
    if (nextPage > 1) query.set("pricePage", String(nextPage));
    const value = query.toString();
    return value ? `/admin/prices?${value}` : "/admin/prices";
  };

  const categorySummaries = categories.map((category) => {
    const categoryProducts = products.filter((product) => product.category === category);
    const categoryRange = getPriceRange(categoryProducts);

    return {
      category,
      products: categoryProducts,
      priceCount: categoryProducts.reduce((sum, product) => sum + product.priceCount, 0),
      planCount: categoryProducts.reduce((sum, product) => sum + product.planCount, 0),
      range: categoryRange,
      productsWithPrices: categoryProducts.filter((product) => product.priceCount > 0).length,
      staleCount: categoryProducts.reduce((sum, product) => sum + product.stalePriceCount, 0),
      noSourceCount: categoryProducts.reduce((sum, product) => sum + product.noSourcePriceCount, 0),
    };
  });

  const productSummaries = products.map((product) => {
    return {
      product,
      range: {
        min: product.minPriceUsd,
        max: product.maxPriceUsd,
      },
      countryCount: product.countryCount,
      verifiedCount: product.verifiedPriceCount,
      stalePrices: product.stalePriceCount,
      noSourcePrices: product.noSourcePriceCount,
    };
  });

  return (
    <div>
      <AdminPageHeader
        eyebrow="Prices"
        title="正式价格库"
        description="按分类、产品、套餐和地区管理正式价格。这里不是单个产品详情，而是全站价格资产的总览。"
      />

      <div className="mb-6 grid gap-4 md:grid-cols-5">
        <AdminCard>
          <div className="text-sm font-bold text-slate-500">产品覆盖</div>
          <div className="mt-2 text-2xl font-black text-slate-950">
            {productsWithPrices.length} / {products.length}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            已发布产品 {publishedProducts.length} 个。
          </div>
        </AdminCard>

        <AdminCard>
          <div className="text-sm font-bold text-slate-500">套餐 / 地区</div>
          <div className="mt-2 text-2xl font-black text-slate-950">
            {plansWithPrices} / {siteStats.countryCount}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            有价格套餐 / 覆盖地区。
          </div>
        </AdminCard>

        <AdminCard>
          <div className="text-sm font-bold text-slate-500">全站价格范围</div>
          <div className="mt-2 text-2xl font-black text-slate-950">
            {range.min === null ? "无" : formatUsd(range.min)}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            最高：{range.max === null ? "无" : formatUsd(range.max)}
          </div>
        </AdminCard>

        <AdminCard>
          <div className="text-sm font-bold text-slate-500">需处理</div>
          <div className="mt-2 text-2xl font-black text-slate-950">
            {siteStats.stalePriceCount + siteStats.noSourcePriceCount}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            过期 {siteStats.stalePriceCount}，缺来源 {siteStats.noSourcePriceCount}。
          </div>
        </AdminCard>

        <AdminCard>
          <div className="text-sm font-bold text-slate-500">税务资料覆盖</div>
          <div className="mt-2 text-2xl font-black text-slate-950">
            {taxCoverage.withTaxProfile} / {taxCoverage.publishedCountryCount}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            高可信 {taxCoverage.verifiedTaxProfile}，待复核 {taxCoverage.needsReviewTaxProfile}，缺失 {missingTaxProfileCount}。
          </div>
        </AdminCard>
      </div>

      <AdminCard className="mb-6 border-blue-100 bg-blue-50/60">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-black text-slate-950">税费展示规则</h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              价格采集只记录 App Store 标价；税务资料按国家代码独立匹配，不额外加到排序价格里。高可信国家直接展示税种和税率，待复核或缺失国家保守显示为待核验，并提示以官方结算页为准。
            </p>
          </div>
          <div className="shrink-0 rounded-xl bg-white px-4 py-3 text-sm font-black text-blue-700 ring-1 ring-blue-100">
            税务库独立同步
          </div>
        </div>
      </AdminCard>

      <AdminCard className="mb-6">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-950">分类价格资产</h2>
            <p className="mt-1 text-sm text-slate-500">
              先从分类看价格库健康度：哪些业务线已有价格，哪些还只是产品占位。
            </p>
          </div>
          <Link href="/admin/products" className="text-sm font-black text-blue-700 hover:text-blue-900">
            去产品库 →
          </Link>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {categorySummaries.map((summary) => (
            <div key={summary.category} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-black text-slate-950">{categoryLabel(summary.category)}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-500">
                    {categoryMeta[summary.category]?.description || "自定义分类。"}
                  </div>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">
                  {summary.products.length} 产品
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-slate-50 p-2">
                  <div className="text-lg font-black text-slate-950">{summary.productsWithPrices}</div>
                  <div className="mt-1 text-[11px] font-bold text-slate-500">有价格</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <div className="text-lg font-black text-slate-950">{summary.planCount}</div>
                  <div className="mt-1 text-[11px] font-bold text-slate-500">套餐</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <div className="text-lg font-black text-slate-950">{summary.priceCount}</div>
                  <div className="mt-1 text-[11px] font-bold text-slate-500">价格</div>
                </div>
              </div>

              <div className="mt-4 text-xs text-slate-500">
                价格范围：
                <span className="font-black text-slate-900">
                  {summary.range.min === null
                    ? "暂无"
                    : `${formatUsd(summary.range.min)} - ${formatUsd(summary.range.max ?? summary.range.min)}`}
                </span>
              </div>

              {(summary.staleCount > 0 || summary.noSourceCount > 0) ? (
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold">
                  <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-700 ring-1 ring-red-200">
                    过期 {summary.staleCount}
                  </span>
                  <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700 ring-1 ring-amber-200">
                    缺来源 {summary.noSourceCount}
                  </span>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </AdminCard>

      <AdminCard className="mb-6">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-950">产品价格覆盖</h2>
            <p className="mt-1 text-sm text-slate-500">
              每个产品独立展示分类、状态、套餐数、地区覆盖和价格范围，适合判断下一步补采对象。
            </p>
          </div>
          <Link href="/admin/review" className="text-sm font-black text-blue-700 hover:text-blue-900">
            去审核中心 →
          </Link>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          {productSummaries.map((summary) => (
            <div key={summary.product.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black text-slate-950">{summary.product.name}</h3>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">
                      {categoryLabel(summary.product.category)}
                    </span>
                    <span
                      className={[
                        "rounded-full px-2.5 py-1 text-xs font-black ring-1",
                        productStatusClassName(String(summary.product.status)),
                      ].join(" ")}
                    >
                      {statusLabel(String(summary.product.status))}
                    </span>
                  </div>
                  <div className="mt-1 font-mono text-xs text-slate-400">
                    {summary.product.slug} · {summary.product.provider || "未填服务商"}
                  </div>
                </div>
                <div className="text-right text-xs text-slate-500">
                  <div className="font-black text-slate-950">
                    {summary.product.priceCount} 条价格
                  </div>
                  <div>{summary.countryCount} 个地区</div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                <div className="rounded-lg bg-slate-50 p-2">
                  <div className="text-lg font-black text-slate-950">{summary.product.planCount}</div>
                  <div className="text-[11px] font-bold text-slate-500">套餐</div>
                </div>
                <div className="rounded-lg bg-emerald-50 p-2">
                  <div className="text-lg font-black text-emerald-700">{summary.verifiedCount}</div>
                  <div className="text-[11px] font-bold text-slate-500">已验证</div>
                </div>
                <div className="rounded-lg bg-red-50 p-2">
                  <div className="text-lg font-black text-red-700">{summary.stalePrices}</div>
                  <div className="text-[11px] font-bold text-slate-500">过期</div>
                </div>
                <div className="rounded-lg bg-amber-50 p-2">
                  <div className="text-lg font-black text-amber-700">{summary.noSourcePrices}</div>
                  <div className="text-[11px] font-bold text-slate-500">缺来源</div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 p-3 text-sm">
                <div>
                  <div className="text-xs font-bold text-slate-500">价格范围</div>
                  <div className="mt-1 font-black text-slate-950">
                    {summary.range.min === null
                      ? "暂无正式价格"
                      : `${formatUsd(summary.range.min)} - ${formatUsd(summary.range.max ?? summary.range.min)}`}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/admin/products/${summary.product.id}/edit`}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-700 hover:bg-slate-50"
                  >
                    管理产品
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </AdminCard>

      <AdminCard>
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-950">地区价格明细</h2>
            <p className="mt-1 text-sm text-slate-500">
              明细用于排查单个地区价格，不作为页面第一判断入口。
            </p>
          </div>
          <div className="text-sm font-bold text-slate-500">
            共 {siteStats.priceCount} 条正式价格，当前第 {safeDetailPage} / {detailTotalPages} 页
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">分类 / 产品</th>
                <th className="px-4 py-3 font-medium">套餐</th>
                <th className="px-4 py-3 font-medium">地区</th>
                <th className="px-4 py-3 font-medium">价格</th>
                <th className="px-4 py-3 font-medium">状态</th>
                <th className="px-4 py-3 font-medium">来源</th>
                <th className="px-4 py-3 font-medium">更新时间</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {detailRows.map((price) => (
                <tr key={price.id} className="align-top hover:bg-slate-50">
                  <td className="px-4 py-4">
                    <div className="text-xs font-black text-slate-400">
                      {categoryLabel(price.category)}
                    </div>
                    <div className="mt-1 font-black text-slate-950">{price.product_name}</div>
                    <div className="mt-1 font-mono text-xs text-slate-400">{price.product_slug}</div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="font-bold text-slate-800">{price.plan_name}</div>
                    <div className="mt-1 font-mono text-xs text-slate-400">{price.plan_slug}</div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="font-black text-slate-900">
                      {price.country_name_zh || price.country_name_en}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {price.country_code} · {platformLabel(normalizeStatus(price.billing_platform))}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="text-base font-black text-slate-950">
                      {formatUsd(toNumber(price.price_usd))}
                    </div>
                    <div className="mt-1 text-xs font-medium text-slate-500">
                      {formatMoney(toNumber(price.local_price), price.currency)}
                    </div>
                    {price.diff_vs_us_percent !== null ? (
                      <div className="mt-1 text-xs text-slate-400">
                        较美国 {toNumber(price.diff_vs_us_percent).toFixed(1)}%
                      </div>
                    ) : null}
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-2">
                      <span
                        className={[
                          "inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-black ring-1",
                          statusClassName(normalizeStatus(price.status)),
                        ].join(" ")}
                      >
                        {statusLabel(normalizeStatus(price.status))}
                      </span>
                      <span
                        className={[
                          "inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-black ring-1",
                          qualityClassName(normalizeStatus(price.data_quality)),
                        ].join(" ")}
                      >
                        {qualityLabel(normalizeStatus(price.data_quality))}
                      </span>
                    </div>
                  </td>

                  <td className="max-w-[220px] px-4 py-4">
                    <div className="truncate font-bold text-slate-700">
                      {price.source_name || "无来源"}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      置信度 {price.confidence_score}
                    </div>
                  </td>

                  <td className="px-4 py-4 text-xs text-slate-500">
                    {formatDate(price.last_checked_at || price.updated_at)}
                  </td>
                </tr>
              ))}

              {siteStats.priceCount === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm font-bold text-slate-400">
                    暂无正式价格数据。
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {detailTotalPages > 1 ? (
          <div className="mt-4 flex flex-col gap-3 text-sm md:flex-row md:items-center md:justify-between">
            <div className="font-bold text-slate-500">
              每页 {detailPageSize} 条，当前显示第 {safeDetailPage} 页。
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={buildDetailPageHref(Math.max(1, safeDetailPage - 1))}
                aria-disabled={safeDetailPage <= 1}
                className={`rounded-lg border px-3 py-1.5 font-bold ${
                  safeDetailPage <= 1
                    ? "pointer-events-none border-slate-100 text-slate-300"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                上一页
              </Link>
              <span className="text-slate-500">
                {safeDetailPage} / {detailTotalPages}
              </span>
              <Link
                href={buildDetailPageHref(Math.min(detailTotalPages, safeDetailPage + 1))}
                aria-disabled={safeDetailPage >= detailTotalPages}
                className={`rounded-lg border px-3 py-1.5 font-bold ${
                  safeDetailPage >= detailTotalPages
                    ? "pointer-events-none border-slate-100 text-slate-300"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                下一页
              </Link>
            </div>
          </div>
        ) : null}
      </AdminCard>
    </div>
  );
}

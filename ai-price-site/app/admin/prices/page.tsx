import AdminProductLogo from "@/components/admin/AdminProductLogo";
import AdminPipelineSteps from "@/components/admin/AdminPipelineSteps";
import { withAdminReturnTo, adminListLocation } from "@/lib/admin-workflow-context";
import AdminProductContext from "@/components/admin/AdminProductContext";
import AdminPagination from "@/components/admin/AdminPagination";
import { createAdminListView } from "@/lib/admin-list-params";
import AdminLink from "@/components/admin/AdminLink";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { ArrowRight } from "lucide-react";
import { AdminCard, AdminPageHeader, AdminSectionHeader } from "../../../components/admin/AdminCard";
import SegmentedControl from "../../../components/admin/AdminSegmentedControl";
import {
  adminOperationalStatusMeta,
  assessPriceOperationalStatus,
  assessProductOperationalStatus,
  countAdminOperationalAssessments,
  getAdminOperationalTotal,
  type AdminOperationalStatus,
} from "../../../lib/admin-operational-status";
import { measureAdminWorkload } from "../../../lib/admin-performance";
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

function qualityLabel(quality: string) {
  if (quality === "VERIFIED") return "已验证";
  if (quality === "ESTIMATED") return "估算";
  if (quality === "STALE") return "过期";
  if (quality === "PENDING_REVIEW") return "待审核";
  return quality;
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
  pending_price_count: unknown;
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
  pendingPriceCount: number;
  stalePriceCount: number;
  noSourcePriceCount: number;
};

type PriceSiteStatsRow = {
  price_count: unknown;
  archived_price_count: unknown;
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
    pendingPriceCount: toNumber(row.pending_price_count),
    stalePriceCount: toNumber(row.stale_price_count),
    noSourcePriceCount: toNumber(row.no_source_price_count),
  };
}

async function getProductPriceSummaries(productSlug = "") {
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
      COALESCE(price_stats.pending_price_count, 0)::int AS pending_price_count,
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
        COUNT(*) FILTER (
          WHERE price.data_quality IN ('estimated'::data_quality, 'pending_review'::data_quality)
            OR price.status <> 'published'::publish_status
        )::int AS pending_price_count,
        COUNT(*) FILTER (WHERE price.data_quality = 'stale'::data_quality)::int AS stale_price_count,
        COUNT(*) FILTER (WHERE price.primary_source_id IS NULL)::int AS no_source_price_count
      FROM region_prices price
      WHERE price.product_id = product.id
        AND price.status <> 'archived'::publish_status
    ) price_stats ON TRUE
    WHERE product.status <> 'archived'::publish_status
      AND (${productSlug} = '' OR product.slug = ${productSlug})
    ORDER BY product.category ASC, product.sort_order ASC, product.name ASC
  `;

  return rows.map(normalizeProductSummary);
}

async function getSitePriceStats(productSlug = "") {
  const rows = await prisma.$queryRaw<PriceSiteStatsRow[]>`
    SELECT
      COUNT(*)::int AS price_count,
      (SELECT COUNT(*)::int FROM region_prices archived_price
        WHERE archived_price.status = 'archived'::publish_status
          AND (${productSlug} = '' OR EXISTS (
            SELECT 1 FROM products scope_product
            WHERE scope_product.id = archived_price.product_id AND scope_product.slug = ${productSlug}
          ))) AS archived_price_count,
      COUNT(DISTINCT country_id)::int AS country_count,
      MIN(price_usd) AS min_price_usd,
      MAX(price_usd) AS max_price_usd,
      COUNT(*) FILTER (WHERE data_quality = 'stale'::data_quality)::int AS stale_price_count,
      COUNT(*) FILTER (WHERE primary_source_id IS NULL)::int AS no_source_price_count
    FROM region_prices
    WHERE status <> 'archived'::publish_status
      AND (${productSlug} = '' OR EXISTS (SELECT 1 FROM products scope_product WHERE scope_product.id = region_prices.product_id AND scope_product.slug = ${productSlug}))
  `;
  const row = rows[0];

  return {
    priceCount: toNumber(row?.price_count),
    archivedPriceCount: toNumber(row?.archived_price_count),
    countryCount: toNumber(row?.country_count),
    minPriceUsd: toNullableNumber(row?.min_price_usd),
    maxPriceUsd: toNullableNumber(row?.max_price_usd),
    stalePriceCount: toNumber(row?.stale_price_count),
    noSourcePriceCount: toNumber(row?.no_source_price_count),
  };
}

async function getPriceDetailRows({ page, pageSize, productSlug = "" }: { page: number; pageSize: number; productSlug?: string }) {
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
    WHERE product.status <> 'archived'::publish_status
      AND (${productSlug} = '' OR product.slug = ${productSlug})
      AND plan.status <> 'archived'::publish_status
      AND price.status <> 'archived'::publish_status
    ORDER BY product.category ASC, product.sort_order ASC, product.name ASC, plan.sort_order ASC, price.price_usd ASC
    LIMIT ${pageSize}
    OFFSET ${offset}
  `;
}

async function getTaxCoverage(productSlug = "") {
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
        AND (${productSlug} = '' OR EXISTS (SELECT 1 FROM products scope_product WHERE scope_product.id = region_prices.product_id AND scope_product.slug = ${productSlug}))
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
    page?: string;
    product?: string;
    returnTo?: string;
    pricePage?: string;
    state?: string;
  }>;
}) {
  const params = searchParams ? await searchParams : {};
  const productSlug = String(params.product || "").trim().toLowerCase().slice(0,120);
  const contextProduct = productSlug ? await prisma.product.findUnique({where:{slug:productSlug},select:{id:true,slug:true,name:true}}) : null;
  const selectedState = ["not_started", "pending", "exception", "published"].includes(
    String(params.state),
  )
    ? (String(params.state) as AdminOperationalStatus)
    : "all";
  const detailPageSize = 50;
  const requestedDetailPage = /^\d+$/.test(params.pricePage || "") ? Number(params.pricePage) : 1;
  const detailPage = Number.isSafeInteger(requestedDetailPage) && requestedDetailPage > 0 ? requestedDetailPage : 1;
  const [products, siteStats, initialDetailRows, taxCoverage] = await measureAdminWorkload(
    "prices.page-data",
    () => Promise.all([
      getProductPriceSummaries(productSlug),
      getSitePriceStats(productSlug),
      getPriceDetailRows({ page: detailPage, pageSize: detailPageSize, productSlug }),
      getTaxCoverage(productSlug),
    ]),
  );
  const assessProduct = (product: ProductPriceSummary) =>
    assessProductOperationalStatus({
      publishStatus: product.status,
      planCount: product.planCount,
      priceCount: product.priceCount,
      verifiedPriceCount: product.verifiedPriceCount,
      pendingWorkCount: product.pendingPriceCount,
      stalePriceCount: product.stalePriceCount,
      missingSourceCount: product.noSourcePriceCount,
    });
  const operationalCounts = countAdminOperationalAssessments(products.map(assessProduct));
  const activeTotal = getAdminOperationalTotal(operationalCounts);
  const publishedProducts = products.filter(
    (product) => assessProduct(product)?.status === "published",
  );
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
  const detailRows = safeDetailPage === detailPage ? initialDetailRows : await getPriceDetailRows({ page: safeDetailPage, pageSize: detailPageSize, productSlug });
  const buildDetailPageHref = (nextPage: number) => {
    const query = new URLSearchParams();
    if (productSlug) query.set("product", productSlug);
    if (selectedState !== "all") query.set("state", selectedState);
    if (params.page) query.set("page", params.page);
    if (nextPage > 1) query.set("pricePage", String(nextPage));
    const value = query.toString();
    return `${value ? `/admin/prices?${value}` : "/admin/prices"}#price-details`;
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
  const visibleProductSummaries = productSummaries.filter(
    ({ product }) => selectedState === "all" || assessProduct(product)?.status === selectedState,
  );
  const stateHref = (state: "all" | AdminOperationalStatus) => {
    const query = new URLSearchParams();
    if (productSlug) query.set("product", productSlug);
    if (state !== "all") query.set("state", state);
    const suffix = query.toString();
    return suffix ? `/admin/prices?${suffix}` : "/admin/prices";
  };

  const productList = createAdminListView(visibleProductSummaries, { basePath: "/admin/prices", params, pageSize: 10, id: "price-products" });
  return (
    <div>
      {contextProduct ? <AdminProductContext {...contextProduct} returnTo={params.returnTo} /> : null}
      {productSlug ? <p className="mb-4 text-sm text-admin-text-muted">
        {contextProduct ? `当前产品：${contextProduct.name}` : "未找到指定产品，未显示其他产品价格。"}{" "}
        <AdminLink href="/admin/prices" className="text-admin-accent underline">查看全部产品</AdminLink>
      </p> : null}

      <AdminPageHeader
        eyebrow="Prices"
        title="正式价格库"
        description={productSlug ? "查看当前产品的套餐、地区、来源与正式价格；筛选和分页保持在该产品内。" : "按分类、产品、套餐和地区管理正式价格。这里是全站价格资产的总览。"}
      />
      <AdminPipelineSteps currentStep="published" productSlug={productSlug || undefined} returnTo={params.returnTo}/>

      <div className="mb-6 grid gap-4 md:grid-cols-5">
        <AdminCard>
          <div className="text-sm font-semibold text-admin-text-muted dark:text-admin-text-muted">产品覆盖</div>
          <div className="mt-2 text-2xl font-semibold text-admin-text dark:text-admin-text">
            {productsWithPrices.length} / {activeTotal}
          </div>
          <div className="mt-2 text-sm text-admin-text-muted dark:text-admin-text-muted">
            已发布产品 {publishedProducts.length} 个。
          </div>
        </AdminCard>

        <AdminCard>
          <div className="text-sm font-semibold text-admin-text-muted dark:text-admin-text-muted">套餐 / 地区</div>
          <div className="mt-2 text-2xl font-semibold text-admin-text dark:text-admin-text">
            {plansWithPrices} / {siteStats.countryCount}
          </div>
          <div className="mt-2 text-sm text-admin-text-muted dark:text-admin-text-muted">
            有价格套餐 / 覆盖地区。
          </div>
        </AdminCard>

        <AdminCard>
          <div className="text-sm font-semibold text-admin-text-muted dark:text-admin-text-muted">{productSlug ? "当前产品价格范围" : "全站价格范围"}</div>
          <div className="mt-2 text-2xl font-semibold text-admin-text dark:text-admin-text">
            {range.min === null ? "无" : formatUsd(range.min)}
          </div>
          <div className="mt-2 text-sm text-admin-text-muted dark:text-admin-text-muted">
            最高：{range.max === null ? "无" : formatUsd(range.max)}
          </div>
        </AdminCard>

        <AdminCard>
          <div className="text-sm font-semibold text-admin-text-muted dark:text-admin-text-muted">需处理</div>
          <div className="mt-2 text-2xl font-semibold text-admin-text dark:text-admin-text">
            {siteStats.stalePriceCount + siteStats.noSourcePriceCount}
          </div>
          <div className="mt-2 text-sm text-admin-text-muted dark:text-admin-text-muted">
            过期 {siteStats.stalePriceCount}，缺来源 {siteStats.noSourcePriceCount}；归档 {siteStats.archivedPriceCount} 条另计。
          </div>
        </AdminCard>

        <AdminCard>
          <div className="text-sm font-semibold text-admin-text-muted dark:text-admin-text-muted">税务资料覆盖</div>
          <div className="mt-2 text-2xl font-semibold text-admin-text dark:text-admin-text">
            {taxCoverage.withTaxProfile} / {taxCoverage.publishedCountryCount}
          </div>
          <div className="mt-2 text-sm text-admin-text-muted dark:text-admin-text-muted">
            高可信 {taxCoverage.verifiedTaxProfile}，待复核 {taxCoverage.needsReviewTaxProfile}，缺失 {missingTaxProfileCount}。
          </div>
        </AdminCard>
      </div>

      <AdminCard className="mb-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-admin-text dark:text-admin-text">税费展示规则</h2>
            <p className="mt-1 text-sm leading-6 text-admin-text-secondary dark:text-admin-text-secondary">
              价格采集记录对应来源的标价；税务资料按国家代码独立匹配，不额外加到排序价格里。高可信国家直接展示税种和税率，待复核或缺失国家保守显示为待核验，并提示以官方结算页为准。
            </p>
          </div>
          <div className="shrink-0 rounded-admin-card bg-admin-surface px-4 py-3 text-sm font-semibold text-admin-accent ring-1 ring-admin-border">
            税务库独立同步
          </div>
        </div>
      </AdminCard>

      <AdminCard className="mb-6">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-admin-text dark:text-admin-text">分类价格资产</h2>
            <p className="mt-1 text-sm text-admin-text-muted dark:text-admin-text-muted">
              先从分类看价格库健康度：哪些业务线已有价格，哪些还只是产品占位。
            </p>
          </div>
          <AdminLink href="/admin/products" className="inline-flex items-center gap-1.5 text-sm font-medium text-admin-accent hover:underline">
            去产品库
            <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.8} />
          </AdminLink>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {categorySummaries.map((summary) => (
            <div key={summary.category} className="rounded-admin-card border border-admin-border bg-admin-surface p-4 dark:border-admin-border-strong dark:bg-admin-surface">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-admin-text dark:text-admin-text">{categoryLabel(summary.category)}</div>
                  <div className="mt-1 text-xs leading-5 text-admin-text-muted dark:text-admin-text-muted">
                    {categoryMeta[summary.category]?.description || "自定义分类。"}
                  </div>
                </div>
                <span className="shrink-0 whitespace-nowrap rounded-full bg-admin-chip px-2.5 py-1 text-xs font-semibold
                  text-admin-text-secondary dark:bg-admin-chip dark:text-admin-text-secondary"
                >
                  {summary.products.length} 产品
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-admin-surface-subtle p-2 dark:bg-admin-chip">
                  <div className="text-lg font-semibold text-admin-text dark:text-admin-text">{summary.productsWithPrices}</div>
                  <div className="mt-1 text-[11px] font-semibold text-admin-text-muted dark:text-admin-text-muted">有价格</div>
                </div>
                <div className="rounded-lg bg-admin-surface-subtle p-2 dark:bg-admin-chip">
                  <div className="text-lg font-semibold text-admin-text dark:text-admin-text">{summary.planCount}</div>
                  <div className="mt-1 text-[11px] font-semibold text-admin-text-muted dark:text-admin-text-muted">套餐</div>
                </div>
                <div className="rounded-lg bg-admin-surface-subtle p-2 dark:bg-admin-chip">
                  <div className="text-lg font-semibold text-admin-text dark:text-admin-text">{summary.priceCount}</div>
                  <div className="mt-1 text-[11px] font-semibold text-admin-text-muted dark:text-admin-text-muted">价格</div>
                </div>
              </div>

              <div className="mt-4 text-xs text-admin-text-muted dark:text-admin-text-muted">
                价格范围：
                <span className="font-semibold text-admin-text dark:text-admin-text">
                  {summary.range.min === null
                    ? "暂无"
                    : `${formatUsd(summary.range.min)} - ${formatUsd(summary.range.max ?? summary.range.min)}`}
                </span>
              </div>

              {(summary.staleCount > 0 || summary.noSourceCount > 0) ? (
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
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
        <AdminSectionHeader title="产品价格覆盖" description="每个产品独立展示分类、状态、套餐数、地区覆盖和价格范围，适合判断下一步补采对象。" action={
          <AdminLink href={productSlug ? `/admin/review?product=${encodeURIComponent(productSlug)}` : "/admin/review"}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-admin-accent hover:underline
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-accent/40">
            去审核中心
            <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.8} />
          </AdminLink>
        } />

        <div className="mb-4 min-w-0">
          <SegmentedControl
            ariaLabel="正式价格产品状态"
            value={selectedState}
            tone="blue"
            items={[
              { label: `全部 ${activeTotal}`, value: "all", href: stateHref("all") },
              ...(["exception", "pending", "not_started", "published"] as AdminOperationalStatus[]).map(
                (status) => ({
                  label: `${adminOperationalStatusMeta[status].label} ${operationalCounts[status]}`,
                  value: status,
                  href: stateHref(status),
                }),
              ),
            ]}
          />
        </div>

        <AdminPagination {...productList.pagination} id="price-products" ariaLabel="价格产品分页" className="mb-4" />
        <div className="grid gap-3 lg:grid-cols-2">
          {productList.items.map((summary) => {
            const assessment = assessProduct(summary.product);
            return (
            <div key={summary.product.id} id={`price-product-${summary.product.id}`}
              className="scroll-mt-24 rounded-admin-card border border-admin-border bg-admin-surface p-4
                dark:border-admin-border-strong dark:bg-admin-surface">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <AdminProductLogo slug={summary.product.slug} name={summary.product.name} size="md"/>
                    <h3 className="min-w-0 break-words font-semibold text-admin-text dark:text-admin-text">{summary.product.name}</h3>
                    <span className="rounded-full bg-admin-chip px-2.5 py-1 text-xs font-semibold text-admin-text-secondary dark:bg-admin-chip dark:text-admin-text-secondary">
                      {categoryLabel(summary.product.category)}
                    </span>
                    <AdminStatusBadge
                      status={assessment?.status ?? "not_started"}
                      title={assessment?.reason}
                    />
                  </div>
                  <div className="mt-1 font-mono text-xs text-admin-text-faint">
                    {summary.product.slug} · {summary.product.provider || "未填服务商"}
                  </div>
                </div>
                <div className="text-right text-xs text-admin-text-muted dark:text-admin-text-muted">
                  <div className="font-semibold text-admin-text dark:text-admin-text">
                    {summary.product.priceCount} 条价格
                  </div>
                  <div>{summary.countryCount} 个地区</div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                <div className="rounded-lg bg-admin-surface-subtle p-2 dark:bg-admin-chip">
                  <div className="text-lg font-semibold text-admin-text dark:text-admin-text">{summary.product.planCount}</div>
                  <div className="text-[11px] font-semibold text-admin-text-muted dark:text-admin-text-muted">套餐</div>
                </div>
                <div className="rounded-lg bg-emerald-50 p-2">
                  <div className="text-lg font-semibold text-emerald-700">{summary.verifiedCount}</div>
                  <div className="text-[11px] font-semibold text-admin-text-muted dark:text-admin-text-muted">已验证</div>
                </div>
                <div className="rounded-lg bg-red-50 p-2">
                  <div className="text-lg font-semibold text-red-700">{summary.stalePrices}</div>
                  <div className="text-[11px] font-semibold text-admin-text-muted dark:text-admin-text-muted">过期</div>
                </div>
                <div className="rounded-lg bg-amber-50 p-2">
                  <div className="text-lg font-semibold text-amber-700">{summary.noSourcePrices}</div>
                  <div className="text-[11px] font-semibold text-admin-text-muted dark:text-admin-text-muted">缺来源</div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-admin-surface-subtle p-3 text-sm dark:bg-admin-chip">
                <div>
                  <div className="text-xs font-semibold text-admin-text-muted dark:text-admin-text-muted">价格范围</div>
                  <div className="mt-1 font-semibold text-admin-text dark:text-admin-text">
                    {summary.range.min === null
                      ? "暂无正式价格"
                      : `${formatUsd(summary.range.min)} - ${formatUsd(summary.range.max ?? summary.range.min)}`}
                  </div>
                </div>
                <div className="flex gap-2">
                  <AdminLink
                    href={withAdminReturnTo(`/admin/products/${summary.product.id}/edit`,adminListLocation("/admin/prices",params,`price-product-${summary.product.id}`))}
                    className="rounded-lg border border-admin-border bg-admin-surface px-3 py-1.5 text-xs
                      font-semibold text-admin-text-body hover:bg-admin-surface-subtle
                      dark:border-admin-border-strong dark:bg-admin-surface dark:text-admin-text-body
                      dark:hover:bg-admin-chip"
                  >
                    管理产品
                  </AdminLink>
                </div>
              </div>
              <div className="mt-3 text-xs leading-5 text-admin-text-muted dark:text-admin-text-muted">
                {assessment?.reason}
              </div>
            </div>
          );})}
        </div>
      <AdminPagination {...productList.pagination} ariaLabel="价格产品底部分页" className="mt-4" />
      </AdminCard>

      <AdminCard>
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-admin-text dark:text-admin-text">地区价格明细</h2>
            <p className="mt-1 text-sm text-admin-text-muted dark:text-admin-text-muted">
              明细用于排查单个地区价格，不作为页面第一判断入口。
            </p>
          </div>
          <div className="text-sm font-semibold text-admin-text-muted dark:text-admin-text-muted">
            共 {siteStats.priceCount} 条正式价格，当前第 {safeDetailPage} / {detailTotalPages} 页
          </div>
        </div>

        <AdminPagination id="price-details" page={safeDetailPage} totalPages={detailTotalPages}
          total={siteStats.priceCount} pageSize={detailPageSize} pageHref={buildDetailPageHref}
          ariaLabel="地区价格分页" className="mb-4" />
        <div className="overflow-x-auto rounded-xl border border-admin-border dark:border-admin-border-strong">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-admin-border bg-admin-surface-subtle text-xs text-admin-text-muted dark:border-admin-border-strong dark:bg-admin-chip dark:text-admin-text-muted">
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
            <tbody className="divide-y divide-admin-border bg-admin-surface dark:bg-admin-surface">
              {detailRows.map((price) => (
                <tr key={price.id} className="align-top hover:bg-admin-surface-subtle dark:hover:bg-admin-chip">
                  <td className="px-4 py-4">
                    <div className="text-xs font-semibold text-admin-text-faint">
                      {categoryLabel(price.category)}
                    </div>
                    <div className="mt-1 flex items-center gap-3">
                      <AdminProductLogo slug={price.product_slug} name={price.product_name}/>
                      <div className="font-semibold text-admin-text">{price.product_name}</div>
                    </div>
                    <div className="mt-1 font-mono text-xs text-admin-text-faint">{price.product_slug}</div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="font-semibold text-admin-text dark:text-admin-text-body">{price.plan_name}</div>
                    <div className="mt-1 font-mono text-xs text-admin-text-faint">{price.plan_slug}</div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="font-semibold text-admin-text dark:text-admin-text">
                      {price.country_name_zh || price.country_name_en}
                    </div>
                    <div className="mt-1 text-xs text-admin-text-muted dark:text-admin-text-muted">
                      {price.country_code} · {platformLabel(normalizeStatus(price.billing_platform))}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="text-base font-semibold text-admin-text dark:text-admin-text">
                      {formatUsd(toNumber(price.price_usd))}
                    </div>
                    <div className="mt-1 text-xs font-medium text-admin-text-muted dark:text-admin-text-muted">
                      {formatMoney(toNumber(price.local_price), price.currency)}
                    </div>
                    {price.diff_vs_us_percent !== null ? (
                      <div className="mt-1 text-xs text-admin-text-faint">
                        较美国 {toNumber(price.diff_vs_us_percent).toFixed(1)}%
                      </div>
                    ) : null}
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-2">
                      {(() => {
                        const assessment = assessPriceOperationalStatus({
                          status: normalizeStatus(price.status),
                          dataQuality: normalizeStatus(price.data_quality),
                          hasSource: Boolean(price.source_name),
                        });
                        return assessment ? (
                          <>
                            <AdminStatusBadge status={assessment.status} title={assessment.reason} />
                            <span className="text-xs text-admin-text-muted dark:text-admin-text-muted">
                              数据：{qualityLabel(normalizeStatus(price.data_quality))}
                            </span>
                          </>
                        ) : null;
                      })()}
                    </div>
                  </td>

                  <td className="max-w-[220px] px-4 py-4">
                    <div className="truncate font-semibold text-admin-text-body dark:text-admin-text-body">
                      {price.source_name || "无来源"}
                    </div>
                    <div className="mt-1 text-xs text-admin-text-faint">
                      置信度 {price.confidence_score}
                    </div>
                  </td>

                  <td className="px-4 py-4 text-xs text-admin-text-muted dark:text-admin-text-muted">
                    {formatDate(price.last_checked_at || price.updated_at)}
                  </td>
                </tr>
              ))}

              {siteStats.priceCount === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm font-semibold text-admin-text-faint">
                    暂无正式价格数据。
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        <AdminPagination page={safeDetailPage} totalPages={detailTotalPages} total={siteStats.priceCount}
          pageSize={detailPageSize} pageHref={buildDetailPageHref} ariaLabel="地区价格底部分页" className="mt-4" />
      </AdminCard>
    </div>
  );
}

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

type ProductWithRelations = Awaited<ReturnType<typeof getProducts>>;
type ProductRow = ProductWithRelations[number];
type RegionPriceRow = ProductRow["regionPrices"][number];

async function getProducts() {
  return prisma.product.findMany({
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    include: {
      plans: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: {
          regionPrices: {
            orderBy: [{ priceUsd: "asc" }],
            include: {
              country: true,
              primarySource: true,
            },
          },
        },
      },
      regionPrices: {
        orderBy: [{ priceUsd: "asc" }],
        include: {
          plan: true,
          country: true,
          primarySource: true,
        },
      },
    },
  });
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

function getPriceRange(prices: RegionPriceRow[]) {
  const values = prices.map((price) => Number(price.priceUsd)).filter(Number.isFinite);
  return {
    min: values.length ? Math.min(...values) : null,
    max: values.length ? Math.max(...values) : null,
  };
}

export default async function AdminPricesPage() {
  const [products, taxCoverage] = await Promise.all([getProducts(), getTaxCoverage()]);
  const allPrices = products.flatMap((product) => product.regionPrices);
  const allPriceRows = products.flatMap((product) =>
    product.regionPrices.map((price) => ({ product, price }))
  );
  const publishedProducts = products.filter((product) => product.status === "PUBLISHED");
  const productsWithPrices = products.filter((product) => product.regionPrices.length > 0);
  const allPlans = products.flatMap((product) => product.plans);
  const plansWithPrices = allPlans.filter((plan) => plan.regionPrices.length > 0);
  const countries = new Set(allPrices.map((price) => price.country.code));
  const staleCount = allPrices.filter((price) => price.dataQuality === "STALE").length;
  const noSourceCount = allPrices.filter((price) => !price.primarySourceId).length;
  const range = getPriceRange(allPrices);
  const categories = sortCategories(Array.from(new Set(products.map((product) => product.category))));
  const missingTaxProfileCount = Math.max(
    taxCoverage.publishedCountryCount - taxCoverage.withTaxProfile,
    0,
  );

  const categorySummaries = categories.map((category) => {
    const categoryProducts = products.filter((product) => product.category === category);
    const categoryPrices = categoryProducts.flatMap((product) => product.regionPrices);
    const categoryPlans = categoryProducts.flatMap((product) => product.plans);
    const categoryRange = getPriceRange(categoryPrices);

    return {
      category,
      products: categoryProducts,
      prices: categoryPrices,
      plans: categoryPlans,
      range: categoryRange,
      productsWithPrices: categoryProducts.filter((product) => product.regionPrices.length > 0).length,
      staleCount: categoryPrices.filter((price) => price.dataQuality === "STALE").length,
      noSourceCount: categoryPrices.filter((price) => !price.primarySourceId).length,
    };
  });

  const productSummaries = products.map((product) => {
    const productRange = getPriceRange(product.regionPrices);
    const productCountries = new Set(product.regionPrices.map((price) => price.country.code));
    const verifiedCount = product.regionPrices.filter((price) => price.dataQuality === "VERIFIED").length;
    const stalePrices = product.regionPrices.filter((price) => price.dataQuality === "STALE").length;
    const noSourcePrices = product.regionPrices.filter((price) => !price.primarySourceId).length;

    return {
      product,
      range: productRange,
      countryCount: productCountries.size,
      verifiedCount,
      stalePrices,
      noSourcePrices,
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
            {plansWithPrices.length} / {countries.size}
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
            {staleCount + noSourceCount}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            过期 {staleCount}，缺来源 {noSourceCount}。
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
                  <div className="text-lg font-black text-slate-950">{summary.plans.length}</div>
                  <div className="mt-1 text-[11px] font-bold text-slate-500">套餐</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-2">
                  <div className="text-lg font-black text-slate-950">{summary.prices.length}</div>
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
                    {summary.product.regionPrices.length} 条价格
                  </div>
                  <div>{summary.countryCount} 个地区</div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                <div className="rounded-lg bg-slate-50 p-2">
                  <div className="text-lg font-black text-slate-950">{summary.product.plans.length}</div>
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
            共 {allPrices.length} 条正式价格
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
              {allPriceRows.map(({ product, price }) => (
                <tr key={price.id} className="align-top hover:bg-slate-50">
                  <td className="px-4 py-4">
                    <div className="text-xs font-black text-slate-400">
                      {categoryLabel(product.category)}
                    </div>
                    <div className="mt-1 font-black text-slate-950">{product.name}</div>
                    <div className="mt-1 font-mono text-xs text-slate-400">{product.slug}</div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="font-bold text-slate-800">{price.plan.name}</div>
                    <div className="mt-1 font-mono text-xs text-slate-400">{price.plan.slug}</div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="font-black text-slate-900">
                      {price.country.nameZh || price.country.nameEn}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {price.country.code} · {platformLabel(String(price.billingPlatform))}
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <div className="text-base font-black text-slate-950">
                      {formatUsd(Number(price.priceUsd))}
                    </div>
                    <div className="mt-1 text-xs font-medium text-slate-500">
                      {formatMoney(Number(price.localPrice), price.currency)}
                    </div>
                    {price.diffVsUsPercent !== null ? (
                      <div className="mt-1 text-xs text-slate-400">
                        较美国 {Number(price.diffVsUsPercent).toFixed(1)}%
                      </div>
                    ) : null}
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-2">
                      <span
                        className={[
                          "inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-black ring-1",
                          statusClassName(String(price.status)),
                        ].join(" ")}
                      >
                        {statusLabel(String(price.status))}
                      </span>
                      <span
                        className={[
                          "inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-black ring-1",
                          qualityClassName(String(price.dataQuality)),
                        ].join(" ")}
                      >
                        {qualityLabel(String(price.dataQuality))}
                      </span>
                    </div>
                  </td>

                  <td className="max-w-[220px] px-4 py-4">
                    <div className="truncate font-bold text-slate-700">
                      {price.primarySource?.name || "无来源"}
                    </div>
                    <div className="mt-1 text-xs text-slate-400">
                      置信度 {price.confidenceScore}
                    </div>
                  </td>

                  <td className="px-4 py-4 text-xs text-slate-500">
                    {formatDate(price.lastCheckedAt || price.updatedAt)}
                  </td>
                </tr>
              ))}

              {allPrices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm font-bold text-slate-400">
                    暂无正式价格数据。
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </div>
  );
}

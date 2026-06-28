import Link from "next/link";
import { AdminCard, AdminPageHeader } from "../../../components/admin/AdminCard";
import { prisma } from "../../../lib/prisma";

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
  if (quality === "VERIFIED") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (quality === "ESTIMATED") {
    return "bg-blue-50 text-blue-700 ring-blue-200";
  }

  if (quality === "STALE") {
    return "bg-red-50 text-red-700 ring-red-200";
  }

  return "bg-amber-50 text-amber-700 ring-amber-200";
}

function formatMoney(amount: number, currency: string) {
  return `${amount.toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })} ${currency}`;
}

function formatUsd(amount: number) {
  return `$${amount.toFixed(2)}`;
}

export default async function AdminPricesPage() {
  const prices = await prisma.regionPrice.findMany({
    orderBy: [
      {
        product: {
          sortOrder: "asc",
        },
      },
      {
        plan: {
          sortOrder: "asc",
        },
      },
      {
        priceUsd: "asc",
      },
    ],
    include: {
      product: true,
      plan: true,
      country: true,
      primarySource: true,
    },
  });

  const publishedPrices = prices.filter((price) => price.status === "PUBLISHED");
  const verifiedPrices = prices.filter((price) => price.dataQuality === "VERIFIED");
  const stalePrices = prices.filter((price) => price.dataQuality === "STALE");
  const noSourcePrices = prices.filter((price) => !price.primarySourceId);

  const usdValues = prices
    .map((price) => Number(price.priceUsd))
    .filter((value) => !Number.isNaN(value));

  const minUsd = usdValues.length > 0 ? Math.min(...usdValues) : null;
  const maxUsd = usdValues.length > 0 ? Math.max(...usdValues) : null;

  return (
    <div>
      <AdminPageHeader
        eyebrow="Prices"
        title="价格库"
        description="查看 GeoSub 当前已录入的区域价格、国家、币种、美元折算价、数据质量和来源情况。当前页面先做只读总览。"
      />

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <AdminCard>
          <div className="text-sm font-bold text-slate-500">价格记录</div>
          <div className="mt-2 text-2xl font-black text-slate-950">
            {prices.length}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            区域价格总数。
          </div>
        </AdminCard>

        <AdminCard>
          <div className="text-sm font-bold text-slate-500">已发布 / 已验证</div>
          <div className="mt-2 text-2xl font-black text-slate-950">
            {publishedPrices.length} / {verifiedPrices.length}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            当前数据质量概览。
          </div>
        </AdminCard>

        <AdminCard>
          <div className="text-sm font-bold text-slate-500">最低 / 最高 USD</div>
          <div className="mt-2 text-2xl font-black text-slate-950">
            {minUsd === null ? "—" : formatUsd(minUsd)}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            最高：{maxUsd === null ? "—" : formatUsd(maxUsd)}
          </div>
        </AdminCard>

        <AdminCard>
          <div className="text-sm font-bold text-slate-500">过期 / 无来源</div>
          <div className="mt-2 text-2xl font-black text-slate-950">
            {stalePrices.length} / {noSourcePrices.length}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            后续需要优先处理。
          </div>
        </AdminCard>
      </div>

      <AdminCard>
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-950">
              区域价格列表
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              按产品、套餐和美元折算价排序，方便快速看出最低价地区。
            </p>
          </div>

          <Link
            href="/admin/products"
            className="text-sm font-black text-blue-700 hover:text-blue-900"
          >
            查看产品库 →
          </Link>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200">
          <div className="grid grid-cols-[minmax(140px,1fr)_100px_90px_130px_100px_90px_110px_110px] gap-0 bg-slate-50 px-5 py-3 text-xs font-black uppercase tracking-wide text-slate-400">
            <div>产品</div>
            <div>套餐</div>
            <div>国家</div>
            <div>本地价格</div>
            <div>USD</div>
            <div>状态</div>
            <div>质量</div>
            <div>来源</div>
          </div>

          <div className="divide-y divide-slate-100 bg-white">
            {prices.map((price) => (
              <div
                key={price.id}
                className="grid grid-cols-[minmax(140px,1fr)_100px_90px_130px_100px_90px_110px_110px] items-center gap-0 px-5 py-4 text-sm"
              >
                <div>
                  <div className="font-black text-slate-950">
                    {price.product.name}
                  </div>
                  <div className="mt-1 font-mono text-xs text-slate-400">
                    {price.product.slug}
                  </div>
                </div>

                <div className="font-bold text-slate-700">
                  {price.plan.name}
                </div>

                <div>
                  <div className="font-black text-slate-800">
                    {price.country.code}
                  </div>
                  <div className="mt-1 text-xs text-slate-400">
                    {price.country.nameEn}
                  </div>
                </div>

                <div className="font-bold text-slate-700">
                  {formatMoney(Number(price.localPrice), price.currency)}
                </div>

                <div className="font-black text-emerald-700">
                  {formatUsd(Number(price.priceUsd))}
                </div>

                <div className="text-xs font-bold text-slate-500">
                  {statusLabel(String(price.status))}
                </div>

                <div>
                  <span
                    className={[
                      "inline-flex rounded-full px-2.5 py-1 text-xs font-black ring-1",
                      qualityClassName(String(price.dataQuality)),
                    ].join(" ")}
                  >
                    {qualityLabel(String(price.dataQuality))}
                  </span>
                </div>

                <div className="truncate text-xs font-bold text-slate-500">
                  {price.primarySource?.name || "无来源"}
                </div>
              </div>
            ))}

            {prices.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm font-bold text-slate-400">
                暂无价格数据。
              </div>
            ) : null}
          </div>
        </div>
      </AdminCard>
    </div>
  );
}
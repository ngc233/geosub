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

function cycleLabel(cycle: string) {
  if (cycle === "MONTHLY") return "月付";
  if (cycle === "YEARLY") return "年付";
  if (cycle === "WEEKLY") return "周付";
  if (cycle === "QUARTERLY") return "季度";
  if (cycle === "ONE_TIME") return "一次性";
  if (cycle === "LIFETIME") return "终身";
  if (cycle === "UNKNOWN") return "未知";
  return cycle;
}

function statusClassName(status: string) {
  if (status === "PUBLISHED") {
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }

  if (status === "DRAFT") {
    return "bg-amber-50 text-amber-700 ring-amber-200";
  }

  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function formatUsd(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }

  return `$${value.toFixed(2)}`;
}

export default async function AdminPlansPage() {
  const plans = await prisma.plan.findMany({
    orderBy: [
      {
        product: {
          sortOrder: "asc",
        },
      },
      {
        sortOrder: "asc",
      },
      {
        createdAt: "asc",
      },
    ],
    include: {
      product: true,
      regionPrices: {
        include: {
          country: true,
        },
      },
    },
  });

  const publishedPlans = plans.filter((plan) => plan.status === "PUBLISHED");
  const totalPrices = plans.reduce(
    (sum, plan) => sum + plan.regionPrices.length,
    0
  );

  const plansWithPrices = plans.filter((plan) => plan.regionPrices.length > 0);
  const plansWithoutPrices = plans.filter((plan) => plan.regionPrices.length === 0);

  return (
    <div>
      <AdminPageHeader
        eyebrow="Plans"
        title="套餐库"
        description="查看每个产品下的套餐、计费周期、价格覆盖数量、最低价和最高价。当前页面先做只读总览。"
      />

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <AdminCard>
          <div className="text-sm font-bold text-slate-500">套餐总数</div>
          <div className="mt-2 text-2xl font-black text-slate-950">
            {plans.length}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            已录入套餐数量。
          </div>
        </AdminCard>

        <AdminCard>
          <div className="text-sm font-bold text-slate-500">已发布</div>
          <div className="mt-2 text-2xl font-black text-slate-950">
            {publishedPlans.length}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            可用于前台展示的套餐。
          </div>
        </AdminCard>

        <AdminCard>
          <div className="text-sm font-bold text-slate-500">价格覆盖</div>
          <div className="mt-2 text-2xl font-black text-slate-950">
            {totalPrices}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            套餐下的区域价格数量。
          </div>
        </AdminCard>

        <AdminCard>
          <div className="text-sm font-bold text-slate-500">有价 / 无价</div>
          <div className="mt-2 text-2xl font-black text-slate-950">
            {plansWithPrices.length} / {plansWithoutPrices.length}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            无价格套餐后续优先补齐。
          </div>
        </AdminCard>
      </div>

      <AdminCard>
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-950">
              套餐列表
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              套餐是产品和区域价格之间的中间层，例如 ChatGPT Plus、ChatGPT Pro。
            </p>
          </div>

          <div className="flex gap-4">
            <Link
              href="/admin/products"
              className="text-sm font-black text-blue-700 hover:text-blue-900"
            >
              产品库 →
            </Link>

            <Link
              href="/admin/prices"
              className="text-sm font-black text-blue-700 hover:text-blue-900"
            >
              价格库 →
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="grid grid-cols-[minmax(140px,1fr)_minmax(120px,1fr)_100px_90px_100px_110px_110px] gap-0 bg-slate-50 px-5 py-3 text-xs font-black uppercase tracking-wide text-slate-400">
            <div>产品</div>
            <div>套餐</div>
            <div>周期</div>
            <div>价格数</div>
            <div>状态</div>
            <div>最低价</div>
            <div>最高价</div>
          </div>

          <div className="divide-y divide-slate-100 bg-white">
            {plans.map((plan) => {
              const prices = plan.regionPrices
                .map((price) => Number(price.priceUsd))
                .filter((value) => !Number.isNaN(value));

              const minPrice = prices.length > 0 ? Math.min(...prices) : null;
              const maxPrice = prices.length > 0 ? Math.max(...prices) : null;

              return (
                <div
                  key={plan.id}
                  className="grid grid-cols-[minmax(140px,1fr)_minmax(120px,1fr)_100px_90px_100px_110px_110px] items-center gap-0 px-5 py-4 text-sm"
                >
                  <div>
                    <div className="font-black text-slate-950">
                      {plan.product.name}
                    </div>
                    <div className="mt-1 font-mono text-xs text-slate-400">
                      {plan.product.slug}
                    </div>
                  </div>

                  <div>
                    <div className="font-black text-slate-800">
                      {plan.name}
                    </div>
                    <div className="mt-1 font-mono text-xs text-slate-400">
                      {plan.slug}
                    </div>
                  </div>

                  <div className="text-slate-600">
                    {cycleLabel(String(plan.billingCycle))}
                  </div>

                  <div className="font-bold text-slate-700">
                    {plan.regionPrices.length}
                  </div>

                  <div>
                    <span
                      className={[
                        "inline-flex rounded-full px-2.5 py-1 text-xs font-black ring-1",
                        statusClassName(String(plan.status)),
                      ].join(" ")}
                    >
                      {statusLabel(String(plan.status))}
                    </span>
                  </div>

                  <div className="font-black text-emerald-700">
                    {formatUsd(minPrice)}
                  </div>

                  <div className="font-black text-slate-700">
                    {formatUsd(maxPrice)}
                  </div>
                </div>
              );
            })}

            {plans.length === 0 ? (
              <div className="px-5 py-12 text-center text-sm font-bold text-slate-400">
                暂无套餐数据。
              </div>
            ) : null}
          </div>
        </div>
      </AdminCard>
    </div>
  );
}
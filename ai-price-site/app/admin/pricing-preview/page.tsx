import Link from "next/link";
import { AdminCard, AdminPageHeader } from "../../../components/admin/AdminCard";
import { prisma } from "../../../lib/prisma";

function formatUsd(value: unknown) {
  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return "—";
  }

  return `$${numberValue.toFixed(2)}`;
}

function formatLocalPrice(value: unknown, currency: string) {
  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return `— ${currency}`;
  }

  return `${numberValue.toLocaleString("en-US", {
    maximumFractionDigits: 2,
  })} ${currency}`;
}

function categoryLabel(category: string) {
  if (category === "AI") return "AI 订阅";
  if (category === "STREAMING") return "流媒体";
  if (category === "SOFTWARE") return "软件订阅";
  if (category === "GAME") return "游戏 / Steam";
  if (category === "GIFT_CARD") return "礼品卡";
  if (category === "PAYMENT") return "支付 / 虚拟服务";
  if (category === "VPN") return "网络工具";
  return "其他";
}

export default async function AdminPricingPreviewPage() {
  const products = await prisma.product.findMany({
    where: {
      status: "PUBLISHED",
    },
    orderBy: [
      { sortOrder: "asc" },
      { createdAt: "asc" },
    ],
    include: {
      plans: {
        where: {
          status: "PUBLISHED",
        },
        orderBy: [
          { sortOrder: "asc" },
          { createdAt: "asc" },
        ],
        include: {
          regionPrices: {
            where: {
              status: "PUBLISHED",
            },
            orderBy: {
              priceUsd: "asc",
            },
            include: {
              country: true,
              primarySource: true,
            },
          },
        },
      },
    },
  });

  const visibleProducts = products.filter((product) =>
    product.plans.some((plan) => plan.regionPrices.length > 0)
  );

  const totalPlans = visibleProducts.reduce(
    (sum, product) => sum + product.plans.length,
    0
  );

  const totalPrices = visibleProducts.reduce(
    (sum, product) =>
      sum +
      product.plans.reduce(
        (planSum, plan) => planSum + plan.regionPrices.length,
        0
      ),
    0
  );

  return (
    <div>
      <AdminPageHeader
        eyebrow="Database Preview"
        title="数据库价格预览"
        description="这个页面只用于验证数据库里的产品、套餐和地区价格能否正确渲染。它不会影响正式前台页面。"
      />

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <AdminCard>
          <div className="text-sm font-bold text-slate-500">可展示产品</div>
          <div className="mt-2 text-2xl font-black text-slate-950">
            {visibleProducts.length}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            已发布且有价格数据的产品。
          </div>
        </AdminCard>

        <AdminCard>
          <div className="text-sm font-bold text-slate-500">套餐数量</div>
          <div className="mt-2 text-2xl font-black text-slate-950">
            {totalPlans}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            已发布产品下的套餐。
          </div>
        </AdminCard>

        <AdminCard>
          <div className="text-sm font-bold text-slate-500">价格记录</div>
          <div className="mt-2 text-2xl font-black text-slate-950">
            {totalPrices}
          </div>
          <div className="mt-2 text-sm text-slate-500">
            已发布区域价格。
          </div>
        </AdminCard>

        <AdminCard>
          <div className="text-sm font-bold text-slate-500">下一步</div>
          <div className="mt-2 text-base font-black text-slate-950">
            前台迁移
          </div>
          <div className="mt-2 text-sm text-slate-500">
            确认本页正常后，再替换 /zh/ai-pricing。
          </div>
        </AdminCard>
      </div>

      <div className="space-y-6">
        {visibleProducts.map((product) => (
          <AdminCard key={product.id}>
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-black text-slate-950">
                    {product.name}
                  </h2>

                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700 ring-1 ring-blue-200">
                    {categoryLabel(String(product.category))}
                  </span>

                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-500 ring-1 ring-slate-200">
                    {product.provider || "未知服务商"}
                  </span>
                </div>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                  {product.description || "暂无产品描述。"}
                </p>

                <p className="mt-2 font-mono text-xs text-slate-400">
                  slug: {product.slug}
                </p>
              </div>

              <Link
                href="/admin/products"
                className="text-sm font-black text-blue-700 hover:text-blue-900"
              >
                返回服务库 →
              </Link>
            </div>

            <div className="space-y-5">
              {product.plans.map((plan) => {
                const prices = plan.regionPrices;
                const minPrice = prices[0];
                const maxPrice = prices[prices.length - 1];

                return (
                  <div
                    key={plan.id}
                    className="overflow-hidden rounded-3xl border border-slate-200"
                  >
                    <div className="flex flex-col gap-2 bg-slate-50 px-5 py-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-base font-black text-slate-950">
                          {plan.name}
                        </h3>
                        <p className="mt-1 font-mono text-xs text-slate-400">
                          {plan.slug} · {String(plan.billingCycle)}
                        </p>
                      </div>

                      <div className="text-sm font-bold text-slate-500">
                        {prices.length} 个地区
                        {minPrice && maxPrice ? (
                          <span className="ml-2 text-emerald-700">
                            {formatUsd(minPrice.priceUsd)} - {formatUsd(maxPrice.priceUsd)}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-y border-slate-100 bg-white text-xs font-black uppercase tracking-wide text-slate-400">
                            <th className="w-16 px-5 py-3">#</th>
                            <th className="min-w-[120px] px-5 py-3">国家</th>
                            <th className="min-w-[140px] px-5 py-3">本地价格</th>
                            <th className="min-w-[120px] px-5 py-3">USD</th>
                            <th className="min-w-[120px] px-5 py-3">质量</th>
                            <th className="min-w-[160px] px-5 py-3">来源</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100 bg-white">
                          {prices.map((price, index) => (
                            <tr key={price.id}>
                              <td className="px-5 py-4 font-mono text-xs text-slate-400">
                                {index + 1}
                              </td>

                              <td className="px-5 py-4">
                                <div className="font-black text-slate-900">
                                  {price.country.code}
                                </div>
                                <div className="mt-1 text-xs text-slate-400">
                                  {price.country.nameZh || price.country.nameEn}
                                </div>
                              </td>

                              <td className="px-5 py-4 font-bold text-slate-700">
                                {formatLocalPrice(price.localPrice, price.currency)}
                              </td>

                              <td className="px-5 py-4 font-black text-emerald-700">
                                {formatUsd(price.priceUsd)}
                              </td>

                              <td className="px-5 py-4">
                                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-200">
                                  {String(price.dataQuality)}
                                </span>
                              </td>

                              <td className="px-5 py-4 text-xs font-bold text-slate-500">
                                {price.primarySource?.name || "无来源"}
                              </td>
                            </tr>
                          ))}

                          {prices.length === 0 ? (
                            <tr>
                              <td
                                colSpan={6}
                                className="px-5 py-8 text-center text-sm font-bold text-slate-400"
                              >
                                当前套餐暂无已发布价格。
                              </td>
                            </tr>
                          ) : null}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </AdminCard>
        ))}

        {visibleProducts.length === 0 ? (
          <AdminCard>
            <div className="py-12 text-center text-sm font-bold text-slate-400">
              暂无可展示的数据库价格数据。
            </div>
          </AdminCard>
        ) : null}
      </div>
    </div>
  );
}
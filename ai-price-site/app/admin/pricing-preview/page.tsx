import AdminLink from "@/components/admin/AdminLink";
import { ArrowRight } from "lucide-react";
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
          <div className="text-sm font-semibold text-admin-text-muted dark:text-admin-text-muted">可展示产品</div>
          <div className="mt-2 text-2xl font-semibold text-admin-text dark:text-admin-text">
            {visibleProducts.length}
          </div>
          <div className="mt-2 text-sm text-admin-text-muted dark:text-admin-text-muted">
            已发布且有价格数据的产品。
          </div>
        </AdminCard>

        <AdminCard>
          <div className="text-sm font-semibold text-admin-text-muted dark:text-admin-text-muted">套餐数量</div>
          <div className="mt-2 text-2xl font-semibold text-admin-text dark:text-admin-text">
            {totalPlans}
          </div>
          <div className="mt-2 text-sm text-admin-text-muted dark:text-admin-text-muted">
            已发布产品下的套餐。
          </div>
        </AdminCard>

        <AdminCard>
          <div className="text-sm font-semibold text-admin-text-muted dark:text-admin-text-muted">价格记录</div>
          <div className="mt-2 text-2xl font-semibold text-admin-text dark:text-admin-text">
            {totalPrices}
          </div>
          <div className="mt-2 text-sm text-admin-text-muted dark:text-admin-text-muted">
            已发布区域价格。
          </div>
        </AdminCard>

        <AdminCard>
          <div className="text-sm font-semibold text-admin-text-muted dark:text-admin-text-muted">下一步</div>
          <div className="mt-2 text-base font-semibold text-admin-text dark:text-admin-text">
            前台迁移
          </div>
          <div className="mt-2 text-sm text-admin-text-muted dark:text-admin-text-muted">
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
                  <h2 className="text-base font-semibold text-admin-text dark:text-admin-text">
                    {product.name}
                  </h2>

                  <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
                    {categoryLabel(String(product.category))}
                  </span>

                  <span className="rounded-full bg-admin-chip px-2.5 py-1 text-xs font-semibold text-admin-text-muted ring-1 ring-admin-border dark:bg-admin-chip dark:text-admin-text-muted">
                    {product.provider || "未知服务商"}
                  </span>
                </div>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-admin-text-muted dark:text-admin-text-muted">
                  {product.description || "暂无产品描述。"}
                </p>

                <p className="mt-2 font-mono text-xs text-admin-text-faint">
                  slug: {product.slug}
                </p>
              </div>

              <AdminLink
                href="/admin/products"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-admin-accent hover:underline"
              >
                返回服务库
                <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.8} />
              </AdminLink>
            </div>

            <div className="space-y-5">
              {product.plans.map((plan) => {
                const prices = plan.regionPrices;
                const minPrice = prices[0];
                const maxPrice = prices[prices.length - 1];

                return (
                  <div
                    key={plan.id}
                    className="overflow-hidden rounded-xl border border-admin-border dark:border-admin-border-strong"
                  >
                    <div className="flex flex-col gap-2 bg-admin-surface-subtle px-5 py-4 md:flex-row md:items-center md:justify-between dark:bg-admin-chip">
                      <div>
                        <h3 className="text-base font-semibold text-admin-text dark:text-admin-text">
                          {plan.name}
                        </h3>
                        <p className="mt-1 font-mono text-xs text-admin-text-faint">
                          {plan.slug} · {String(plan.billingCycle)}
                        </p>
                      </div>

                      <div className="text-sm font-semibold text-admin-text-muted dark:text-admin-text-muted">
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
                          <tr className="border-y border-admin-border bg-admin-surface text-xs font-semibold
                            uppercase tracking-wide text-admin-text-faint
                            dark:border-admin-border dark:bg-admin-surface">
                            <th className="w-16 px-5 py-3">#</th>
                            <th className="min-w-[120px] px-5 py-3">国家</th>
                            <th className="min-w-[140px] px-5 py-3">本地价格</th>
                            <th className="min-w-[120px] px-5 py-3">USD</th>
                            <th className="min-w-[120px] px-5 py-3">质量</th>
                            <th className="min-w-[160px] px-5 py-3">来源</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-admin-border bg-admin-surface dark:bg-admin-surface">
                          {prices.map((price, index) => (
                            <tr key={price.id}>
                              <td className="px-5 py-4 font-mono text-xs text-admin-text-faint">
                                {index + 1}
                              </td>

                              <td className="px-5 py-4">
                                <div className="font-semibold text-admin-text dark:text-admin-text">
                                  {price.country.code}
                                </div>
                                <div className="mt-1 text-xs text-admin-text-faint">
                                  {price.country.nameZh || price.country.nameEn}
                                </div>
                              </td>

                              <td className="px-5 py-4 font-semibold text-admin-text-body dark:text-admin-text-body">
                                {formatLocalPrice(price.localPrice, price.currency)}
                              </td>

                              <td className="px-5 py-4 font-semibold text-emerald-700">
                                {formatUsd(price.priceUsd)}
                              </td>

                              <td className="px-5 py-4">
                                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                                  {String(price.dataQuality)}
                                </span>
                              </td>

                              <td className="px-5 py-4 text-xs font-semibold text-admin-text-muted dark:text-admin-text-muted">
                                {price.primarySource?.name || "无来源"}
                              </td>
                            </tr>
                          ))}

                          {prices.length === 0 ? (
                            <tr>
                              <td
                                colSpan={6}
                                className="px-5 py-8 text-center text-sm font-semibold text-admin-text-faint"
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
            <div className="py-12 text-center text-sm font-semibold text-admin-text-faint">
              暂无可展示的数据库价格数据。
            </div>
          </AdminCard>
        ) : null}
      </div>
    </div>
  );
}

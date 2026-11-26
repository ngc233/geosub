import AdminLink from "@/components/admin/AdminLink";
import { AdminBadge } from "@/components/admin/AdminBadge";
import { AdminLinkButton } from "@/components/admin/AdminButton";
import { AdminCard, AdminPageHeader } from "@/components/admin/AdminCard";
import AdminFilterBar from "@/components/admin/AdminFilterBar";
import AdminProductLogo from "@/components/admin/AdminProductLogo";
import {
  AdminTable,
  AdminTableBody,
  AdminTableHead,
  AdminTableShell,
  AdminTd,
  AdminTh,
  AdminTr,
} from "@/components/admin/AdminTable";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { prisma } from "../../../lib/prisma";

function formatUsd(value: unknown) {
  const numberValue = Number(value);
  if (Number.isNaN(numberValue)) return "—";
  return `$${numberValue.toFixed(2)}`;
}

function formatLocalPrice(value: unknown, currency: string) {
  const numberValue = Number(value);
  if (Number.isNaN(numberValue)) return `— ${currency}`;
  return `${numberValue.toLocaleString("en-US", { maximumFractionDigits: 2 })} ${currency}`;
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

export default async function AdminPricingPreviewPage({
  searchParams,
}: {
  searchParams?: Promise<{ product?: string; q?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const selectedSlug = (params.product || "").trim();
  const q = (params.q || "").trim().toLowerCase();

  // Lightweight index query first: never load all region prices across all products at once.
  const productIndex = await prisma.product.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      category: true,
      provider: true,
      _count: {
        select: {
          plans: { where: { status: "PUBLISHED" } },
          regionPrices: { where: { status: "PUBLISHED" } },
        },
      },
    },
  });

  const visibleIndex = productIndex.filter((item) => item._count.regionPrices > 0);
  const filteredIndex = q
    ? visibleIndex.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.slug.toLowerCase().includes(q) ||
          (item.provider || "").toLowerCase().includes(q),
      )
    : visibleIndex;

  const selectedProduct = selectedSlug
    ? await prisma.product.findFirst({
        where: { slug: selectedSlug, status: "PUBLISHED" },
        include: {
          plans: {
            where: { status: "PUBLISHED" },
            orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
            include: {
              regionPrices: {
                where: { status: "PUBLISHED" },
                orderBy: { priceUsd: "asc" },
                include: {
                  country: true,
                  primarySource: true,
                },
              },
            },
          },
        },
      })
    : null;

  const totalPlans = visibleIndex.reduce((sum, item) => sum + item._count.plans, 0);
  const totalPrices = visibleIndex.reduce((sum, item) => sum + item._count.regionPrices, 0);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Diagnostics"
        title="数据库价格结构预览"
        description="按产品按需加载已发布套餐与地区价格结构，用于排查前台数据一致性，不影响公开页面。"
        action={
          selectedProduct ? (
            <div className="flex flex-wrap gap-2">
              <AdminLinkButton href="/admin/pricing-preview" variant="secondary" size="sm">
                <ArrowLeft size={14} aria-hidden="true" />
                全部产品索引
              </AdminLinkButton>
              <AdminLinkButton
                href={`/admin/products/${selectedProduct.id}/edit?tab=prices`}
                size="sm"
              >
                进入产品工作区
              </AdminLinkButton>
            </div>
          ) : (
            <AdminLinkButton href="/admin/products" variant="secondary" size="sm">
              返回产品目录
            </AdminLinkButton>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <AdminCard className="p-4 sm:p-5">
          <p className="text-xs font-medium text-admin-text-muted">可预览产品</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-admin-text">
            {visibleIndex.length}
          </p>
          <p className="mt-1 text-xs text-admin-text-faint">已发布且含正式价格</p>
        </AdminCard>
        <AdminCard className="p-4 sm:p-5">
          <p className="text-xs font-medium text-admin-text-muted">已发布套餐</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-admin-text">{totalPlans}</p>
          <p className="mt-1 text-xs text-admin-text-faint">跨全部可预览产品汇总</p>
        </AdminCard>
        <AdminCard className="p-4 sm:p-5">
          <p className="text-xs font-medium text-admin-text-muted">已发布区域价格</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-admin-text">
            {totalPrices.toLocaleString("zh-CN")}
          </p>
          <p className="mt-1 text-xs text-admin-text-faint">按单产品按需展开，避免全量渲染</p>
        </AdminCard>
      </div>

      {!selectedSlug ? (
        <AdminCard className="space-y-4">
          <AdminFilterBar
            action="/admin/pricing-preview"
            q={params.q}
            searchLabel="选择要预览的产品"
            searchPlaceholder="按产品名、slug 或服务商筛选…"
            clearHref="/admin/pricing-preview"
          />

          <AdminTableShell>
            <AdminTable>
              <AdminTableHead>
                <tr>
                  <AdminTh>产品</AdminTh>
                  <AdminTh>分类</AdminTh>
                  <AdminTh align="right">已发布套餐</AdminTh>
                  <AdminTh align="right">已发布价格</AdminTh>
                  <AdminTh align="right">预览</AdminTh>
                </tr>
              </AdminTableHead>
              <AdminTableBody>
                {filteredIndex.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-sm text-admin-text-muted">
                      没有匹配的已发布价格产品。
                    </td>
                  </tr>
                ) : (
                  filteredIndex.map((item) => (
                    <AdminTr key={item.id}>
                      <AdminTd>
                        <div className="flex items-center gap-3">
                          <AdminProductLogo slug={item.slug} name={item.name} />
                          <div>
                            <div className="font-semibold text-admin-text">{item.name}</div>
                            <div className="font-mono text-xs text-admin-text-faint">
                              {item.slug}
                            </div>
                          </div>
                        </div>
                      </AdminTd>
                      <AdminTd>{categoryLabel(String(item.category))}</AdminTd>
                      <AdminTd align="right">
                        <span className="tabular-nums">{item._count.plans}</span>
                      </AdminTd>
                      <AdminTd align="right">
                        <span className="tabular-nums font-medium">{item._count.regionPrices}</span>
                      </AdminTd>
                      <AdminTd align="right">
                        <AdminLink
                          href={`/admin/pricing-preview?product=${encodeURIComponent(item.slug)}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-admin-accent hover:underline"
                        >
                          按需预览
                          <ArrowRight size={13} aria-hidden="true" />
                        </AdminLink>
                      </AdminTd>
                    </AdminTr>
                  ))
                )}
              </AdminTableBody>
            </AdminTable>
          </AdminTableShell>
        </AdminCard>
      ) : !selectedProduct ? (
        <AdminCard>
          <p className="py-8 text-center text-sm text-admin-text-muted">
            未找到已发布产品 <span className="font-mono">{selectedSlug}</span>。
          </p>
        </AdminCard>
      ) : (
        <div className="space-y-6">
          <AdminCard>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <AdminProductLogo slug={selectedProduct.slug} name={selectedProduct.name} size="md" />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-admin-text">
                      {selectedProduct.name}
                    </h2>
                    <AdminBadge variant="neutral">
                      {categoryLabel(String(selectedProduct.category))}
                    </AdminBadge>
                  </div>
                  <p className="mt-1 font-mono text-xs text-admin-text-faint">
                    {selectedProduct.slug} · {selectedProduct.provider || "未知服务商"}
                  </p>
                </div>
              </div>
              <span className="text-xs text-admin-text-muted tabular-nums">
                {selectedProduct.plans.length} 个已发布套餐
              </span>
            </div>
          </AdminCard>

          {selectedProduct.plans.map((plan) => {
            const prices = plan.regionPrices;
            const minPrice = prices[0];
            const maxPrice = prices[prices.length - 1];

            return (
              <AdminTableShell
                key={plan.id}
                title={plan.name}
                description={`${plan.slug} · ${String(plan.billingCycle)} · ${prices.length} 个地区${
                  minPrice && maxPrice
                    ? ` · ${formatUsd(minPrice.priceUsd)} – ${formatUsd(maxPrice.priceUsd)}`
                    : ""
                }`}
              >
                <AdminTable>
                  <AdminTableHead>
                    <tr>
                      <AdminTh>#</AdminTh>
                      <AdminTh>国家</AdminTh>
                      <AdminTh align="right">本地价格</AdminTh>
                      <AdminTh align="right">USD</AdminTh>
                      <AdminTh>质量</AdminTh>
                      <AdminTh>来源</AdminTh>
                    </tr>
                  </AdminTableHead>
                  <AdminTableBody>
                    {prices.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-sm text-admin-text-muted">
                          当前套餐暂无已发布价格。
                        </td>
                      </tr>
                    ) : (
                      prices.map((price, index) => (
                        <AdminTr key={price.id}>
                          <AdminTd>
                            <span className="font-mono text-xs text-admin-text-faint">
                              {index + 1}
                            </span>
                          </AdminTd>
                          <AdminTd>
                            <span className="font-medium text-admin-text">
                              {price.country.code}
                            </span>
                            <span className="ml-2 text-xs text-admin-text-muted">
                              {price.country.nameZh || price.country.nameEn}
                            </span>
                          </AdminTd>
                          <AdminTd align="right">
                            <span className="tabular-nums">
                              {formatLocalPrice(price.localPrice, price.currency)}
                            </span>
                          </AdminTd>
                          <AdminTd align="right">
                            <span className="font-semibold tabular-nums text-admin-accent">
                              {formatUsd(price.priceUsd)}
                            </span>
                          </AdminTd>
                          <AdminTd>
                            <AdminBadge variant="published">{String(price.dataQuality)}</AdminBadge>
                          </AdminTd>
                          <AdminTd>
                            <span className="text-xs text-admin-text-muted">
                              {price.primarySource?.name || "无来源"}
                            </span>
                          </AdminTd>
                        </AdminTr>
                      ))
                    )}
                  </AdminTableBody>
                </AdminTable>
              </AdminTableShell>
            );
          })}
        </div>
      )}
    </div>
  );
}

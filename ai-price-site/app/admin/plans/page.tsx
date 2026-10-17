import { preproductionRuntime } from "../../../lib/first-party-promotion";
import AdminProductContext from "../../../components/admin/AdminProductContext";
import AdminLink from "@/components/admin/AdminLink";
import { AdminLinkButton } from "@/components/admin/AdminButton";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import { ArrowRight } from "lucide-react";
import { AdminCard, AdminPageHeader } from "../../../components/admin/AdminCard";
import SegmentedControl from "../../../components/ui/SegmentedControl";
import {
  adminOperationalStatusMeta,
  assessPlanOperationalStatus,
  countAdminOperationalAssessments,
  getAdminOperationalTotal,
  isArchivedPublishStatus,
  type AdminOperationalStatus,
} from "../../../lib/admin-operational-status";
import { prisma } from "../../../lib/prisma";

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

function formatUsd(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }

  return `$${value.toFixed(2)}`;
}

export default async function AdminPlansPage({
  searchParams,
}: {
  searchParams?: Promise<{ state?: string; product?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const selectedState = ["not_started", "pending", "exception", "published", "archived"].includes(
    String(params.state),
  )
    ? (String(params.state) as AdminOperationalStatus | "archived")
    : "all";
  const productSlug = String(params.product || "").trim();
  const selectedProduct = productSlug ? await prisma.product.findUnique({ where: { slug: productSlug } }) : null;
  const plans = await prisma.plan.findMany({
    where: productSlug ? { product: { slug: productSlug } } : undefined,
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
        where: { status: { not: "ARCHIVED" } },
        include: {
          country: true,
        },
      },
    },
  });

  const archivedCount = plans.filter(
    (plan) =>
      isArchivedPublishStatus(String(plan.status)) &&
      !isArchivedPublishStatus(String(plan.product.status)),
  ).length;
  const activePlans = plans.filter(
    (plan) =>
      !isArchivedPublishStatus(String(plan.status)) &&
      !isArchivedPublishStatus(String(plan.product.status)),
  );
  const assessPlan = (plan: (typeof plans)[number]) => {
    const verifiedPriceCount = plan.regionPrices.filter(
      (price) => price.dataQuality === "VERIFIED" && price.status === "PUBLISHED",
    ).length;
    const estimatedPriceCount = plan.regionPrices.filter(
      (price) => price.dataQuality === "ESTIMATED",
    ).length;
    const pendingPriceCount = plan.regionPrices.filter(
      (price) => price.dataQuality === "PENDING_REVIEW" || price.status !== "PUBLISHED",
    ).length;
    const stalePriceCount = plan.regionPrices.filter(
      (price) => price.dataQuality === "STALE",
    ).length;
    const missingSourceCount = plan.regionPrices.filter(
      (price) => !price.primarySourceId,
    ).length;

    return assessPlanOperationalStatus({
      publishStatus: String(plan.status),
      priceCount: plan.regionPrices.length,
      verifiedPriceCount,
      estimatedPriceCount,
      pendingPriceCount,
      stalePriceCount,
      missingSourceCount,
    });
  };
  const operationalCounts = countAdminOperationalAssessments(activePlans.map(assessPlan));
  const activeTotal = getAdminOperationalTotal(operationalCounts);
  const visiblePlans = selectedState === "archived"
    ? plans.filter((plan) => isArchivedPublishStatus(String(plan.status)) && !isArchivedPublishStatus(String(plan.product.status)))
    : selectedState === "all"
    ? activePlans
    : activePlans.filter((plan) => assessPlan(plan)?.status === selectedState);
  const totalPrices = activePlans.reduce(
    (sum, plan) => sum + plan.regionPrices.length,
    0
  );

  const plansWithPrices = activePlans.filter((plan) => plan.regionPrices.length > 0);
  const plansWithoutPrices = activePlans.filter((plan) => plan.regionPrices.length === 0);
  const stateHref = (state: "all" | "archived" | AdminOperationalStatus) =>
    `/admin/plans?${new URLSearchParams({...(productSlug ? {product:productSlug} : {}),...(state === "all" ? {} : {state})})}`;

  return (
    <div>
      {selectedProduct ? <AdminProductContext id={selectedProduct.id} slug={selectedProduct.slug} name={selectedProduct.name} /> : null}
      {productSlug ? <p className="mb-4 text-sm">{selectedProduct ? `仅显示 ${selectedProduct.name} 的套餐。` : "未找到指定产品，没有显示其他产品的数据。"} <AdminLink href="/admin/plans" className="underline">清除产品筛选</AdminLink></p> : null}
      {preproductionRuntime() ? <p className="mb-4 rounded-lg border border-slate-200 p-4 text-sm dark:border-slate-700">本地公开数据快照未导入来源和采集记录。下方来源缺失只描述当前本地库，不能据此判断生产数据异常。</p> : null}
      <AdminPageHeader
        eyebrow="Plans"
        title="套餐库"
        description="查看套餐发布状态与数据质量。价格数和极值包含全部平台，仅作后台诊断，不作为公开价格结论。"
        action={<AdminLinkButton href={`/admin/plans/new${productSlug ? `?product=${encodeURIComponent(productSlug)}` : ""}`}>新增套餐</AdminLinkButton>}
      />

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <AdminCard className="dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
          <div className="text-sm font-bold text-slate-500 dark:text-slate-400">套餐总数</div>
          <div className="mt-2 text-2xl font-black text-slate-950 dark:text-slate-50">
            {activeTotal}
          </div>
          <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            活跃套餐数量；归档 {archivedCount} 个另计。
          </div>
        </AdminCard>

        <AdminCard className="dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
          <div className="text-sm font-bold text-slate-500 dark:text-slate-400">已发布</div>
          <div className="mt-2 text-2xl font-black text-slate-950 dark:text-slate-50">
            {activePlans.filter(plan => plan.status === "PUBLISHED").length}
          </div>
          <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            套餐发布状态；不代表价格或来源质量已通过。
          </div>
        </AdminCard>

        <AdminCard className="dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
          <div className="text-sm font-bold text-slate-500 dark:text-slate-400">价格覆盖</div>
          <div className="mt-2 text-2xl font-black text-slate-950 dark:text-slate-50">
            {totalPrices}
          </div>
          <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            套餐下的区域价格数量。
          </div>
        </AdminCard>

        <AdminCard className="dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
          <div className="text-sm font-bold text-slate-500 dark:text-slate-400">有价 / 无价</div>
          <div className="mt-2 text-2xl font-black text-slate-950 dark:text-slate-50">
            {plansWithPrices.length} / {plansWithoutPrices.length}
          </div>
          <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            无价格套餐后续优先补齐。
          </div>
        </AdminCard>
      </div>

      <AdminCard className="dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-950 dark:text-slate-50">
              套餐列表
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              套餐是产品和区域价格之间的中间层，例如 ChatGPT Plus、ChatGPT Pro。
            </p>
          </div>

          <div className="flex gap-4">
            <AdminLink
              href={selectedProduct ? `/admin/products/${selectedProduct.id}/edit` : "/admin/products"}
              className="inline-flex items-center gap-1.5 text-sm font-black text-blue-700 hover:text-blue-900"
            >
              产品库
              <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.8} />
            </AdminLink>

            <AdminLink
              href={selectedProduct ? `/admin/data-quality/${encodeURIComponent(selectedProduct.slug)}` : "/admin/prices"}
              className="inline-flex items-center gap-1.5 text-sm font-black text-blue-700 hover:text-blue-900"
            >
              价格库
              <ArrowRight aria-hidden="true" className="size-4" strokeWidth={1.8} />
            </AdminLink>
          </div>
        </div>

        <div className="mb-5 max-w-full overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <SegmentedControl
            ariaLabel="套餐数据质量"
            value={selectedState}
            tone="blue"
            className="min-w-[520px]"
            items={[
              { label: `全部 ${activeTotal}`, value: "all", href: stateHref("all") },
              ...(["exception", "pending", "not_started", "published"] as AdminOperationalStatus[]).map(
                (status) => ({
                  label: `${status === "published" ? "数据就绪" : adminOperationalStatusMeta[status].label} ${operationalCounts[status]}`,
                  value: status,
                  href: stateHref(status),
                }),
              ),
              { label: `已归档 ${archivedCount}`, value: "archived", href: stateHref("archived") },
            ]}
          />
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="grid min-w-[860px] grid-cols-[minmax(140px,1fr)_minmax(120px,1fr)_100px_90px_100px_110px_110px_70px] gap-0 bg-slate-50 dark:bg-slate-800 px-5 py-3 text-xs font-black uppercase tracking-wide text-slate-400">
            <div>产品</div>
            <div>套餐</div>
            <div>周期</div>
            <div>价格数</div>
            <div>发布 / 数据质量</div>
            <div>最低价</div>
            <div>最高价</div>
            <div>操作</div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
            {visiblePlans.map((plan) => {
              const assessment = assessPlan(plan);
              const prices = plan.regionPrices
                .map((price) => Number(price.priceUsd))
                .filter((value) => !Number.isNaN(value));

              const minPrice = prices.length > 0 ? Math.min(...prices) : null;
              const maxPrice = prices.length > 0 ? Math.max(...prices) : null;

              return (
                <div
                  key={plan.id}
                  className="grid min-w-[860px] grid-cols-[minmax(140px,1fr)_minmax(120px,1fr)_100px_90px_100px_110px_110px_70px] items-center gap-0 px-5 py-4 text-sm"
                >
                  <div>
                    <div className="font-black text-slate-950 dark:text-slate-50">
                      {plan.product.name}
                    </div>
                    <div className="mt-1 font-mono text-xs text-slate-400">
                      {plan.product.slug}
                    </div>
                  </div>

                  <div>
                    <div className="font-black text-slate-800 dark:text-slate-200">
                      {plan.name}
                    </div>
                    <div className="mt-1 font-mono text-xs text-slate-400">
                      {plan.slug}
                    </div>
                  </div>

                  <div className="text-slate-600 dark:text-slate-300">
                    {cycleLabel(String(plan.billingCycle))}
                  </div>

                  <div className="font-bold text-slate-700 dark:text-slate-200">
                    {plan.regionPrices.length}
                  </div>

                  <div>
                    <p className="mb-2 text-xs">{{PUBLISHED:"已发布",REVIEW:"审核中",DRAFT:"草稿",ARCHIVED:"已归档"}[plan.status] || "未知状态"}</p>
                    <AdminStatusBadge
                      status={assessment?.status ?? "not_started"}
                      title={assessment?.reason}
                      dimension="quality"
                    />
                    <div className="mt-1 max-w-[180px] text-xs leading-5 text-slate-500 dark:text-slate-400">
                      {assessment?.reason}
                    </div>
                  </div>

                  <div className="font-black text-emerald-700">
                    {formatUsd(minPrice)}
                  </div>

                  <div className="font-black text-slate-700 dark:text-slate-200">
                    {formatUsd(maxPrice)}
                  </div>
                  <AdminLink href={`/admin/plans/${plan.id}/edit`} className="font-bold text-blue-700 underline-offset-2 hover:underline dark:text-blue-300">编辑</AdminLink>
                </div>
              );
            })}

            {visiblePlans.length === 0 ? (
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

import Link from "next/link";
import { AdminButton, AdminLinkButton } from "../../../components/admin/AdminButton";
import ManualCollectionProgressForm from "./ManualCollectionProgressForm";
import ObservationReviewActions from "./ObservationReviewActions";
import {
  diagnosePendingProductGroup,
  type PendingProductDiagnosisLevel,
} from "./pending-product-diagnosis";
import type { CollectorStatusRow, PendingProductGroup } from "./types";
import {
  PriceEvidencePanel,
  formatDate,
  formatLocal,
  formatUsd,
  platformLabel,
} from "./review-display";
import { reviewReasonAction, reviewReasonLabel } from "./review-reason-copy";

type PendingProductReviewSectionProps = {
  collectorStatus: CollectorStatusRow | null;
  productQuery: string;
  pendingPage: number;
  pendingTotalPages: number;
  pendingPageSize: number;
  detailRowsPerProduct: number;
  detailRowsLimited: boolean;
  pendingProductTotal: number;
  pendingTotal: number;
  historyPage: number;
  pendingProductGroups: PendingProductGroup[];
};

function diagnosisClassName(level: PendingProductDiagnosisLevel) {
  if (level === "danger") {
    return {
      panel: "border-red-100 bg-red-50 text-red-950",
      badge: "bg-white text-red-700 ring-red-200",
    };
  }

  if (level === "warning") {
    return {
      panel: "border-amber-100 bg-amber-50 text-amber-950",
      badge: "bg-white text-amber-700 ring-amber-200",
    };
  }

  if (level === "good") {
    return {
      panel: "border-emerald-100 bg-emerald-50 text-emerald-950",
      badge: "bg-white text-emerald-700 ring-emerald-200",
    };
  }

  return {
    panel: "border-blue-100 bg-blue-50 text-blue-950",
    badge: "bg-white text-blue-700 ring-blue-200",
  };
}

export function PendingProductReviewSection({
  collectorStatus,
  productQuery,
  pendingPage,
  pendingTotalPages,
  pendingPageSize,
  detailRowsPerProduct,
  detailRowsLimited,
  pendingProductTotal,
  pendingTotal,
  historyPage,
  pendingProductGroups,
}: PendingProductReviewSectionProps) {
  const buildPendingPageHref = (nextPage: number) => {
    const query = new URLSearchParams();

    if (nextPage > 1) query.set("page", String(nextPage));
    if (historyPage > 1) query.set("historyPage", String(historyPage));
    if (productQuery) query.set("q", productQuery);

    const value = query.toString();
    return value ? `/admin/review?${value}` : "/admin/review";
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-950">异常待决价格</h2>
          <p className="mt-1 text-xs text-slate-500">
            按产品聚合展示，不再按套餐或地区逐条铺开。当前第 {pendingPage} / {pendingTotalPages} 页，每页{" "}
            {pendingPageSize} 个产品；共 {pendingProductTotal} 个产品、{pendingTotal} 条待处理观测。
          </p>
          <p className="mt-1 text-xs leading-5 text-blue-700">
            默认处理方式是自动补采、稳定性审核和规则修正；采集证据链接只用于排查解析问题，不要求人工逐国打开 App Store 核验。
          </p>
          {detailRowsLimited ? (
            <p className="mt-1 text-xs text-slate-400">
              为了让后台列表更快，默认每个产品只展示最近 {detailRowsPerProduct} 条异常明细；搜索具体产品后可查看更多明细。
            </p>
          ) : null}
          {collectorStatus ? (
            <p className="mt-2 text-xs text-slate-400">
              App Store 采集器：{collectorStatus.status}；下次执行 {formatDate(collectorStatus.next_run_at)}
              ；最近结果 {collectorStatus.latest_run_status ?? "暂无"}。
            </p>
          ) : null}
        </div>
        <form action="/admin/review" className="flex shrink-0 items-center gap-2">
          <input
            type="search"
            name="q"
            defaultValue={productQuery}
            placeholder="搜索产品，如 Netflix"
            className="h-9 w-56 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10"
          />
          <AdminButton type="submit" size="sm">
            搜索
          </AdminButton>
          {productQuery ? (
            <AdminLinkButton
              href="/admin/review"
              variant="secondary"
              size="sm"
            >
              清除
            </AdminLinkButton>
          ) : null}
        </form>
      </div>

      {pendingProductGroups.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-slate-500">
          暂无待审核价格观测。
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {pendingProductGroups.map((productGroup) => {
            const hasIsolatedAnomaly = (productGroup.blockedCount ?? 0) > 0;
            const diagnosis = diagnosePendingProductGroup(productGroup);
            const diagnosisClasses = diagnosisClassName(diagnosis.level);
            const buttonLabel = hasIsolatedAnomaly
              ? "规则已修，重新采集"
              : productGroup.hasFreshSuccess
                ? "12小时内已采集，仍要重跑"
                : "只补采这个产品";

            return (
              <details key={productGroup.productSlug} className="group">
                <summary className="flex cursor-pointer list-none flex-col gap-4 px-4 py-4 hover:bg-slate-50 xl:flex-row xl:items-center xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-950">
                        {productGroup.productName ?? productGroup.productSlug}
                      </h3>
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                        {productGroup.productSlug}
                      </span>
                    </div>
                    <div className="mt-2 grid gap-2 text-xs text-slate-600 md:grid-cols-4">
                      <span className="rounded-lg bg-slate-50 px-2.5 py-1.5 ring-1 ring-slate-100">
                        {productGroup.planCount ?? productGroup.plans.length} 个套餐 / {productGroup.countryCount ?? 0} 个地区
                      </span>
                      <span className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-amber-700 ring-1 ring-amber-100">
                        待处理 {productGroup.pendingCount ?? productGroup.rows.length}
                      </span>
                      <span className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-emerald-700 ring-1 ring-emerald-100">
                        已通过 {productGroup.approvedCount ?? 0}
                      </span>
                      <span className="rounded-lg bg-red-50 px-2.5 py-1.5 text-red-700 ring-1 ring-red-100">
                        隔离/拒绝 {(productGroup.blockedCount ?? 0) + (productGroup.rejectedCount ?? 0)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-500">
                      {productGroup.waitingCount ? <span>待补样本 {productGroup.waitingCount}</span> : null}
                      {productGroup.changedCount ? <span>价格变化 {productGroup.changedCount}</span> : null}
                      {productGroup.lowConfidenceCount ? <span>低可信 {productGroup.lowConfidenceCount}</span> : null}
                      {productGroup.ignoredCount ? <span>已忽略 {productGroup.ignoredCount}</span> : null}
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      最近成功采集：{formatDate(productGroup.latestSuccessAt ?? null)}
                      {productGroup.hasFreshSuccess ? " · 12 小时内已更新" : ""}
                    </p>
                    <div className={`mt-3 rounded-xl border px-3 py-2 ${diagnosisClasses.panel}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[11px] font-bold ring-1 ${diagnosisClasses.badge}`}
                        >
                          系统结论：{diagnosis.label}
                        </span>
                        <span className="text-xs font-bold">{diagnosis.title}</span>
                      </div>
                      <p className="mt-1 text-xs leading-5 opacity-80">{diagnosis.detail}</p>
                      <p className="mt-1 text-xs font-bold">下一步：{diagnosis.nextAction}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <ManualCollectionProgressForm
                      productSlug={productGroup.productSlug}
                      buttonLabel={buttonLabel}
                      pendingLabel="正在补采这个产品"
                    />
                    <Link
                      href={`/admin/data-quality/${encodeURIComponent(productGroup.productSlug)}`}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      数据诊断
                    </Link>
                    <span className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 group-open:bg-slate-50">
                      查看异常明细
                    </span>
                  </div>
                </summary>

                <div className="grid gap-3 bg-slate-50/60 px-4 pb-4 md:grid-cols-2 xl:grid-cols-4">
                  {productGroup.plans.map((planGroup) => (
                    <div
                      key={`${productGroup.productSlug}-${planGroup.planSlug}`}
                      className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                    >
                      <div className="flex items-center justify-between gap-4 px-4 py-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-950">
                            {planGroup.planName ?? planGroup.planSlug}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {planGroup.planSlug} · 显示 {planGroup.rows.length} 条最新明细
                          </div>
                        </div>
                        <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">
                          待审核 {planGroup.rows.length}
                        </span>
                      </div>

                      <div className="max-h-[560px] space-y-2 overflow-y-auto border-t border-slate-100 p-3">
                        {planGroup.rows.map((row) => (
                          <div key={row.id} className="rounded-lg border border-slate-100 bg-white p-2.5 shadow-sm">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="text-xs font-semibold text-slate-950">
                                  {row.country_name_zh ?? row.country_name_en ?? row.country_code}
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                                  <span>{row.country_code}</span>
                                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">
                                    {platformLabel(row.platform)}
                                  </span>
                                  <span>可信度 {row.confidence_score ?? "-"}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs font-semibold text-slate-950">
                                  {row.observed_price_text ?? formatLocal(row.observed_local_price, row.observed_currency)}
                                </div>
                                <div className="mt-1 text-[11px] text-slate-500">
                                  {formatUsd(row.observed_price_usd)}
                                </div>
                              </div>
                            </div>

                            <div className="mt-2 rounded-md bg-amber-50 px-2 py-1.5 text-[11px] leading-4 text-amber-800 ring-1 ring-inset ring-amber-100">
                              <div className="font-semibold">
                                拦截原因：{reviewReasonLabel(row.review_reason_code)}
                              </div>
                              <div className="mt-0.5 text-amber-700">
                                {reviewReasonAction(row.review_reason_code)}
                              </div>
                            </div>
                            <PriceEvidencePanel row={row} />

                            {row.review_note ? (
                              <p className="mt-1.5 line-clamp-1 text-[11px] leading-4 text-slate-400">
                                原始规则说明：{row.review_note}
                              </p>
                            ) : null}

                            <div className="mt-2 flex items-center justify-between gap-2">
                              {row.source_url ? (
                                <a
                                  href={row.source_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                                >
                                  查看采集证据
                                </a>
                              ) : (
                                <span className="text-xs text-slate-400">无来源链接</span>
                              )}
                              <ObservationReviewActions observationId={row.id} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      )}

      {pendingTotalPages > 1 ? (
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
          <div className="text-slate-500">
            共 {pendingProductTotal} 个产品，{pendingTotal} 条待处理观测
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={buildPendingPageHref(Math.max(1, pendingPage - 1))}
              aria-disabled={pendingPage <= 1}
              className={`rounded-lg border px-3 py-1.5 font-medium ${
                pendingPage <= 1
                  ? "pointer-events-none border-slate-100 text-slate-300"
                  : "border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              上一页
            </Link>
            <span className="text-slate-500">
              {pendingPage} / {pendingTotalPages}
            </span>
            <Link
              href={buildPendingPageHref(Math.min(pendingTotalPages, pendingPage + 1))}
              aria-disabled={pendingPage >= pendingTotalPages}
              className={`rounded-lg border px-3 py-1.5 font-medium ${
                pendingPage >= pendingTotalPages
                  ? "pointer-events-none border-slate-100 text-slate-300"
                  : "border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              下一页
            </Link>
          </div>
        </div>
      ) : null}
    </section>
  );
}

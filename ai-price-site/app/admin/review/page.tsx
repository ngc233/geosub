import ManualCollectionProgressForm from "./ManualCollectionProgressForm";
import ObservationReviewActions from "./ObservationReviewActions";
import Link from "next/link";
import {
  PriceEvidencePanel,
  formatDate,
  formatLocal,
  formatUsd,
  platformLabel,
  reviewReasonAction,
  reviewReasonLabel,
  statusBadge,
  statusLabel,
} from "./review-display";
import { getReviewPageData } from "./queries";
import { ReviewOverviewSections } from "./ReviewOverviewSections";

export const dynamic = "force-dynamic";

export default async function ReviewPage({
  searchParams,
}: {
  searchParams?: Promise<{
    collectionQueued?: string;
    collectionRun?: string;
    collectionScope?: string;
    discoveryPromoted?: string;
    discoveryProduct?: string;
    discoveryJobs?: string;
    page?: string;
    historyPage?: string;
    q?: string;
  }>;
}) {
  const params = searchParams ? await searchParams : {};
  const queuedCount =
    params.collectionQueued === undefined ? null : Number(params.collectionQueued);
  const collectionRun = params.collectionRun ?? null;
  const collectionScope = params.collectionScope ?? null;
  const productQuery = String(params.q ?? "").trim();
  const discoveryPromoted = params.discoveryPromoted === "1";
  const discoveryProduct = String(params.discoveryProduct ?? productQuery).trim();
  const discoveryJobs = Math.max(0, Number(params.discoveryJobs ?? 0) || 0);
  const pendingPage = Math.max(1, Number(params.page ?? 1) || 1);
  const historyPage = Math.max(1, Number(params.historyPage ?? 1) || 1);
  const {
    pendingPageSize,
    historyPageSize,
    pendingProductTotal,
    pendingTotal,
    pendingTotalPages,
    historyTotal,
    historyTotalPages,
    approvedCount,
    ignoredCount,
    rejectedCount,
    collectorStatus,
    latestAutoReview,
    selectedProductCollector,
    selectedProductName,
    selectedProductSlug,
    selectedAppStoreJobCount,
    evidenceHealth,
    topPendingReason,
    diagnosisProductCount,
    diagnosisPlanCount,
    pendingDiagnosisRows,
    evidenceSummaryRows,
    historyRows,
    autoReviewReasonRows,
    pendingProductGroups,
  } = await getReviewPageData({
    productQuery,
    discoveryProduct,
    discoveryJobs,
    pendingPage,
    historyPage,
  });

  const buildPageHref = ({
    page = pendingPage,
    nextHistoryPage = historyPage,
  }: {
    page?: number;
    nextHistoryPage?: number;
  }) => {
    const query = new URLSearchParams();

    if (page > 1) query.set("page", String(page));
    if (nextHistoryPage > 1) query.set("historyPage", String(nextHistoryPage));
    if (productQuery) query.set("q", productQuery);

    const value = query.toString();
    return value ? `/admin/review?${value}` : "/admin/review";
  };

  return (
    <div className="space-y-6">
      <ReviewOverviewSections
        discoveryPromoted={discoveryPromoted}
        selectedProductCollector={selectedProductCollector}
        selectedProductName={selectedProductName}
        selectedProductSlug={selectedProductSlug}
        selectedAppStoreJobCount={selectedAppStoreJobCount}
        pendingTotal={pendingTotal}
        approvedCount={approvedCount}
        ignoredCount={ignoredCount}
        rejectedCount={rejectedCount}
        queuedCount={queuedCount}
        collectionRun={collectionRun}
        collectionScope={collectionScope}
        latestAutoReview={latestAutoReview}
        autoReviewReasonRows={autoReviewReasonRows}
        diagnosisProductCount={diagnosisProductCount}
        diagnosisPlanCount={diagnosisPlanCount}
        topPendingReason={topPendingReason}
        pendingDiagnosisRows={pendingDiagnosisRows}
        evidenceHealth={evidenceHealth}
        evidenceSummaryRows={evidenceSummaryRows}
      />

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-950">异常待决价格</h2>
            <p className="mt-1 text-xs text-slate-500">
              按产品聚合展示，不再按套餐或地区逐条铺开。当前第 {pendingPage} / {pendingTotalPages} 页，每页 {pendingPageSize} 个产品；共 {pendingProductTotal} 个产品、{pendingTotal} 条待处理观测。
            </p>
            {collectorStatus ? (
              <p className="mt-2 text-xs text-slate-400">
                App Store 采集器：{collectorStatus.status}；下次执行 {formatDate(collectorStatus.next_run_at)}；最近结果 {collectorStatus.latest_run_status ?? "暂无"}。
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
            <button
              type="submit"
              className="h-9 rounded-lg border border-slate-200 bg-slate-950 px-3 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              搜索
            </button>
            {productQuery ? (
              <Link
                href="/admin/review"
                className="h-9 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                清除
              </Link>
            ) : null}
          </form>
        </div>

        {pendingProductGroups.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">
            暂无待审核价格观测。
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {pendingProductGroups.map((productGroup) => (
              <details key={productGroup.productSlug} className="group">
                {/*
                  Products with isolated anomalies should remain re-runnable after parser/spec fixes.
                  Freshness only disables clean products that were just collected successfully.
                */}
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 hover:bg-slate-50">
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
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {(() => {
                      const hasIsolatedAnomaly = (productGroup.blockedCount ?? 0) > 0;
                      const disableCollection = Boolean(productGroup.hasFreshSuccess && !hasIsolatedAnomaly);
                      const buttonLabel = disableCollection
                        ? "已采集，暂不重复"
                        : hasIsolatedAnomaly
                          ? "规则已修，重新采集"
                          : "只补采这个产品";

                      return (
                    <ManualCollectionProgressForm
                      productSlug={productGroup.productSlug}
                      buttonLabel={buttonLabel}
                      pendingLabel="正在补采这个产品"
                      disabled={disableCollection}
                    />
                      );
                    })()}
                    <span className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 group-open:bg-slate-50">
                      查看异常明细
                    </span>
                  </div>
                </summary>

                <div className="grid gap-3 bg-slate-50/60 px-4 pb-4 md:grid-cols-2 xl:grid-cols-4">
                  {productGroup.plans.map((planGroup) => (
                    <div key={`${productGroup.productSlug}-${planGroup.planSlug}`} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                      <div className="flex items-center justify-between gap-4 px-4 py-3">
                        <div>
                          <div className="text-sm font-semibold text-slate-950">
                            {planGroup.planName ?? planGroup.planSlug}
                          </div>
                          <div className="mt-1 text-xs text-slate-500">
                            {planGroup.planSlug} · {planGroup.rows.length} 个地区待处理
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
                                  <span>可信度 {row.confidence_score ?? "—"}</span>
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
                                  打开来源
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
            ))}
          </div>
        )}

        {pendingTotalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
            <div className="text-slate-500">
              共 {pendingProductTotal} 个产品，{pendingTotal} 条待处理观测
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={buildPageHref({ page: Math.max(1, pendingPage - 1) })}
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
                href={buildPageHref({ page: Math.min(pendingTotalPages, pendingPage + 1) })}
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

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-950">最近审核历史</h2>
            <p className="mt-1 text-xs text-slate-500">
              按时间倒序分页显示已通过、已忽略或已拒绝记录。当前第 {historyPage} / {historyTotalPages} 页，每页 {historyPageSize} 条。
            </p>
          </div>
        </div>

        {historyRows.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">
            暂无审核历史。
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">产品</th>
                  <th className="px-4 py-3 font-medium">套餐</th>
                  <th className="px-4 py-3 font-medium">地区</th>
                  <th className="px-4 py-3 font-medium">平台</th>
                  <th className="px-4 py-3 font-medium">观测价</th>
                  <th className="px-4 py-3 font-medium">审核状态</th>
                  <th className="px-4 py-3 font-medium">正式表</th>
                  <th className="px-4 py-3 font-medium">更新时间</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {historyRows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-950">{row.product_name ?? row.product_slug}</div>
                      <div className="text-xs text-slate-500">{row.product_slug}</div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-950">{row.plan_name ?? row.plan_slug}</div>
                      <div className="text-xs text-slate-500">{row.plan_slug}</div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-950">{row.country_name_zh ?? row.country_name_en ?? row.country_code}</div>
                      <div className="text-xs text-slate-500">{row.country_code}</div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                        {platformLabel(row.platform)}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-950">
                        {row.observed_price_text ?? formatLocal(row.observed_local_price, row.observed_currency)}
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatUsd(row.observed_price_usd)}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusBadge(row.review_status)}`}>
                        {statusLabel(row.review_status)}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-xs text-slate-600">
                      {row.region_price_status ? (
                        <div>
                          <div className="font-medium text-slate-900">{row.region_price_status}</div>
                          <div>{row.promoted_platform ?? "—"} · {row.promoted_data_quality ?? "—"}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">未写入</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-xs text-slate-500">
                      {formatDate(row.updated_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {historyTotalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
            <div className="text-slate-500">共 {historyTotal} 条审核历史</div>
            <div className="flex items-center gap-2">
              <Link
                href={buildPageHref({ nextHistoryPage: Math.max(1, historyPage - 1) })}
                aria-disabled={historyPage <= 1}
                className={`rounded-lg border px-3 py-1.5 font-medium ${
                  historyPage <= 1
                    ? "pointer-events-none border-slate-100 text-slate-300"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                上一页
              </Link>
              <span className="text-slate-500">
                {historyPage} / {historyTotalPages}
              </span>
              <Link
                href={buildPageHref({ nextHistoryPage: Math.min(historyTotalPages, historyPage + 1) })}
                aria-disabled={historyPage >= historyTotalPages}
                className={`rounded-lg border px-3 py-1.5 font-medium ${
                  historyPage >= historyTotalPages
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
    </div>
  );
}

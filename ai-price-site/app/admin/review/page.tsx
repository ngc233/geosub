import AdminPipelineSteps from "../../../components/admin/AdminPipelineSteps";
import ManualCollectionProgressForm from "./ManualCollectionProgressForm";
import ObservationReviewActions from "./ObservationReviewActions";
import Link from "next/link";
import {
  PriceEvidencePanel,
  evidenceBadgeClass,
  evidenceStatusLabel,
  evidenceTierLabel,
  formatDate,
  formatLocal,
  formatUsd,
  platformLabel,
  reviewReasonAction,
  reviewReasonLabel,
  statusBadge,
  statusLabel,
  toNumber,
} from "./review-display";
import { getReviewPageData } from "./queries";

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
      <header className="border-b border-slate-200 pb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
          价格采集 · 第 2 步
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
          价格采集审核
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          这里是主工作台：按产品启动 App Store 采集，系统随后自动审核稳定价格；异常、缺样本或冲突数据只在这里集中解释。
        </p>
      </header>

      <AdminPipelineSteps currentStep="review" />

      {discoveryPromoted || selectedProductCollector ? (
        <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex rounded-full bg-white px-3 py-1 text-xs font-semibold text-blue-700 ring-1 ring-blue-100">
                {discoveryPromoted ? "刚从线索入口加入" : "产品采集入口"}
              </div>
              <h2 className="mt-3 text-lg font-semibold text-slate-950">
                {selectedProductName || "这个产品"} 已进入服务库
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {selectedAppStoreJobCount > 0
                  ? `已准备 ${selectedAppStoreJobCount} 个 App Store 采集任务。现在可以直接跑一次采集，完成后系统会自动审核并把稳定价格写入正式库。`
                  : "还没有识别到 App Store 采集任务。请先回产品库补充 App Store 链接，再回来采集。"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <ManualCollectionProgressForm
                productSlug={selectedProductSlug}
                buttonLabel={`立即采集 ${selectedProductName || "该产品"}`}
                pendingLabel="正在采集并审核"
                disabled={!selectedProductSlug || selectedAppStoreJobCount <= 0}
              />
              <Link
                href="/admin/products"
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                查看服务库
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">待审核价格观测</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{pendingTotal}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">已通过</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{approvedCount}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">已忽略</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{ignoredCount}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-slate-500">已拒绝</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">{rejectedCount}</p>
        </div>
      </section>

      <section className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-sm font-semibold text-white">
            i
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">采集和审核已合并到这个工作台</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              补采不再默认扫全部产品。请在下方按产品点击“只补采这个产品”；系统会跳过 12 小时内已经成功采集过的 App Store 任务，避免重复请求。
            </p>
          </div>
        </div>
      </section>

      {queuedCount !== null ? (
        <section
          className={[
            "rounded-xl border p-4 text-sm",
            collectionRun === "failed"
              ? "border-red-200 bg-red-50 text-red-800"
              : collectionRun === "cooldown"
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-emerald-200 bg-emerald-50 text-emerald-800",
          ].join(" ")}
        >
          {collectionRun === "succeeded"
            ? `已立即执行${collectionScope ? ` ${collectionScope} 的` : ""} ${queuedCount} 个 App Store 补采任务，并完成真实稳定性审核。下方“最新审核结果”会显示正式入库数量。`
            : collectionRun === "cooldown"
              ? "已收到补采请求，但相关任务 2 分钟内刚执行过，本次进入冷却保护。"
              : collectionRun === "fresh"
                ? `${collectionScope ? `${collectionScope} ` : ""}12 小时内已经成功采集过，本次跳过补采；可以等待后台定时任务或后续再手动更新。`
              : collectionRun === "failed"
                ? "补采任务已排队，但立即执行失败；后台定时任务仍会继续处理，请查看采集任务页的失败原因。"
              : `已处理 ${queuedCount} 个 App Store 补采任务。`}
        </section>
      ) : null}

      {latestAutoReview ? (
        <section
          className={[
            "overflow-hidden rounded-xl border bg-white shadow-sm",
            latestAutoReview.status === "failed"
              ? "border-red-200"
              : latestAutoReview.dry_run
                ? "border-amber-200"
                : "border-emerald-200",
          ].join(" ")}
        >
          <div
            className={[
              "flex flex-col gap-4 px-4 py-4 md:flex-row md:items-start md:justify-between",
              latestAutoReview.status === "failed"
                ? "bg-red-50"
                : latestAutoReview.dry_run
                  ? "bg-amber-50"
                  : "bg-emerald-50",
            ].join(" ")}
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-950">最新审核结果</h2>
                <span
                  className={[
                    "rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
                    latestAutoReview.status === "failed"
                      ? "bg-red-100 text-red-700 ring-red-200"
                      : latestAutoReview.dry_run
                        ? "bg-amber-100 text-amber-800 ring-amber-200"
                        : "bg-emerald-100 text-emerald-700 ring-emerald-200",
                  ].join(" ")}
                >
                  {latestAutoReview.status === "failed"
                    ? "执行失败"
                    : latestAutoReview.dry_run
                      ? "仅预检，未入库"
                      : "已真实入库"}
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                {latestAutoReview.dry_run
                  ? "这次只计算了可通过数量，没有写入正式价格。现在按钮已改为真实审核。"
                  : "自动通过的观测已写入正式价格库；未通过的会进入自动补采、隔离或等待稳定，不再要求逐条人工核验。"}
              </p>
              {latestAutoReview.error_message ? (
                <p className="mt-2 text-xs font-medium text-red-700">{latestAutoReview.error_message}</p>
              ) : null}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center md:min-w-[360px]">
              <div className="rounded-lg bg-white/80 px-3 py-2 ring-1 ring-inset ring-white/70">
                <div className="text-xs text-slate-500">检查组</div>
                <div className="mt-1 text-lg font-semibold tabular-nums text-slate-950">
                  {latestAutoReview.checked_groups}
                </div>
              </div>
              <div className="rounded-lg bg-white/80 px-3 py-2 ring-1 ring-inset ring-white/70">
                <div className="text-xs text-slate-500">正式入库</div>
                <div className="mt-1 text-lg font-semibold tabular-nums text-emerald-700">
                  {latestAutoReview.dry_run ? 0 : latestAutoReview.auto_approved_count}
                </div>
              </div>
              <div className="rounded-lg bg-white/80 px-3 py-2 ring-1 ring-inset ring-white/70">
                <div className="text-xs text-slate-500">需人工</div>
                <div className="mt-1 text-lg font-semibold tabular-nums text-amber-700">
                  {latestAutoReview.manual_review_count}
                </div>
              </div>
            </div>
          </div>

          {autoReviewReasonRows.length > 0 ? (
            <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
              {autoReviewReasonRows.map((row) => (
                <div key={`${row.decision}-${row.reason_code}`} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-950">
                        {reviewReasonLabel(row.reason_code)}
                      </div>
                      <div className="mt-1 text-xs leading-5 text-slate-500">
                        {reviewReasonAction(row.reason_code)}
                      </div>
                    </div>
                    <span
                      className={[
                        "shrink-0 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
                        row.decision === "auto_approve"
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                          : "bg-amber-50 text-amber-700 ring-amber-200",
                      ].join(" ")}
                    >
                      {row.decision === "auto_approve" ? "可自动过" : "被拦截"}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                    <span>{row.group_count} 组</span>
                    <span>{row.observation_count} 条观测</span>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-950">为什么还有这么多没上线？</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
                这里不是普通队列，而是“自动审核不敢直接上线”的异常池。当前主要集中在{" "}
                <span className="font-semibold text-slate-950">
                  {diagnosisProductCount} 个产品、{diagnosisPlanCount} 个套餐
                </span>
                ；系统已经把稳定样本写入正式库，剩下的是自动规则暂时拦住、等待补采或交叉验证的项目。
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                换句话说：数量多不是因为审核没跑，而是因为这些价格碰到了保护规则。正常处理方式是继续自动补采和规则校验；人工通过只作为极少数强制覆盖。
              </p>
            </div>
            {topPendingReason ? (
              <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-inset ring-amber-200 md:min-w-[280px]">
                <div className="text-xs font-medium text-amber-700">最大阻塞原因</div>
                <div className="mt-1 font-semibold">{reviewReasonLabel(topPendingReason.reason_code)}</div>
                <div className="mt-1 text-xs leading-5 text-amber-700">
                  {topPendingReason.row_count} 条，涉及 {topPendingReason.country_count} 个地区
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {pendingDiagnosisRows.length > 0 ? (
          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
            {pendingDiagnosisRows.map((row) => (
              <div
                key={`${row.product_slug}-${row.plan_slug}-${row.reason_code}`}
                className="rounded-lg border border-slate-200 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-950">
                      {row.product_name ?? row.product_slug}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {row.plan_name ?? row.plan_slug} · {row.country_count} 个地区
                    </div>
                  </div>
                  <span className="shrink-0 rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200">
                    {row.row_count} 条
                  </span>
                </div>
                <div className="mt-3 rounded-md bg-slate-50 px-2.5 py-2">
                  <div className="text-xs font-semibold text-slate-700">
                    {reviewReasonLabel(row.reason_code)}
                  </div>
                  <div className="mt-1 text-xs leading-5 text-slate-500">
                    {reviewReasonAction(row.reason_code)}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span>异常折算范围（未入正式库）</span>
                  <span className="font-medium text-slate-700">
                    {formatUsd(row.min_usd)} - {formatUsd(row.max_usd)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            当前没有需要解释的异常待审记录。
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-4">
          <h2 className="text-sm font-semibold text-slate-950">价格证据质量概览</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            最近 14 天的采集证据按状态归类。这里看的是证据链强弱，不是竞站是否一致。
          </p>
        </div>

        <div className="grid gap-3 border-b border-slate-100 p-4 md:grid-cols-4">
          <div className="rounded-lg bg-emerald-50 px-3 py-3 ring-1 ring-inset ring-emerald-100">
            <div className="text-xs font-medium text-emerald-700">页面多数票</div>
            <div className="mt-1 text-xl font-semibold text-emerald-950">
              {evidenceHealth.modal_consensus_count}
            </div>
          </div>
          <div className="rounded-lg bg-red-50 px-3 py-3 ring-1 ring-inset ring-red-100">
            <div className="text-xs font-medium text-red-700">系统隔离</div>
            <div className="mt-1 text-xl font-semibold text-red-950">
              {evidenceHealth.blocked_anomaly_count}
            </div>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-3 ring-1 ring-inset ring-slate-200">
            <div className="text-xs font-medium text-slate-600">旧样本</div>
            <div className="mt-1 text-xl font-semibold text-slate-950">
              {evidenceHealth.old_sample_count}
            </div>
          </div>
          <div className="rounded-lg bg-amber-50 px-3 py-3 ring-1 ring-inset ring-amber-100">
            <div className="text-xs font-medium text-amber-700">汇率过期</div>
            <div className="mt-1 text-xl font-semibold text-amber-950">
              {evidenceHealth.stale_fx_count}
            </div>
          </div>
        </div>

        {evidenceSummaryRows.length > 0 ? (
          <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
            {evidenceSummaryRows.map((row) => (
              <div
                key={`${row.evidence_status}-${row.evidence_tier}`}
                className="rounded-lg border border-slate-200 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-950">
                      {evidenceStatusLabel(row.evidence_status)}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {evidenceTierLabel(row.evidence_tier)}
                    </div>
                  </div>
                  <span
                    className={[
                      "rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset",
                      evidenceBadgeClass(row.evidence_status),
                    ].join(" ")}
                  >
                    {row.observation_count} 条
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span>{row.country_count} 个地区</span>
                  <span>均分 {toNumber(row.average_score)?.toFixed(1) ?? "—"}</span>
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  最近：{formatDate(row.latest_observed_at)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            最近 14 天暂无采集证据。
          </div>
        )}
      </section>

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

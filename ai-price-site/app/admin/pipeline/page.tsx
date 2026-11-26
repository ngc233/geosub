import AdminProductLogo from "@/components/admin/AdminProductLogo";
import { productNextAction } from "@/lib/admin-product-next-action";
import { withAdminReturnTo } from "@/lib/admin-workflow-context";
import { adminButtonClassName } from "@/components/admin/AdminButton";
import AdminLink from "@/components/admin/AdminLink";
import { AdminCard, AdminPageHeader, AdminSectionHeader } from "../../../components/admin/AdminCard";
import { AdminLinkButton } from "../../../components/admin/AdminButton";
import AdminPipelineSteps from "../../../components/admin/AdminPipelineSteps";
import AdminStatusBadge from "../../../components/admin/AdminStatusBadge";
import {
  createAdminOperationalCounts,
  type AdminOperationalStatus,
} from "../../../lib/admin-operational-status";
import {
  getPipelineGrowthSignals,
  type PipelineGrowthSignal,
} from "../../../lib/admin-pipeline-growth";
import { measureAdminWorkload } from "../../../lib/admin-performance";
import type {
  PipelineProductRow,
  PipelineStats,
} from "../../../lib/admin-product-summary-model";
import ManualCollectionProgressForm from "../review/ManualCollectionProgressForm";
import BatchCollectionPanel from "./BatchCollectionPanel";
import { isCollectorReviewFailure } from "../collector-jobs/execution-status";
import AdminSegmentedControl from "../../../components/admin/AdminSegmentedControl";
import AdminFilterBar from "../../../components/admin/AdminFilterBar";
import AdminPagination from "../../../components/admin/AdminPagination";
import { buildAdminListHref } from "../../../lib/admin-list-params";
import {
  categoryLabel,
  emptyPipelineStats,
  formatDate,
  getErrorMessage,
  getPipelineOperationalStatus,
  getPipelineRecommendation,
  getPipelineState,
  getPublishReadiness,
  joinClasses,
  pipelineCategories,
  pipelineStages,
  productStatusLabel,
  runStatusLabel,
  toNumber,
  toQueryCount,
} from "./model";
import { getPipelinePageProducts, getPipelineStats } from "./queries";

export const dynamic = "force-dynamic";

function PipelineRecommendation({ stats }: { stats: PipelineStats }) {
  const recommendation = getPipelineRecommendation(stats);

  return (
    <div className={`mb-6 rounded-xl border p-5 ${recommendation.className}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-sm font-semibold">系统建议</div>
          <h2 className="mt-1 text-base font-semibold text-admin-text">{recommendation.title}</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 opacity-80">
            {recommendation.body}
          </p>
        </div>
        <AdminLink
          href={recommendation.href}
          className={adminButtonClassName({ variant: "secondary", size: "md", className: "" })}
        >
          {recommendation.action}
        </AdminLink>
      </div>
    </div>
  );
}

function PipelineStateBadge({ row }: { row: PipelineProductRow }) {
  const state = getPipelineState(row);
  const operationalStatus = getPipelineOperationalStatus(row);

  return (
    <AdminStatusBadge
      status={operationalStatus}
      title={state.detail}
    />
  );
}

function ProductPipelineCard({
  row,
  growthSignal,
  returnTo,
}: {
  row: PipelineProductRow;
  growthSignal?: PipelineGrowthSignal;
  returnTo: string;
}) {
  const state = getPipelineState(row);
  const readiness = getPublishReadiness(row);
  const reviewFailed = isCollectorReviewFailure({ ...row, error_message: row.latest_run_error });
  const pendingCount = toNumber(row.pending_observation_count);
  const blockedCount = toNumber(row.blocked_observation_count);
  const appStoreJobs = toNumber(row.app_store_job_count);
  const webJobs = toNumber(row.official_web_job_count);
  const stalePublishedCount = toNumber(row.published_stale_price_count);
  const next = productNextAction({
    id: row.product_id,
    slug: row.product_slug,
    appStoreJobs,
    webJobs,
    runStatus: row.latest_run_status,
    pending: pendingCount,
    blocked: blockedCount,
    prices: toNumber(row.published_price_count),
    stale: stalePublishedCount,
    due: toNumber(row.due_job_count),
  });

  return (
    <div className="rounded-admin-card border border-admin-border bg-admin-surface p-5 shadow-sm shadow-admin-shadow/50 dark:border-admin-border-strong dark:bg-admin-surface">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <AdminProductLogo slug={row.product_slug} name={row.product_name} size="md" />
            <h3 className="min-w-0 break-words text-lg font-semibold text-admin-text dark:text-admin-text">{row.product_name}</h3>
            <span className="rounded-full bg-admin-chip px-2.5 py-1 text-xs font-semibold text-admin-text-secondary dark:bg-admin-chip dark:text-admin-text-secondary">
              {categoryLabel(row.product_category)}
            </span>
            <PipelineStateBadge row={row} />
          </div>
          <div className="mt-1 font-mono text-xs text-admin-text-faint">
            {row.product_slug} · {row.provider || "未填服务商"} · {productStatusLabel(row.product_status)}
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-admin-text-secondary dark:text-admin-text-secondary">
            <span className="font-semibold text-admin-text dark:text-admin-text-body">{state.label}：</span>
            {state.detail}
          </p>
        </div>

        <div className="max-w-sm space-y-2" data-primary-workflow-action={next.kind}>
          {next.kind === "collect" ? (
            <ManualCollectionProgressForm productSlug={row.product_slug} buttonLabel={next.label} pendingLabel="正在提交采集请求" />
          ) : (
            <AdminLinkButton href={withAdminReturnTo(next.href, returnTo)} size="sm">{next.label}</AdminLinkButton>
          )}
          <p className="text-xs leading-5 text-admin-text-muted">
            {reviewFailed ? "已有采集证据；修复审核错误后复用证据重试，无需重复采集。" : next.detail}
          </p>
          {appStoreJobs > 0 && next.kind !== "collect" && next.kind !== "progress" ? (
            <details>
              <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-lg px-2 text-xs text-admin-text-muted">
                需要重新采集？
              </summary>
              <p className="mb-2 text-xs text-admin-text-muted">先核对异常或修正来源；重复采集不会跳过稳定样本要求。</p>
              <ManualCollectionProgressForm productSlug={row.product_slug} buttonLabel="修正后补采" pendingLabel="正在提交补采请求" />
            </details>
          ) : null}
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <div className="rounded-admin-card bg-admin-surface-subtle p-3 dark:bg-admin-chip">
          <div className="text-xs font-semibold text-admin-text-faint">{webJobs > 0 && appStoreJobs <= 0 ? "官网采集任务" : "采集任务"}</div>
          <div className="mt-1 text-lg font-semibold text-admin-text dark:text-admin-text">
            {appStoreJobs + webJobs} / {toNumber(row.total_job_count)}
          </div>
          <div className="mt-1 text-xs text-admin-text-muted dark:text-admin-text-muted">
            启用 {toNumber(row.active_job_count)}，到期 {toNumber(row.due_job_count)}
          </div>
        </div>
        <div className="rounded-admin-card bg-admin-surface-subtle p-3 dark:bg-admin-chip">
          <div className="text-xs font-semibold text-admin-text-faint">最近运行</div>
          <div className="mt-1 text-sm font-semibold text-admin-text dark:text-admin-text">
            {reviewFailed ? "采集成功，审核失败" : runStatusLabel(row.latest_run_status)}
          </div>
          <div className="mt-1 text-xs text-admin-text-muted dark:text-admin-text-muted">
            {formatDate(row.latest_run_started_at)}
          </div>
        </div>
        <div className="rounded-admin-card bg-admin-surface-subtle p-3 dark:bg-admin-chip">
          <div className="text-xs font-semibold text-admin-text-faint">异常待决</div>
          <div className="mt-1 text-lg font-semibold text-admin-text dark:text-admin-text">{pendingCount}</div>
          <div className="mt-1 text-xs text-admin-text-muted dark:text-admin-text-muted">
            硬异常 {blockedCount}，补样本 {toNumber(row.waiting_observation_count)}
          </div>
        </div>
        <div className="rounded-admin-card bg-admin-surface-subtle p-3 dark:bg-admin-chip">
          <div className="text-xs font-semibold text-admin-text-faint">正式价格</div>
          <div className="mt-1 text-lg font-semibold text-admin-text dark:text-admin-text">
            {toNumber(row.published_price_count)}
          </div>
          <div className="mt-1 text-xs text-admin-text-muted dark:text-admin-text-muted">
            地区 {toNumber(row.published_region_count)}，套餐 {toNumber(row.plan_count)}
          </div>
          <div
            className={joinClasses(
              "mt-1 text-xs font-semibold",
              stalePublishedCount > 0 ? "text-amber-700 dark:text-amber-300" : "text-admin-text-faint"
            )}
          >
            {stalePublishedCount > 0
              ? `需复采 ${stalePublishedCount} 条`
              : `最新 ${formatDate(row.latest_price_checked_at)}`}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-admin-border pt-4 dark:border-admin-border">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-admin-text-secondary dark:text-admin-text-secondary">
            <span>价格验证 {readiness.completed}/{readiness.total}</span>
            <span className="text-admin-text-secondary">·</span>
            <span>下一步：{readiness.nextAction}</span>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-semibold">
            {row.has_fresh_success ? (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-800">
                12 小时内成功采集
              </span>
            ) : null}
            {toNumber(row.changed_observation_count) > 0 ? (
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:ring-blue-800">
                价格变化 {toNumber(row.changed_observation_count)}
              </span>
            ) : null}
            {toNumber(row.low_confidence_observation_count) > 0 ? (
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-800">
                低可信 {toNumber(row.low_confidence_observation_count)}
              </span>
            ) : null}
            {toNumber(row.discovery_candidate_count) > 0 ? (
              <span className="rounded-full bg-admin-chip px-2.5 py-1 text-admin-text-secondary ring-1 ring-admin-border dark:bg-admin-chip dark:text-admin-text-secondary dark:ring-admin-border-strong">
                来自线索 {toNumber(row.discovery_candidate_count)}
              </span>
            ) : null}
            {stalePublishedCount > 0 ? (
              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-800">
                正式价超过 14 天
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex gap-3 text-xs font-semibold">
          <AdminLink href={withAdminReturnTo(`/admin/products/${row.product_id}/edit`, returnTo)} className="text-admin-accent hover:underline">
            产品资料
          </AdminLink>
          <AdminLink href={`/admin/collector-jobs?product=${encodeURIComponent(row.product_slug)}`} className="text-admin-accent hover:underline">
            采集任务
          </AdminLink>
          <AdminLink href={`/admin/prices?product=${encodeURIComponent(row.product_slug)}`} className="text-admin-accent hover:underline">
            正式价格
          </AdminLink>
        </div>
      </div>
      {/* Existing growth recommendations use App Store coverage; do not mislabel Web-only products. */}
      {growthSignal && !(webJobs > 0 && appStoreJobs === 0) ? (
        <div className="mt-4 flex flex-col gap-2 border-t border-admin-border pt-4 text-xs sm:flex-row sm:items-center sm:justify-between dark:border-admin-border">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-admin-text-muted dark:text-admin-text-muted">
            <span className="font-semibold text-admin-text-body dark:text-admin-text-body">页面质量 {growthSignal.qualityScore}/100</span>
            <span>搜索需求 {growthSignal.demandScore}</span>
            {growthSignal.demandQueries.length > 0 ? (
              <span title={growthSignal.demandQueries.join("、")}>
                用户在搜：{growthSignal.demandQueries.slice(0, 2).join("、")}
              </span>
            ) : (
              <span>暂未发现明确站内搜索需求</span>
            )}
          </div>
          <AdminLink href={growthSignal.actionHref} className="shrink-0 font-medium text-admin-accent hover:underline">
            {growthSignal.recommendedAction}
          </AdminLink>
        </div>
      ) : null}
    </div>
  );
}

export default async function AdminPipelinePage({
  searchParams,
}: {
  searchParams?: Promise<{
    q?: string;
    product?: string;
    returnTo?: string;
    page?: string | string[];
    category?: string;
    stage?: string;
    batchRequested?: string;
    batchQueued?: string;
    batchStarted?: string;
    batchProtected?: string;
    batchSkipped?: string;
    batchStartFailed?: string;
    batchError?: string;
  }>;
}) {
  const params = searchParams ? await searchParams : {};
  const q = String(params.q ?? "").trim().slice(0, 100);
  const product = String(params.product || "").trim().toLowerCase().slice(0, 120);
  const category = pipelineCategories.some((item) => item.value === params.category)
    ? String(params.category)
    : "all";
  const stage = pipelineStages.some((item) => item.value === params.stage)
    ? (String(params.stage) as "all" | AdminOperationalStatus)
    : "all";
  const batchRequested = toQueryCount(params.batchRequested);
  const batchQueued = toQueryCount(params.batchQueued);
  const batchStarted = toQueryCount(params.batchStarted);
  const batchProtected = toQueryCount(params.batchProtected);
  const batchSkipped = toQueryCount(params.batchSkipped);
  const batchStartFailed = toQueryCount(params.batchStartFailed);

  let pageRows: PipelineProductRow[] = [];
  let totalAll = 0;
  let stageCounts = createAdminOperationalCounts();
  let closestToPublish: PipelineProductRow | null = null;
  let pagination = { page: 1, pageSize: 10, total: 0, totalPages: 1 };
  let growthSignals: PipelineGrowthSignal[] = [];
  let stats: PipelineStats = emptyPipelineStats();
  let loadError: string | null = null;

  try {
    const [pageResult, loadedStats, loadedSignals] = await measureAdminWorkload(
      "pipeline.page-data",
      () =>
        Promise.all([
          getPipelinePageProducts({
            q,
            category,
            product,
            stage,
            rawPage: params.page,
            pageSize: 10,
          }),
          getPipelineStats(),
          getPipelineGrowthSignals().catch(() => []),
        ]),
    );
    pageRows = pageResult.items;
    totalAll = pageResult.totalAll;
    stageCounts = pageResult.stageCounts;
    closestToPublish = pageResult.closestToPublish;
    pagination = pageResult.pagination;
    stats = loadedStats;
    growthSignals = loadedSignals;
  } catch (error) {
    loadError = getErrorMessage(error);
  }

  const pageHref = (page: number) =>
    `${buildAdminListHref(
      "/admin/pipeline",
      {
        product: product || undefined,
        q: q || undefined,
        category: category === "all" ? undefined : category,
        stage: stage === "all" ? undefined : stage,
      },
      { page },
    )}#pipeline-products`;

  const growthSignalByProduct = new Map(
    growthSignals.map((signal) => [signal.productId, signal]),
  );
  const closestReadiness = closestToPublish
    ? getPublishReadiness(closestToPublish)
    : null;
  const stageHref = (nextStage: "all" | AdminOperationalStatus) => {
    const query = new URLSearchParams();
    if (product) query.set("product", product);
    if (q) query.set("q", q);
    if (category !== "all") query.set("category", category);
    if (nextStage !== "all") query.set("stage", nextStage);
    const suffix = query.toString();
    return suffix
      ? `/admin/pipeline?${suffix}#pipeline-products`
      : "/admin/pipeline#pipeline-products";
  };

  return (
    <div>
      <AdminPageHeader
        eyebrow="Pipeline"
        title="采集与审核 · 产品队列"
        description="后台主入口按产品聚合：核对 App Store 或已接入的官网采集任务、最近运行、自动验证和正式价格。"
      />

      <AdminPipelineSteps currentStep="pipeline" productSlug={product || undefined} returnTo={params.returnTo} />
      {product ? (
        <p className="mb-4 text-sm text-admin-text-muted">
          当前产品范围：{product}{" "}
          <AdminLink href="/admin/pipeline" className="inline-flex min-h-11 items-center px-2 text-admin-accent underline">
            查看全部产品
          </AdminLink>
        </p>
      ) : null}

      {params.batchError ? (
        <AdminCard className="mb-6">
          <div className="text-sm font-semibold text-red-800 dark:text-red-200">批量更新没有提交成功</div>
          <p className="mt-1 text-sm leading-6 text-red-700 dark:text-red-300">
            {params.batchError === "empty"
              ? "请先选择至少一个产品，再加入采集队列。"
              : "后台未能写入采集队列，请先查看系统状态后重试。"}
          </p>
        </AdminCard>
      ) : batchRequested !== null && batchQueued !== null ? (
        <AdminCard className="mb-6">
          <div className="text-sm font-semibold text-blue-900 dark:text-blue-200">批量更新已交给后台</div>
          <p className="mt-1 text-sm leading-6 text-blue-800 dark:text-blue-200">
            已选择 {batchRequested} 个产品，新增排队 {batchQueued} 个，立即启动 {batchStarted ?? 0} 个。
            {(batchProtected ?? 0) > 0 ? ` ${batchProtected} 个处于冷却保护或已有运行记录。` : ""}
            {(batchSkipped ?? 0) > 0 ? ` 共跳过 ${batchSkipped} 个未配置或受保护产品。` : ""}
            {(batchStartFailed ?? 0) > 0 ? ` ${batchStartFailed} 个未能立即启动，但仍保留在定时队列。` : ""}
          </p>
          <AdminLinkButton href="/admin/collector-jobs" variant="secondary" size="sm" className="mt-3">
            查看运行进度
          </AdminLinkButton>
        </AdminCard>
      ) : null}

      {loadError ? (
        <AdminCard className="mb-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-sm font-semibold text-amber-700 dark:text-amber-300">数据库未连接</div>
              <h2 className="mt-1 text-base font-semibold text-admin-text dark:text-admin-text">
                暂时无法读取采集流水线
              </h2>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-admin-text-secondary dark:text-admin-text-secondary">
                请先启动本地 PostgreSQL，再刷新本页。当前错误：{loadError.slice(0, 180)}
              </p>
            </div>
            <AdminLinkButton href="/admin/system" variant="secondary">
              查看系统状态
            </AdminLinkButton>
          </div>
        </AdminCard>
      ) : null}

      {!loadError ? (
        <details className="mb-6 rounded-admin-card border border-admin-border bg-admin-surface p-4">
          <summary className="min-h-11 cursor-pointer text-sm font-semibold text-admin-text">全站运行概况与建议</summary>
          <div className="mt-4">
            <PipelineRecommendation stats={stats} />
            {closestToPublish && closestReadiness ? (
              <div className="mb-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                <AdminCard>
                  <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">最接近完成价格验证</div>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold text-admin-text dark:text-admin-text">
                        {closestToPublish.product_name}
                      </div>
                      <div className="mt-1 text-sm text-admin-text-secondary dark:text-admin-text-secondary">
                        已完成 {closestReadiness.completed}/{closestReadiness.total} 项，下一步：{closestReadiness.nextAction}
                      </div>
                    </div>
                    <AdminLinkButton
                      href={`/admin/pipeline?q=${encodeURIComponent(closestToPublish.product_slug)}`}
                      variant="secondary"
                    >
                      只看这个产品
                    </AdminLinkButton>
                  </div>
                </AdminCard>
                <AdminCard>
                  <div className="text-xs font-semibold text-admin-text-muted dark:text-admin-text-muted">沉睡库存</div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold text-admin-text dark:text-admin-text">
                        {stageCounts.not_started} 个产品未开始
                      </div>
                      <div className="mt-1 text-sm text-admin-text-muted dark:text-admin-text-muted">没有采集任务就不会自动产生价格。</div>
                    </div>
                    <AdminLinkButton href={stageHref("not_started")} variant="secondary">
                      查看
                    </AdminLinkButton>
                  </div>
                </AdminCard>
              </div>
            ) : null}

            <div className="mb-6 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
              <AdminCard>
                <div className="text-sm font-semibold text-admin-text-muted dark:text-admin-text-muted">产品</div>
                <div className="mt-2 text-2xl font-semibold text-admin-text dark:text-admin-text">{stats.productCount}</div>
                <div className="mt-2 text-sm text-admin-text-muted dark:text-admin-text-muted">当前服务库产品。</div>
              </AdminCard>
              <AdminCard>
                <div className="text-sm font-semibold text-admin-text-muted dark:text-admin-text-muted">缺任务</div>
                <div className="mt-2 text-2xl font-semibold text-amber-700 dark:text-amber-300">{stats.setupCount}</div>
                <div className="mt-2 text-sm text-admin-text-muted dark:text-admin-text-muted">需要配置受支持的价格来源。</div>
              </AdminCard>
              <AdminCard>
                <div className="text-sm font-semibold text-admin-text-muted dark:text-admin-text-muted">待审核</div>
                <div className="mt-2 text-2xl font-semibold text-blue-700 dark:text-blue-300">{stats.pendingCount}</div>
                <div className="mt-2 text-sm text-admin-text-muted dark:text-admin-text-muted">有待决价格观测。</div>
              </AdminCard>
              <AdminCard>
                <div className="text-sm font-semibold text-admin-text-muted dark:text-admin-text-muted">失败</div>
                <div className="mt-2 text-2xl font-semibold text-red-700 dark:text-red-300">{stats.failedCount}</div>
                <div className="mt-2 text-sm text-admin-text-muted dark:text-admin-text-muted">最近运行失败，包含采集或审核阶段。</div>
              </AdminCard>
              <AdminCard>
                <div className="text-sm font-semibold text-admin-text-muted dark:text-admin-text-muted">复采提醒</div>
                <div className="mt-2 text-2xl font-semibold text-admin-text dark:text-admin-text">{stats.dueCount + stats.staleCount}</div>
                <div className="mt-2 text-sm text-admin-text-muted dark:text-admin-text-muted">
                  定时到期 {stats.dueCount}，正式价过期 {stats.staleCount}。
                </div>
              </AdminCard>
              <AdminCard>
                <div className="text-sm font-semibold text-admin-text-muted dark:text-admin-text-muted">正式价格</div>
                <div className="mt-2 text-2xl font-semibold text-emerald-700 dark:text-emerald-300">{stats.publishedPriceCount}</div>
                <div className="mt-2 text-sm text-admin-text-muted dark:text-admin-text-muted">已上线价格记录。</div>
              </AdminCard>
            </div>
          </div>
        </details>
      ) : null}

      <section id="pipeline-products" aria-labelledby="pipeline-products-heading" className="scroll-mt-24">
        <AdminCard className="mb-6">
          <AdminSectionHeader id="pipeline-products-heading" title="采集产品" description="按产品查看采集、审核与发布状态；每页展示 10 个产品。" />
          <div className="mb-4 min-w-0">
            <AdminSegmentedControl
              ariaLabel="采集状态"
              value={stage}
              items={pipelineStages.map((item) => ({
                value: item.value,
                label: `${item.label} ${item.value === "all" ? totalAll : stageCounts[item.value]}`,
                href: stageHref(item.value),
              }))}
            />
          </div>
          <AdminFilterBar
            action="/admin/pipeline#pipeline-products"
            q={q}
            searchLabel="搜索产品"
            searchPlaceholder="产品名或 slug"
            filters={[
              {
                name: "category",
                label: "分类",
                value: category === "all" ? "" : category,
                options: pipelineCategories.filter((item) => item.value !== "all"),
              },
            ]}
            preserve={{
              product: product || undefined,
              stage: stage === "all" ? undefined : stage,
            }}
            clearHref="/admin/pipeline#pipeline-products"
          />
          {!loadError ? (
            <AdminPagination {...pagination} pageHref={pageHref} ariaLabel="采集产品顶部分页" unit="个产品" />
          ) : null}
        </AdminCard>

        {pageRows.filter((row) => toNumber(row.app_store_job_count) > 0 && row.latest_run_status !== "running").length > 1 ? (
          <BatchCollectionPanel
            key={`${q}:${category}:${stage}:${pagination.page}`}
            products={pageRows
              .filter((row) => toNumber(row.app_store_job_count) > 0 && row.latest_run_status !== "running")
              .map((row) => ({
                slug: row.product_slug,
                name: row.product_name,
                needsUpdate:
                  getPipelineOperationalStatus(row) !== "published" ||
                  toNumber(row.due_job_count) > 0 ||
                  toNumber(row.published_stale_price_count) > 0,
              }))}
          />
        ) : null}

        <div className="grid gap-4">
          {pageRows.map((row) => (
            <article key={row.product_id} id={`pipeline-row-${row.product_id}`} className="scroll-mt-24" data-pipeline-product={row.product_slug} aria-label={row.product_name}>
              <ProductPipelineCard
                returnTo={pageHref(pagination.page).split("#")[0] + `#pipeline-row-${row.product_id}`}
                row={row}
                growthSignal={growthSignalByProduct.get(row.product_id)}
              />
            </article>
          ))}

          {pagination.total === 0 && !loadError ? (
            <AdminCard>
              <div className="py-12 text-center">
                <div className="text-base font-semibold text-admin-text dark:text-admin-text">没有匹配的产品</div>
                <p className="mt-2 text-sm text-admin-text-muted dark:text-admin-text-muted">
                  可以清除筛选，或者先从线索入口加入新产品。
                </p>
                <AdminLinkButton href="/admin/discovery" className="mt-5">
                  去线索入口
                </AdminLinkButton>
              </div>
            </AdminCard>
          ) : null}
        </div>
        {!loadError && pagination.totalPages > 1 ? (
          <AdminPagination
            {...pagination}
            pageHref={pageHref}
            ariaLabel="采集产品底部分页"
            unit="个产品"
            className="mt-5 rounded-admin-card bg-admin-surface p-4 shadow-admin-card"
          />
        ) : null}
      </section>
    </div>
  );
}

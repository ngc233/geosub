import AdminProductLogo from "@/components/admin/AdminProductLogo";
import { productNextAction } from "@/lib/admin-product-next-action";
import { withAdminReturnTo } from "@/lib/admin-workflow-context";
import { adminButtonClassName, AdminLinkButton } from "@/components/admin/AdminButton";
import AdminLink from "@/components/admin/AdminLink";
import { AdminBadge } from "@/components/admin/AdminBadge";
import AdminAlert from "@/components/admin/AdminAlert";
import AdminStatusNotice from "@/components/admin/AdminStatusNotice";
import AdminTabs, { type AdminTabItem } from "@/components/admin/AdminTabs";
import { AdminCard, AdminPageHeader } from "@/components/admin/AdminCard";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge";
import AdminSegmentedControl from "@/components/admin/AdminSegmentedControl";
import AdminFilterBar from "@/components/admin/AdminFilterBar";
import AdminPagination from "@/components/admin/AdminPagination";
import {
  assessProductOperationalStatus,
  type AdminOperationalStatus,
} from "../../../lib/admin-operational-status";
import {
  getPipelineGrowthSignals,
  type PipelineGrowthSignal,
} from "../../../lib/admin-pipeline-growth";
import { measureAdminWorkload } from "../../../lib/admin-performance";
import ManualCollectionProgressForm from "../review/ManualCollectionProgressForm";
import CollectionRunHistorySection from "../review/CollectionRunHistorySection";
import { getCollectorRunHistoryRows } from "../review/collector-run-history-query";
import {
  getCollectionStatusMessage,
  getCollectionStatusTone,
} from "../review/collection-status";
import { adminPrisma as prisma } from "../../../lib/prisma";
import {
  queryCanonicalPipelinePage,
  type CanonicalOperationalCounts,
  type CanonicalProductStatusRow,
} from "../../../lib/admin-product-status-read-model";
import BatchCollectionPanel from "./BatchCollectionPanel";
import CollectorJobsView from "../collector-jobs/CollectorJobsView";
import { getCollectorJobsPageData } from "../collector-jobs/queries";
import { isCollectorReviewFailure } from "../collector-jobs/execution-status";
import PipelineDiscoveryView from "./PipelineDiscoveryView";
import {
  officialWebEligibleJobSql,
  webPricingScopeJoinSql,
} from "../../../lib/admin-product-scope";
import { buildAdminListHref } from "../../../lib/admin-list-params";

export const dynamic = "force-dynamic";

type PipelineTab = "queue" | "runs" | "discovery";

const officialWebJobFilter = officialWebEligibleJobSql("product", "job");
const webPilotScope = webPricingScopeJoinSql({
  statsAlias: "job_stats",
  officialWebCountColumn: "official_web_job_count",
  appStoreCountColumn: "app_store_job_count",
  scopeAlias: "pricing_scope",
});

const categories = [
  { value: "all", label: "全部" },
  { value: "ai", label: "AI 订阅" },
  { value: "streaming", label: "流媒体" },
  { value: "software", label: "软件" },
  { value: "game", label: "游戏" },
  { value: "gift_card", label: "礼品卡" },
  { value: "payment", label: "支付" },
  { value: "vpn", label: "网络工具" },
  { value: "other", label: "其他" },
];

const pipelineStages: Array<{
  value: "all" | AdminOperationalStatus;
  label: string;
  description: string;
}> = [
  { value: "all", label: "全部产品", description: "查看完整流水线" },
  { value: "exception", label: "需要介入", description: "采集、审核失败或硬异常" },
  { value: "pending", label: "系统处理中", description: "等待采集、审核或复采" },
  { value: "not_started", label: "未开始", description: "还没有受支持的采集任务" },
  { value: "published", label: "正式价可用", description: "正式价格当前可用" },
];

type PipelineProductRow = {
  product_id: string;
  product_slug: string;
  product_name: string;
  product_category: string;
  product_status: string;
  provider: string | null;
  plan_count: unknown;
  total_job_count: unknown;
  app_store_job_count: unknown;
  official_web_job_count?: unknown;
  active_job_count: unknown;
  due_job_count: unknown;
  source_count: unknown;
  next_run_at: Date | string | null;
  latest_run_status: string | null;
  latest_run_started_at: Date | string | null;
  latest_run_error: string | null;
  failure_phase?: string | null;
  failure_stage?: string | null;
  collector_status?: string | null;
  auto_review_status?: string | null;
  latest_success_at: Date | string | null;
  has_fresh_success: boolean | null;
  pending_observation_count: unknown;
  blocked_observation_count: unknown;
  waiting_observation_count: unknown;
  changed_observation_count: unknown;
  low_confidence_observation_count: unknown;
  published_price_count: unknown;
  published_region_count: unknown;
  published_stale_price_count: unknown;
  latest_price_checked_at: Date | string | null;
  discovery_candidate_count: unknown;
};

type PipelineStatsRow = {
  product_count: unknown;
  ready_count: unknown;
  setup_count: unknown;
  pending_count: unknown;
  failed_count: unknown;
  due_count: unknown;
  stale_count: unknown;
  running_count: unknown;
  published_price_count: unknown;
};

type PipelineStats = {
  productCount: number;
  readyCount: number;
  setupCount: number;
  pendingCount: number;
  failedCount: number;
  dueCount: number;
  staleCount: number;
  runningCount: number;
  publishedPriceCount: number;
};

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") return Number(value);
  if (value && typeof value === "object" && "toNumber" in value) {
    return Number((value as { toNumber: () => number }).toNumber());
  }
  return 0;
}

function toQueryCount(value: string | undefined) {
  const count = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(count) && count >= 0 ? count : null;
}

function formatDate(value: Date | string | null) {
  if (!value) return "未安排";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "未安排";
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function categoryLabel(value: string) {
  return categories.find((category) => category.value === value)?.label || value;
}

function productStatusLabel(status: string) {
  if (status === "published") return "已上架";
  if (status === "review") return "资料待完善";
  if (status === "draft") return "草稿";
  if (status === "archived") return "已归档";
  return status || "未知";
}

function runStatusLabel(status: string | null) {
  if (status === "succeeded") return "成功";
  if (status === "failed") return "失败";
  if (status === "running") return "运行中";
  if (status === "skipped") return "跳过";
  return status || "暂无运行";
}

function getPipelineState(row: PipelineProductRow) {
  const appStoreJobs = toNumber(row.app_store_job_count);
  const webJobs = toNumber(row.official_web_job_count);
  const pending = toNumber(row.pending_observation_count);
  const blocked = toNumber(row.blocked_observation_count);
  const published = toNumber(row.published_price_count);
  const stalePublished = toNumber(row.published_stale_price_count);

  if (appStoreJobs + webJobs <= 0) {
    return {
      key: "setup",
      label: "缺采集任务",
      detail: "先到产品资料补 App Store 链接、应用 ID 或受支持官网来源。",
    };
  }

  if (row.latest_run_status === "failed") {
    return {
      key: "failed",
      label: isCollectorReviewFailure({ ...row, error_message: row.latest_run_error })
        ? "采集成功，审核失败"
        : "采集失败",
      detail: row.latest_run_error || "切换到「运行与任务」核对失败阶段后再重试。",
    };
  }

  if (pending > 0) {
    return {
      key: "review",
      label: blocked > 0 ? "异常待决" : "待审核",
      detail:
        webJobs > 0 && appStoreJobs === 0
          ? "官网样本正在自动验证，异常隔离后由后续任务重试。"
          : blocked > 0
            ? "有硬异常，系统不会自动上线，请前往异常审核台处理。"
            : "采集到新价格，等待自动或人工审核。",
    };
  }

  if (!row.latest_success_at) {
    return {
      key: "collect",
      label: "待采集",
      detail:
        webJobs > 0 && appStoreJobs === 0
          ? "已有官网任务，等待首次自动采集。"
          : "已有 App Store 任务，但还没有成功运行记录。",
    };
  }

  if (published <= 0) {
    return {
      key: "publish",
      label: "待入库",
      detail: "已采集过，但还没有正式价格。",
    };
  }

  if (stalePublished > 0) {
    return {
      key: "stale",
      label: "需复采",
      detail: `${stalePublished} 条正式${webJobs > 0 && appStoreJobs <= 0 ? ' Web' : ' App Store'}价格超过 14 天未更新。稳定结果会自动入库。`,
    };
  }

  return {
    key: "ready",
    label: "已上线",
    detail: "有正式价格，可继续按频率复采。",
  };
}

function getPipelineOperationalAssessment(row: PipelineProductRow) {
  return assessProductOperationalStatus({
    publishStatus: row.product_status,
    planCount: toNumber(row.plan_count),
    activeCollectorJobCount:
      toNumber(row.app_store_job_count) + toNumber(row.official_web_job_count),
    latestRunStatus: row.latest_run_status,
    pendingWorkCount: toNumber(row.pending_observation_count),
    blockedCount: toNumber(row.blocked_observation_count),
    publishedPriceCount: toNumber(row.published_price_count),
    stalePriceCount: toNumber(row.published_stale_price_count),
  });
}

function getPipelineOperationalStatus(row: PipelineProductRow): AdminOperationalStatus {
  return getPipelineOperationalAssessment(row)?.status ?? "not_started";
}

function getPublishReadiness(row: PipelineProductRow) {
  const checks = [
    { ready: toNumber(row.plan_count) > 0, missing: "补套餐" },
    {
      ready: toNumber(row.app_store_job_count) + toNumber(row.official_web_job_count) > 0,
      missing: "补采集任务",
    },
    { ready: Boolean(row.latest_success_at), missing: "完成首次采集" },
    { ready: toNumber(row.published_price_count) > 0, missing: "形成正式价格" },
    {
      ready:
        toNumber(row.blocked_observation_count) === 0 &&
        toNumber(row.published_stale_price_count) === 0,
      missing: "处理异常或过期价格",
    },
  ];
  const completed = checks.filter((check) => check.ready).length;

  return {
    completed,
    total: checks.length,
    nextAction: isCollectorReviewFailure({ ...row, error_message: row.latest_run_error })
      ? "修复自动审核"
      : checks.find((check) => !check.ready)?.missing || "保持定期复采",
  };
}

async function getPipelineStats(): Promise<PipelineStats> {
  const rows = await prisma.$queryRaw<PipelineStatsRow[]>`
    WITH product_status AS (
      SELECT
        product.id,
        COALESCE(job_stats.app_store_job_count, 0)+COALESCE(job_stats.official_web_job_count,0) AS supported_job_count,
        COALESCE(job_stats.due_job_count, 0) AS due_job_count,
        latest_run.status AS latest_run_status,
        latest_success.latest_success_at,
        COALESCE(observation_stats.pending_observation_count, 0) AS pending_observation_count,
        COALESCE(published_stats.published_price_count, 0) AS published_price_count,
        COALESCE(published_stats.published_stale_price_count, 0) AS published_stale_price_count,
        published_stats.latest_price_checked_at
      FROM products product
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*) FILTER (
            WHERE COALESCE(
              job.job_config ->> 'collector_kind',
              source.type::text,
              'unknown'
            ) = 'app_store'
          )::int AS app_store_job_count,
          COUNT(*) FILTER (WHERE ${officialWebJobFilter})::int AS official_web_job_count,
          COUNT(*) FILTER (WHERE job.status = 'active' AND (job.next_run_at IS NULL OR job.next_run_at <= NOW()))::int AS due_job_count
        FROM collector_jobs job
        LEFT JOIN price_sources source ON source.id = job.source_id
        WHERE job.product_id = product.id
          AND job.job_type IN ('ai_pricing', 'streaming_pricing')
          AND job.status <> 'archived'
      ) job_stats ON TRUE
      ${webPilotScope}
      LEFT JOIN LATERAL (
        SELECT run.status
        FROM collector_jobs scoped_job
        JOIN collector_job_runs run ON run.job_id = scoped_job.id
        WHERE scoped_job.product_id = product.id
          AND scoped_job.job_type IN ('ai_pricing', 'streaming_pricing')
          AND COALESCE(scoped_job.job_config ->> 'collector_kind', run.collector_kind, 'unknown') = CASE WHEN pricing_scope.billing_platform='web' THEN 'pricing_page' ELSE 'app_store' END
        ORDER BY run.started_at DESC
        LIMIT 1
      ) latest_run ON TRUE
      LEFT JOIN LATERAL (
        SELECT MAX(run.started_at) FILTER (WHERE run.status = 'succeeded') AS latest_success_at
        FROM collector_jobs scoped_job
        JOIN collector_job_runs run ON run.job_id = scoped_job.id
        WHERE scoped_job.product_id = product.id
          AND scoped_job.job_type IN ('ai_pricing', 'streaming_pricing')
          AND COALESCE(scoped_job.job_config ->> 'collector_kind', run.collector_kind, 'unknown') = CASE WHEN pricing_scope.billing_platform='web' THEN 'pricing_page' ELSE 'app_store' END
      ) latest_success ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS pending_observation_count
        FROM price_observations observation
        WHERE observation.product_id = product.id
          AND observation.status = 'pending'::observation_status
          AND observation.billing_platform::text = pricing_scope.billing_platform
      ) observation_stats ON TRUE
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int AS published_price_count,
          COUNT(*) FILTER (
            WHERE price.last_checked_at IS NULL
              OR price.last_checked_at < NOW() - INTERVAL '14 days'
          )::int AS published_stale_price_count,
          MAX(price.last_checked_at) AS latest_price_checked_at
        FROM region_prices price
        WHERE price.product_id = product.id
          AND price.status = 'published'::publish_status
          AND price.billing_platform::text = pricing_scope.billing_platform
          AND price.price_usd IS NOT NULL
      ) published_stats ON TRUE
      WHERE product.status <> 'archived'::publish_status
    )
    SELECT
      COUNT(*)::int AS product_count,
      COUNT(*) FILTER (
        WHERE pending_observation_count = 0
          AND published_price_count > 0
          AND published_stale_price_count = 0
          AND latest_price_checked_at IS NOT NULL
      )::int AS ready_count,
      COUNT(*) FILTER (WHERE supported_job_count <= 0)::int AS setup_count,
      COUNT(*) FILTER (WHERE pending_observation_count > 0)::int AS pending_count,
      COUNT(*) FILTER (WHERE latest_run_status = 'failed')::int AS failed_count,
      COUNT(*) FILTER (WHERE due_job_count > 0)::int AS due_count,
      COUNT(*) FILTER (WHERE latest_run_status = 'running')::int AS running_count,
      COUNT(*) FILTER (
        WHERE published_price_count > 0
          AND (
            published_stale_price_count > 0
            OR latest_price_checked_at IS NULL
          )
      )::int AS stale_count,
      COALESCE(SUM(published_price_count), 0)::int AS published_price_count
    FROM product_status
  `;

  const row = rows[0];
  return {
    productCount: toNumber(row?.product_count),
    readyCount: toNumber(row?.ready_count),
    setupCount: toNumber(row?.setup_count),
    pendingCount: toNumber(row?.pending_count),
    failedCount: toNumber(row?.failed_count),
    dueCount: toNumber(row?.due_count),
    staleCount: toNumber(row?.stale_count),
    runningCount: toNumber(row?.running_count),
    publishedPriceCount: toNumber(row?.published_price_count),
  };
}

function getPipelineRecommendation(stats: PipelineStats) {
  if (stats.runningCount > 0) {
    return {
      title: "采集器正在运行",
      body: `当前有 ${stats.runningCount} 个产品正在采集。先等待这一轮完成，再看是否还有异常待决。`,
      href: "/admin/pipeline?tab=runs",
      action: "查看运行记录",
      variant: "info" as const,
    };
  }

  if (stats.failedCount > 0) {
    return {
      title: "先处理运行失败",
      body: `${stats.failedCount} 个产品最近运行失败。查看具体失败阶段，采集和审核需要分别处理。`,
      href: "/admin/pipeline?tab=runs",
      action: "查看失败任务",
      variant: "danger" as const,
    };
  }

  if (stats.setupCount > 0) {
    return {
      title: "先补采集任务",
      body: `${stats.setupCount} 个产品还没有受支持的采集任务。没有任务就不会自动抓价，也不会进入审核。`,
      href: "/admin/pipeline?tab=discovery",
      action: "去线索录入",
      variant: "warning" as const,
    };
  }

  if (stats.pendingCount > 0) {
    return {
      title: "需要处理待决价格",
      body: `${stats.pendingCount} 个产品有待决观测。系统会自动放行稳定价格，硬异常会保留到异常审核台。`,
      href: "/admin/review",
      action: "前往异常审核",
      variant: "info" as const,
    };
  }

  if (stats.dueCount > 0 || stats.staleCount > 0) {
    return {
      title: "存在到期或需复采价格",
      body: `定时到期 ${stats.dueCount} 个，另有 ${stats.staleCount} 个已上线产品存在超过 14 天未更新的正式价格，稳定结果会自动入库。`,
      href: "/admin/pipeline?tab=runs",
      action: "查看调度与运行",
      variant: "warning" as const,
    };
  }

  return {
    title: "采集流水线稳定",
    body: "当前没有明显阻塞。新增产品从「线索录入」进入，已有产品按计划复采并自动审核。",
    href: "/admin/system",
    action: "查看系统状态",
    variant: "success" as const,
  };
}

function emptyPipelineStats(): PipelineStats {
  return {
    productCount: 0,
    readyCount: 0,
    setupCount: 0,
    pendingCount: 0,
    failedCount: 0,
    dueCount: 0,
    staleCount: 0,
    runningCount: 0,
    publishedPriceCount: 0,
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return String(error || "未知错误");
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
  const operationalStatus = getPipelineOperationalStatus(row);
  const reviewFailed = isCollectorReviewFailure({ ...row, error_message: row.latest_run_error });
  const pendingCount = toNumber(row.pending_observation_count);
  const blockedCount = toNumber(row.blocked_observation_count);
  const appStoreJobs = toNumber(row.app_store_job_count);
  const webJobs = toNumber(row.official_web_job_count);
  const stalePublishedCount = toNumber(row.published_stale_price_count);
  const isWebOnly = webJobs > 0 && appStoreJobs === 0;

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
    <div className="rounded-admin-card border border-admin-border bg-admin-surface p-4 transition-colors hover:border-admin-border-strong">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <AdminProductLogo slug={row.product_slug} name={row.product_name} size="md" />
            <h3 className="min-w-0 break-words text-base font-semibold text-admin-text">
              {row.product_name}
            </h3>
            <AdminBadge variant="neutral">{categoryLabel(row.product_category)}</AdminBadge>
            <AdminBadge variant="neutral">{isWebOnly ? "官网 Web" : "App Store"}</AdminBadge>
            <AdminStatusBadge status={operationalStatus} title={state.detail} />
          </div>
          <div className="mt-1 font-mono text-xs text-admin-text-faint">
            {row.product_slug} · {row.provider || "未填服务商"} · {productStatusLabel(row.product_status)}
          </div>
          <p className="mt-2.5 max-w-3xl text-sm leading-6 text-admin-text-secondary">
            <span className="font-semibold text-admin-text">{state.label}：</span>
            {state.detail}
          </p>
        </div>

        <div className="shrink-0 space-y-2 lg:max-w-xs lg:text-right" data-primary-workflow-action={next.kind}>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            {next.kind === "collect" ? (
              <ManualCollectionProgressForm
                productSlug={row.product_slug}
                buttonLabel={next.label}
                pendingLabel="正在提交采集请求"
              />
            ) : (
              <AdminLinkButton href={withAdminReturnTo(next.href, returnTo)} size="sm">
                {next.label}
              </AdminLinkButton>
            )}
          </div>
          <p className="text-xs leading-5 text-admin-text-muted">
            {reviewFailed
              ? "已有采集证据；修复审核错误后复用证据重试，无需重复采集。"
              : next.detail}
          </p>
          {appStoreJobs > 0 && next.kind !== "collect" && next.kind !== "progress" ? (
            <details className="text-left">
              <summary className="inline-flex min-h-8 cursor-pointer items-center text-xs text-admin-text-muted hover:text-admin-text">
                需要重新采集？
              </summary>
              <div className="mt-2 rounded-md border border-admin-border bg-admin-surface-subtle p-2.5">
                <p className="mb-2 text-xs text-admin-text-muted">
                  先核对异常或修正来源；重复采集不会跳过稳定样本要求。
                </p>
                <ManualCollectionProgressForm
                  productSlug={row.product_slug}
                  buttonLabel="修正后补采"
                  pendingLabel="正在提交补采请求"
                />
              </div>
            </details>
          ) : null}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-admin-border pt-3.5 md:grid-cols-4">
        <div>
          <div className="text-xs text-admin-text-faint">{isWebOnly ? "官网采集任务" : "采集任务"}</div>
          <div className="mt-0.5 text-sm font-semibold tabular-nums text-admin-text">
            {appStoreJobs + webJobs} / {toNumber(row.total_job_count)}
          </div>
          <div className="text-xs text-admin-text-muted">
            启用 {toNumber(row.active_job_count)} · 到期 {toNumber(row.due_job_count)}
          </div>
        </div>
        <div>
          <div className="text-xs text-admin-text-faint">最近运行</div>
          <div className="mt-0.5 text-sm font-semibold text-admin-text">
            {reviewFailed ? "采集成功，审核失败" : runStatusLabel(row.latest_run_status)}
          </div>
          <div className="text-xs tabular-nums text-admin-text-muted">
            {formatDate(row.latest_run_started_at)}
          </div>
        </div>
        <div>
          <div className="text-xs text-admin-text-faint">异常待决</div>
          <div className="mt-0.5 text-sm font-semibold tabular-nums text-admin-text">{pendingCount}</div>
          <div className="text-xs text-admin-text-muted">
            硬异常 {blockedCount} · 补样本 {toNumber(row.waiting_observation_count)}
          </div>
        </div>
        <div>
          <div className="text-xs text-admin-text-faint">正式价格</div>
          <div className="mt-0.5 text-sm font-semibold tabular-nums text-admin-text">
            {toNumber(row.published_price_count)} 条
          </div>
          <div
            className={`text-xs ${
              stalePublishedCount > 0 ? "font-medium text-admin-warning" : "text-admin-text-muted"
            }`}
          >
            {stalePublishedCount > 0
              ? `需复采 ${stalePublishedCount} 条`
              : `最新 ${formatDate(row.latest_price_checked_at)}`}
          </div>
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 border-t border-admin-border pt-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-admin-text-secondary">
            验证进度 {readiness.completed}/{readiness.total} · {readiness.nextAction}
          </span>
          {row.has_fresh_success ? <AdminBadge variant="success">12h 内已采</AdminBadge> : null}
          {toNumber(row.changed_observation_count) > 0 ? (
            <AdminBadge variant="info">价格变化 {toNumber(row.changed_observation_count)}</AdminBadge>
          ) : null}
          {toNumber(row.low_confidence_observation_count) > 0 ? (
            <AdminBadge variant="warning">低可信 {toNumber(row.low_confidence_observation_count)}</AdminBadge>
          ) : null}
          {toNumber(row.discovery_candidate_count) > 0 ? (
            <AdminBadge variant="neutral">来自线索</AdminBadge>
          ) : null}
          {stalePublishedCount > 0 ? <AdminBadge variant="warning">正式价超过 14 天</AdminBadge> : null}
        </div>
        <div className="flex flex-wrap items-center gap-3 font-medium">
          <AdminLink
            href={withAdminReturnTo(`/admin/products/${row.product_id}/edit?tab=sources`, returnTo)}
            className="text-admin-accent hover:underline"
          >
            来源配置
          </AdminLink>
          <AdminLink
            href={`/admin/pipeline?tab=runs&product=${encodeURIComponent(row.product_slug)}`}
            className="text-admin-accent hover:underline"
          >
            运行记录
          </AdminLink>
          <AdminLink
            href={`/admin/prices?product=${encodeURIComponent(row.product_slug)}`}
            className="text-admin-accent hover:underline"
          >
            正式价格
          </AdminLink>
        </div>
      </div>

      {growthSignal && !isWebOnly ? (
        <div className="mt-3 flex flex-col gap-1.5 border-t border-admin-border pt-2.5 text-xs sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-admin-text-muted">
            <span className="font-medium text-admin-text-body">
              页面质量 {growthSignal.qualityScore}/100
            </span>
            <span>搜索需求 {growthSignal.demandScore}</span>
            {growthSignal.demandQueries.length > 0 ? (
              <span title={growthSignal.demandQueries.join("、")}>
                用户在搜：{growthSignal.demandQueries.slice(0, 2).join("、")}
              </span>
            ) : null}
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
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawParams = searchParams ? await searchParams : {};
  const param = (key: string) => {
    const value = rawParams[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const tabRaw = String(param("tab") ?? "").trim().toLowerCase();
  const activeTab: PipelineTab =
    tabRaw === "runs" || tabRaw === "discovery" ? tabRaw : "queue";

  const product = String(param("product") ?? "").trim().toLowerCase().slice(0, 120);
  const q = String(param("q") ?? "").trim().slice(0, 100);
  const returnTo = param("returnTo");

  const tabHref = (nextTab: PipelineTab) => {
    const query = new URLSearchParams();
    if (nextTab !== "queue") query.set("tab", nextTab);
    if (product && nextTab !== "discovery") query.set("product", product);
    const suffix = query.toString();
    return suffix ? `/admin/pipeline?${suffix}` : "/admin/pipeline";
  };

  const tabItems: AdminTabItem[] = [
    { id: "queue", label: "待采队列", href: tabHref("queue") },
    { id: "runs", label: "运行与任务", href: tabHref("runs") },
    { id: "discovery", label: "线索录入", href: tabHref("discovery") },
  ];

  // Tab: 运行与任务（合并原 /admin/collector-jobs + 实时采集进度）
  if (activeTab === "runs") {
    const runParams: Record<string, string | undefined> = {};
    for (const [k, v] of Object.entries(rawParams)) {
      runParams[k] = Array.isArray(v) ? v[0] : v;
    }
    const collectionRun = param("collectionRun") ?? null;
    const collectionScope = param("collectionScope") ?? null;
    const queuedCount =
      param("collectionQueued") === undefined ? null : Number(param("collectionQueued"));
    const runIdParam = param("runId") || "";
    const runId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(runIdParam)
      ? runIdParam
      : null;

    const [[jobs, runs, availabilityChecks], liveRuns] = await Promise.all([
      getCollectorJobsPageData(runParams),
      runId || collectionRun || product
        ? getCollectorRunHistoryRows(q || product, 12, {
            product: product || collectionScope || undefined,
            runId: runId ?? undefined,
          })
        : Promise.resolve([]),
    ]);

    const showLiveTracker = Boolean(
      runId || collectionRun || liveRuns.some((row) => row.status === "running"),
    );
    const noticeTone = getCollectionStatusTone(collectionRun);

    return (
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="价格运维 · 采集中心"
          title="采集中心"
          description="统一管理产品待采队列、实时运行与失败排查、新产品线索录入，所有采集动作原地闭环。"
          action={
            <AdminLinkButton href="/admin/review" variant="secondary" size="sm">
              前往异常审核台
            </AdminLinkButton>
          }
        />

        <AdminTabs items={tabItems} activeId="runs" ariaLabel="采集中心视图" />

        {queuedCount !== null ? (
          <AdminStatusNotice
            title="本轮采集状态"
            variant={noticeTone === "error" ? "danger" : noticeTone}
          >
            {getCollectionStatusMessage({
              queuedCount,
              collectionRun,
              collectionScope,
            })}
          </AdminStatusNotice>
        ) : null}

        {showLiveTracker ? (
          <CollectionRunHistorySection
            key={`${product || q || "all"}:${runId || "latest"}`}
            rows={liveRuns}
            collectionRun={collectionRun}
            collectionScope={collectionScope}
            productQuery={product || q}
            productSlug={product || collectionScope || undefined}
            runId={runId}
            returnTo={returnTo}
          />
        ) : null}

        <CollectorJobsView
          embedded
          basePath="/admin/pipeline"
          listParams={runParams}
          jobs={jobs}
          runs={runs}
          availabilityChecks={availabilityChecks}
        />
      </div>
    );
  }

  // Tab: 线索录入（合并原 /admin/discovery）
  if (activeTab === "discovery") {
    return (
      <div className="space-y-6">
        <AdminPageHeader
          eyebrow="价格运维 · 采集中心"
          title="采集中心"
          description="录入新产品或官网 / App Store 线索；确认加入后自动匹配采集任务并直接回到待采队列。"
          action={
            <AdminLinkButton href="/admin/pipeline" variant="secondary" size="sm">
              返回待采队列
            </AdminLinkButton>
          }
        />

        <AdminTabs items={tabItems} activeId="discovery" ariaLabel="采集中心视图" />

        <PipelineDiscoveryView
          params={{
            page: param("page"),
            sourcePage: param("sourcePage"),
            checkPage: param("checkPage"),
            evidence: param("evidence"),
            opportunity: param("opportunity"),
            promotionError: param("promotionError"),
            prefill: param("prefill"),
            source: param("source"),
          }}
        />
      </div>
    );
  }

  // Default Tab: 待采队列（原 /admin/pipeline）
  const category = categories.some((item) => item.value === param("category"))
    ? String(param("category"))
    : "all";
  const stage = pipelineStages.some((item) => item.value === param("stage"))
    ? (String(param("stage")) as "all" | AdminOperationalStatus)
    : "all";
  const batchRequested = toQueryCount(param("batchRequested"));
  const batchQueued = toQueryCount(param("batchQueued"));
  const batchStarted = toQueryCount(param("batchStarted"));
  const batchProtected = toQueryCount(param("batchProtected"));
  const batchSkipped = toQueryCount(param("batchSkipped"));
  const batchStartFailed = toQueryCount(param("batchStartFailed"));
  const discoveryPromoted = param("discoveryPromoted") === "1";
  const discoveryProduct = String(param("discoveryProduct") ?? product).trim();
  const discoveryJobs = Math.max(0, Number(param("discoveryJobs") ?? 0) || 0);

  let pageRows: CanonicalProductStatusRow[] = [];
  let allCount = 0;
  let stageCounts: CanonicalOperationalCounts = {
    not_started: 0,
    pending: 0,
    exception: 0,
    published: 0,
  };
  let closestToPublish: CanonicalProductStatusRow | null = null;
  let pagination = { page: 1, totalPages: 1, total: 0, pageSize: 10 };
  let growthSignals: PipelineGrowthSignal[] = [];
  let stats: PipelineStats = emptyPipelineStats();
  let loadError: string | null = null;

  try {
    const [canonicalPage, pipelineStats, signals] = await measureAdminWorkload(
      "pipeline.page-data",
      () =>
        Promise.all([
          queryCanonicalPipelinePage({
            q,
            category,
            product,
            stage,
            page: rawParams.page,
            pageSize: 10,
          }),
          getPipelineStats(),
          getPipelineGrowthSignals().catch(() => []),
        ]),
    );
    pageRows = canonicalPage.rows;
    allCount = canonicalPage.allCount;
    stageCounts = canonicalPage.stageCounts;
    closestToPublish = canonicalPage.closestToPublish;
    pagination = {
      page: canonicalPage.pagination.page,
      totalPages: canonicalPage.pagination.totalPages,
      total: canonicalPage.pagination.total,
      pageSize: canonicalPage.pagination.pageSize,
    };
    stats = pipelineStats;
    growthSignals = signals;
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
  const closestReadiness = closestToPublish ? getPublishReadiness(closestToPublish) : null;
  const recommendation = getPipelineRecommendation(stats);

  const stageHref = (nextStage: "all" | AdminOperationalStatus) => {
    const query = new URLSearchParams();
    if (product) query.set("product", product);
    if (q) query.set("q", q);
    if (category !== "all") query.set("category", category);
    if (nextStage !== "all") query.set("stage", nextStage);
    const suffix = query.toString();
    return suffix ? `/admin/pipeline?${suffix}#pipeline-products` : "/admin/pipeline#pipeline-products";
  };

  const tabsWithCounts: AdminTabItem[] = [
    {
      id: "queue",
      label: "待采队列",
      href: tabHref("queue"),
      badge: stats.productCount > 0 ? stats.productCount : undefined,
    },
    {
      id: "runs",
      label: "运行与任务",
      href: tabHref("runs"),
      badge: stats.runningCount > 0 ? `${stats.runningCount} 运行中` : stats.failedCount > 0 ? `${stats.failedCount} 失败` : undefined,
    },
    { id: "discovery", label: "线索录入", href: tabHref("discovery") },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="价格运维 · 采集中心"
        title="采集中心"
        description="按产品统一调度 App Store 与官网采集，触发后直接在本中心「运行与任务」查看实时进度，异常进入「异常审核」。"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <AdminLinkButton href="/admin/pipeline?tab=discovery" variant="secondary" size="sm">
              线索录入
            </AdminLinkButton>
            <AdminLinkButton href="/admin/review" variant="secondary" size="sm">
              异常审核{stats.pendingCount > 0 ? ` (${stats.pendingCount})` : ""}
            </AdminLinkButton>
          </div>
        }
      />

      <AdminTabs items={tabsWithCounts} activeId="queue" ariaLabel="采集中心视图" />

      {discoveryPromoted ? (
        <AdminAlert variant="success" title={`已将「${discoveryProduct || product}」加入产品库`}>
          {discoveryJobs > 0
            ? `已自动生成 ${discoveryJobs} 个采集任务，可直接在下方点击「开始采集」。`
            : "尚未自动匹配到 App Store 采集任务，请点击该产品的「来源配置」补充来源后再开始采集。"}
        </AdminAlert>
      ) : null}

      {product ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-admin-card border border-admin-border bg-admin-surface-subtle px-4 py-2.5 text-sm">
          <span className="text-admin-text-secondary">
            当前产品范围：<strong className="font-semibold text-admin-text">{product}</strong>
          </span>
          <div className="flex items-center gap-3 text-xs font-medium">
            <AdminLink
              href={`/admin/pipeline?tab=runs&product=${encodeURIComponent(product)}`}
              className="text-admin-accent hover:underline"
            >
              查看该产品运行记录
            </AdminLink>
            <AdminLink href="/admin/pipeline" className="text-admin-accent hover:underline">
              查看全部产品
            </AdminLink>
          </div>
        </div>
      ) : null}

      {param("batchError") ? (
        <AdminAlert variant="danger" title="批量更新没有提交成功">
          {param("batchError") === "empty"
            ? "请先选择至少一个产品，再加入采集队列。"
            : "后台未能写入采集队列，请先查看系统状态后重试。"}
        </AdminAlert>
      ) : batchRequested !== null && batchQueued !== null ? (
        <AdminAlert variant="info" title="批量更新已交给后台">
          <p>
            已选择 {batchRequested} 个产品，新增排队 {batchQueued} 个，立即启动 {batchStarted ?? 0} 个。
            {(batchProtected ?? 0) > 0 ? ` ${batchProtected} 个处于冷却保护或已有运行记录。` : ""}
            {(batchSkipped ?? 0) > 0 ? ` 共跳过 ${batchSkipped} 个未配置或受保护产品。` : ""}
            {(batchStartFailed ?? 0) > 0 ? ` ${batchStartFailed} 个未能立即启动，但仍保留在定时队列。` : ""}
          </p>
          <div className="mt-2.5">
            <AdminLinkButton href="/admin/pipeline?tab=runs" variant="secondary" size="sm">
              查看运行进度
            </AdminLinkButton>
          </div>
        </AdminAlert>
      ) : null}

      {loadError ? (
        <AdminAlert variant="warning" title="暂时无法读取采集队列">
          请确认数据库可用后刷新本页。当前错误：{loadError.slice(0, 180)}
        </AdminAlert>
      ) : null}

      {!loadError ? (
        <div className="grid grid-cols-2 divide-y divide-admin-border rounded-admin-card border border-admin-border bg-admin-surface sm:grid-cols-3 lg:grid-cols-6 lg:divide-x lg:divide-y-0">
          <div className="px-4 py-3">
            <div className="text-xs font-medium text-admin-text-muted">产品总数</div>
            <div className="mt-1 text-xl font-semibold tabular-nums text-admin-text">{stats.productCount}</div>
          </div>
          <div className="px-4 py-3">
            <div className="text-xs font-medium text-admin-text-muted">缺采集任务</div>
            <div className="mt-1 text-xl font-semibold tabular-nums text-admin-warning">{stats.setupCount}</div>
          </div>
          <div className="px-4 py-3">
            <div className="text-xs font-medium text-admin-text-muted">待审核产品</div>
            <div className="mt-1 text-xl font-semibold tabular-nums text-admin-info">{stats.pendingCount}</div>
          </div>
          <div className="px-4 py-3">
            <div className="text-xs font-medium text-admin-text-muted">最近失败</div>
            <div className="mt-1 text-xl font-semibold tabular-nums text-admin-danger">{stats.failedCount}</div>
          </div>
          <div className="px-4 py-3">
            <div className="text-xs font-medium text-admin-text-muted">到期 / 过期</div>
            <div className="mt-1 text-xl font-semibold tabular-nums text-admin-text">
              {stats.dueCount + stats.staleCount}
            </div>
          </div>
          <div className="px-4 py-3">
            <div className="text-xs font-medium text-admin-text-muted">正式价格</div>
            <div className="mt-1 text-xl font-semibold tabular-nums text-admin-success">
              {stats.publishedPriceCount}
            </div>
          </div>
        </div>
      ) : null}

      {!loadError ? (
        <details className="rounded-admin-card border border-admin-border bg-admin-surface">
          <summary className="flex min-h-11 cursor-pointer items-center justify-between px-4 py-3 text-sm font-medium text-admin-text">
            <span>系统建议：{recommendation.title}</span>
            <span className="text-xs text-admin-text-muted">展开概况</span>
          </summary>
          <div className="space-y-4 border-t border-admin-border p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-3xl text-sm leading-6 text-admin-text-secondary">
                {recommendation.body}
              </p>
              <AdminLink
                href={recommendation.href}
                className={adminButtonClassName({ variant: "secondary", size: "sm" })}
              >
                {recommendation.action}
              </AdminLink>
            </div>
            {closestToPublish && closestReadiness ? (
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex items-center justify-between gap-3 rounded-admin-card border border-admin-border bg-admin-surface-subtle p-3.5">
                  <div>
                    <div className="text-xs font-medium text-admin-success">最接近完成价格验证</div>
                    <div className="mt-1 text-sm font-semibold text-admin-text">
                      {closestToPublish.product_name}
                    </div>
                    <div className="mt-0.5 text-xs text-admin-text-muted">
                      已完成 {closestReadiness.completed}/{closestReadiness.total} 项，下一步：{closestReadiness.nextAction}
                    </div>
                  </div>
                  <AdminLinkButton
                    href={`/admin/pipeline?product=${encodeURIComponent(closestToPublish.product_slug)}`}
                    variant="secondary"
                    size="sm"
                  >
                    只看此产品
                  </AdminLinkButton>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-admin-card border border-admin-border bg-admin-surface-subtle p-3.5">
                  <div>
                    <div className="text-xs font-medium text-admin-text-muted">沉睡库存</div>
                    <div className="mt-1 text-sm font-semibold text-admin-text">
                      {stageCounts.not_started} 个产品未开始
                    </div>
                    <div className="mt-0.5 text-xs text-admin-text-muted">
                      没有采集任务就不会自动产生价格。
                    </div>
                  </div>
                  <AdminLinkButton href={stageHref("not_started")} variant="secondary" size="sm">
                    筛选未开始
                  </AdminLinkButton>
                </div>
              </div>
            ) : null}
          </div>
        </details>
      ) : null}

      <section id="pipeline-products" aria-labelledby="pipeline-products-heading" className="scroll-mt-24 space-y-4">
        <AdminCard>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 id="pipeline-products-heading" className="text-sm font-semibold text-admin-text">
              待采产品队列
            </h2>
            <span className="text-xs tabular-nums text-admin-text-muted">共 {pagination.total} 个产品</span>
          </div>
          <div className="mb-4 min-w-0">
            <AdminSegmentedControl
              ariaLabel="采集状态"
              value={stage}
              items={pipelineStages.map((item) => ({
                value: item.value,
                label: `${item.label} ${item.value === "all" ? allCount : stageCounts[item.value]}`,
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
                options: categories.filter((item) => item.value !== "all"),
              },
            ]}
            preserve={{
              product: product || undefined,
              stage: stage === "all" ? undefined : stage,
            }}
            clearHref="/admin/pipeline#pipeline-products"
          />
          {!loadError ? (
            <AdminPagination
              {...pagination}
              pageHref={pageHref}
              ariaLabel="采集产品顶部分页"
              unit="个产品"
            />
          ) : null}
        </AdminCard>

        {pageRows.filter(
          (row) => toNumber(row.app_store_job_count) > 0 && row.latest_run_status !== "running",
        ).length > 1 ? (
          <BatchCollectionPanel
            key={`${q}:${category}:${stage}:${pagination.page}`}
            products={pageRows
              .filter(
                (row) =>
                  toNumber(row.app_store_job_count) > 0 && row.latest_run_status !== "running",
              )
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

        <div className="grid gap-3">
          {pageRows.map((row) => (
            <article
              key={row.product_id}
              id={`pipeline-row-${row.product_id}`}
              className="scroll-mt-24"
              data-pipeline-product={row.product_slug}
              aria-label={row.product_name}
            >
              <ProductPipelineCard
                returnTo={pageHref(pagination.page).split("#")[0] + `#pipeline-row-${row.product_id}`}
                row={row}
                growthSignal={growthSignalByProduct.get(row.product_id)}
              />
            </article>
          ))}

          {pageRows.length === 0 && !loadError ? (
            <AdminCard>
              <div className="py-12 text-center">
                <div className="text-sm font-semibold text-admin-text">没有匹配的产品</div>
                <p className="mt-1.5 text-xs text-admin-text-muted">
                  可以清除筛选，或者切换到「线索录入」加入新产品。
                </p>
                <AdminLinkButton href="/admin/pipeline?tab=discovery" size="sm" className="mt-4">
                  去线索录入
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
            className="rounded-admin-card border border-admin-border bg-admin-surface p-3"
          />
        ) : null}
      </section>
    </div>
  );
}

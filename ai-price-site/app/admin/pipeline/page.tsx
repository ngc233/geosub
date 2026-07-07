import Link from "next/link";
import { Prisma } from "@prisma/client";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  DatabaseZap,
  Search,
  ShieldCheck,
} from "lucide-react";
import { AdminCard, AdminPageHeader } from "../../../components/admin/AdminCard";
import AdminPipelineSteps from "../../../components/admin/AdminPipelineSteps";
import ManualCollectionProgressForm from "../review/ManualCollectionProgressForm";
import { prisma } from "../../../lib/prisma";

export const dynamic = "force-dynamic";

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
  active_job_count: unknown;
  due_job_count: unknown;
  source_count: unknown;
  next_run_at: Date | string | null;
  latest_run_status: string | null;
  latest_run_started_at: Date | string | null;
  latest_run_error: string | null;
  latest_success_at: Date | string | null;
  has_fresh_success: boolean | null;
  pending_observation_count: unknown;
  blocked_observation_count: unknown;
  waiting_observation_count: unknown;
  changed_observation_count: unknown;
  low_confidence_observation_count: unknown;
  published_price_count: unknown;
  published_region_count: unknown;
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

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") return Number(value);
  if (value && typeof value === "object" && "toNumber" in value) {
    return Number((value as { toNumber: () => number }).toNumber());
  }
  return 0;
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

function joinClasses(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getPipelineState(row: PipelineProductRow) {
  const appStoreJobs = toNumber(row.app_store_job_count);
  const pending = toNumber(row.pending_observation_count);
  const blocked = toNumber(row.blocked_observation_count);
  const published = toNumber(row.published_price_count);

  if (appStoreJobs <= 0) {
    return {
      key: "setup",
      label: "缺采集任务",
      detail: "先补 App Store 链接或应用 ID。",
      className: "bg-amber-50 text-amber-700 ring-amber-200",
      icon: AlertTriangle,
    };
  }

  if (row.latest_run_status === "failed") {
    return {
      key: "failed",
      label: "采集失败",
      detail: row.latest_run_error || "查看采集任务页确认失败原因。",
      className: "bg-red-50 text-red-700 ring-red-200",
      icon: AlertTriangle,
    };
  }

  if (pending > 0) {
    return {
      key: "review",
      label: blocked > 0 ? "异常待决" : "待审核",
      detail: blocked > 0 ? "有硬异常，系统不会自动上线。" : "采集到新价格，等待自动或人工审核。",
      className: blocked > 0
        ? "bg-red-50 text-red-700 ring-red-200"
        : "bg-blue-50 text-blue-700 ring-blue-200",
      icon: ShieldCheck,
    };
  }

  if (!row.latest_success_at) {
    return {
      key: "collect",
      label: "待采集",
      detail: "已有 App Store 任务，但还没有成功运行记录。",
      className: "bg-blue-50 text-blue-700 ring-blue-200",
      icon: DatabaseZap,
    };
  }

  if (published <= 0) {
    return {
      key: "publish",
      label: "待入库",
      detail: "已采集过，但还没有正式价格。",
      className: "bg-amber-50 text-amber-700 ring-amber-200",
      icon: Clock3,
    };
  }

  return {
    key: "ready",
    label: "已上线",
    detail: "有正式价格，可继续按频率复采。",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    icon: CheckCircle2,
  };
}

async function getPipelineRows({ q, category }: { q: string; category: string }) {
  const searchFilter = q
    ? Prisma.sql`AND (product.slug ILIKE ${`%${q}%`} OR product.name ILIKE ${`%${q}%`})`
    : Prisma.empty;
  const categoryFilter =
    category && category !== "all"
      ? Prisma.sql`AND product.category = ${category}::product_category`
      : Prisma.empty;

  return prisma.$queryRaw<PipelineProductRow[]>`
    SELECT
      product.id::text AS product_id,
      product.slug AS product_slug,
      product.name AS product_name,
      product.category::text AS product_category,
      product.status::text AS product_status,
      product.provider,
      COALESCE(plan_stats.plan_count, 0)::int AS plan_count,
      COALESCE(job_stats.total_job_count, 0)::int AS total_job_count,
      COALESCE(job_stats.app_store_job_count, 0)::int AS app_store_job_count,
      COALESCE(job_stats.active_job_count, 0)::int AS active_job_count,
      COALESCE(job_stats.due_job_count, 0)::int AS due_job_count,
      COALESCE(job_stats.source_count, 0)::int AS source_count,
      job_stats.next_run_at,
      latest_run.status AS latest_run_status,
      latest_run.started_at AS latest_run_started_at,
      latest_run.error_message AS latest_run_error,
      latest_success.latest_success_at,
      COALESCE(latest_success.has_fresh_success, FALSE) AS has_fresh_success,
      COALESCE(observation_stats.pending_observation_count, 0)::int AS pending_observation_count,
      COALESCE(observation_stats.blocked_observation_count, 0)::int AS blocked_observation_count,
      COALESCE(observation_stats.waiting_observation_count, 0)::int AS waiting_observation_count,
      COALESCE(observation_stats.changed_observation_count, 0)::int AS changed_observation_count,
      COALESCE(observation_stats.low_confidence_observation_count, 0)::int AS low_confidence_observation_count,
      COALESCE(published_stats.published_price_count, 0)::int AS published_price_count,
      COALESCE(published_stats.published_region_count, 0)::int AS published_region_count,
      COALESCE(candidate_stats.discovery_candidate_count, 0)::int AS discovery_candidate_count
    FROM products product
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS plan_count
      FROM plans plan
      WHERE plan.product_id = product.id
    ) plan_stats ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*)::int AS total_job_count,
        COUNT(*) FILTER (WHERE source.type = 'app_store'::price_source_type)::int AS app_store_job_count,
        COUNT(*) FILTER (WHERE job.status = 'active')::int AS active_job_count,
        COUNT(*) FILTER (WHERE job.status = 'active' AND (job.next_run_at IS NULL OR job.next_run_at <= NOW()))::int AS due_job_count,
        COUNT(DISTINCT job.source_id)::int AS source_count,
        MIN(job.next_run_at) FILTER (WHERE job.status = 'active') AS next_run_at
      FROM collector_jobs job
      LEFT JOIN price_sources source ON source.id = job.source_id
      WHERE job.product_id = product.id
        AND job.job_type = 'ai_pricing'
        AND job.status <> 'archived'
    ) job_stats ON TRUE
    LEFT JOIN LATERAL (
      SELECT run.status, run.started_at, run.error_message
      FROM collector_jobs scoped_job
      JOIN collector_job_runs run ON run.job_id = scoped_job.id
      WHERE scoped_job.product_id = product.id
        AND scoped_job.job_type = 'ai_pricing'
      ORDER BY run.started_at DESC
      LIMIT 1
    ) latest_run ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        MAX(run.started_at) FILTER (WHERE run.status = 'succeeded') AS latest_success_at,
        COALESCE(BOOL_OR(
          run.status = 'succeeded'
          AND run.started_at > NOW() - INTERVAL '12 hours'
        ), FALSE) AS has_fresh_success
      FROM collector_jobs scoped_job
      JOIN collector_job_runs run ON run.job_id = scoped_job.id
      WHERE scoped_job.product_id = product.id
        AND scoped_job.job_type = 'ai_pricing'
    ) latest_success ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*)::int AS pending_observation_count,
        COUNT(*) FILTER (WHERE COALESCE(observation.anomaly_flag, FALSE))::int AS blocked_observation_count,
        COUNT(*) FILTER (WHERE observation.raw_payload ->> 'auto_review_reason_code' = 'waiting_for_more_app_store_samples')::int AS waiting_observation_count,
        COUNT(*) FILTER (WHERE observation.raw_payload ->> 'auto_review_reason_code' = 'app_store_price_changed')::int AS changed_observation_count,
        COUNT(*) FILTER (WHERE observation.raw_payload ->> 'auto_review_reason_code' = 'low_confidence')::int AS low_confidence_observation_count
      FROM price_observations observation
      WHERE observation.product_id = product.id
        AND observation.status = 'pending'::observation_status
        AND observation.billing_platform = 'ios'::billing_platform
    ) observation_stats ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*)::int AS published_price_count,
        COUNT(DISTINCT price.country_id)::int AS published_region_count
      FROM region_prices price
      WHERE price.product_id = product.id
        AND price.status = 'published'::publish_status
    ) published_stats ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS discovery_candidate_count
      FROM product_discovery_candidates candidate
      WHERE candidate.promoted_product_id = product.id
        OR candidate.matched_product_id = product.id
    ) candidate_stats ON TRUE
    WHERE product.status <> 'archived'::publish_status
      ${searchFilter}
      ${categoryFilter}
    ORDER BY
      CASE
        WHEN COALESCE(observation_stats.pending_observation_count, 0) > 0 THEN 0
        WHEN COALESCE(job_stats.app_store_job_count, 0) <= 0 THEN 1
        WHEN latest_run.status = 'failed' THEN 2
        WHEN latest_success.latest_success_at IS NULL THEN 3
        WHEN COALESCE(published_stats.published_price_count, 0) <= 0 THEN 4
        ELSE 5
      END,
      COALESCE(observation_stats.pending_observation_count, 0) DESC,
      product.category ASC,
      product.sort_order ASC,
      product.name ASC
    LIMIT 120
  `;
}

async function getPipelineStats() {
  const rows = await prisma.$queryRaw<PipelineStatsRow[]>`
    WITH product_status AS (
      SELECT
        product.id,
        COALESCE(job_stats.app_store_job_count, 0) AS app_store_job_count,
        COALESCE(job_stats.due_job_count, 0) AS due_job_count,
        latest_run.status AS latest_run_status,
        latest_success.latest_success_at,
        COALESCE(observation_stats.pending_observation_count, 0) AS pending_observation_count,
        COALESCE(published_stats.published_price_count, 0) AS published_price_count
      FROM products product
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*) FILTER (WHERE source.type = 'app_store'::price_source_type)::int AS app_store_job_count,
          COUNT(*) FILTER (WHERE job.status = 'active' AND (job.next_run_at IS NULL OR job.next_run_at <= NOW()))::int AS due_job_count
        FROM collector_jobs job
        LEFT JOIN price_sources source ON source.id = job.source_id
        WHERE job.product_id = product.id
          AND job.job_type = 'ai_pricing'
          AND job.status <> 'archived'
      ) job_stats ON TRUE
      LEFT JOIN LATERAL (
        SELECT run.status
        FROM collector_jobs scoped_job
        JOIN collector_job_runs run ON run.job_id = scoped_job.id
        WHERE scoped_job.product_id = product.id
          AND scoped_job.job_type = 'ai_pricing'
        ORDER BY run.started_at DESC
        LIMIT 1
      ) latest_run ON TRUE
      LEFT JOIN LATERAL (
        SELECT MAX(run.started_at) FILTER (WHERE run.status = 'succeeded') AS latest_success_at
        FROM collector_jobs scoped_job
        JOIN collector_job_runs run ON run.job_id = scoped_job.id
        WHERE scoped_job.product_id = product.id
          AND scoped_job.job_type = 'ai_pricing'
      ) latest_success ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS pending_observation_count
        FROM price_observations observation
        WHERE observation.product_id = product.id
          AND observation.status = 'pending'::observation_status
          AND observation.billing_platform = 'ios'::billing_platform
      ) observation_stats ON TRUE
      LEFT JOIN LATERAL (
        SELECT COUNT(*)::int AS published_price_count
        FROM region_prices price
        WHERE price.product_id = product.id
          AND price.status = 'published'::publish_status
      ) published_stats ON TRUE
      WHERE product.status <> 'archived'::publish_status
    )
    SELECT
      COUNT(*)::int AS product_count,
      COUNT(*) FILTER (WHERE pending_observation_count = 0 AND published_price_count > 0)::int AS ready_count,
      COUNT(*) FILTER (WHERE app_store_job_count <= 0)::int AS setup_count,
      COUNT(*) FILTER (WHERE pending_observation_count > 0)::int AS pending_count,
      COUNT(*) FILTER (WHERE latest_run_status = 'failed')::int AS failed_count,
      COUNT(*) FILTER (WHERE due_job_count > 0)::int AS due_count,
      COUNT(*) FILTER (WHERE latest_run_status = 'running')::int AS running_count,
      COUNT(*) FILTER (
        WHERE published_price_count > 0
          AND (
            latest_success_at IS NULL
            OR latest_success_at < NOW() - INTERVAL '24 hours'
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
      href: "/admin/collector-jobs",
      action: "查看运行记录",
      className: "border-blue-200 bg-blue-50 text-blue-950",
    };
  }

  if (stats.failedCount > 0) {
    return {
      title: "先处理采集失败",
      body: `${stats.failedCount} 个产品最近采集失败。优先看失败原因，否则后续审核会一直缺样本。`,
      href: "/admin/collector-jobs",
      action: "查看失败任务",
      className: "border-red-200 bg-red-50 text-red-950",
    };
  }

  if (stats.setupCount > 0) {
    return {
      title: "先补采集任务",
      body: `${stats.setupCount} 个产品还没有 App Store 采集任务。没有任务就不会自动抓价，也不会进入审核。`,
      href: "/admin/discovery",
      action: "去线索入口",
      className: "border-amber-200 bg-amber-50 text-amber-950",
    };
  }

  if (stats.pendingCount > 0) {
    return {
      title: "需要处理待决价格",
      body: `${stats.pendingCount} 个产品有待决观测。系统会自动放行稳定价格，硬异常会保留到规则修正或重新采集。`,
      href: "/admin/review",
      action: "查看待决",
      className: "border-blue-200 bg-blue-50 text-blue-950",
    };
  }

  if (stats.dueCount > 0) {
    return {
      title: "有产品到期可复采",
      body: `${stats.dueCount} 个产品已到定时采集时间。可以交给后台任务，也可以在下方按产品手动触发。`,
      href: "/admin/collector-jobs",
      action: "查看到期任务",
      className: "border-emerald-200 bg-emerald-50 text-emerald-950",
    };
  }

  if (stats.staleCount > 0) {
    return {
      title: "上线价格需要定期复核",
      body: `${stats.staleCount} 个已上线产品超过 24 小时没有成功采集记录。建议下一轮后台任务优先复采。`,
      href: "/admin/collector-jobs",
      action: "查看采集任务",
      className: "border-slate-200 bg-slate-50 text-slate-950",
    };
  }

  return {
    title: "采集流水线稳定",
    body: "当前没有明显阻塞。新增产品从线索入口进入，已有产品按计划复采并自动审核。",
    href: "/admin/system",
    action: "查看系统状态",
    className: "border-emerald-200 bg-emerald-50 text-emerald-950",
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

function PipelineRecommendation({ stats }: { stats: PipelineStats }) {
  const recommendation = getPipelineRecommendation(stats);

  return (
    <div className={`mb-6 rounded-3xl border p-5 ${recommendation.className}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-sm font-black">系统建议</div>
          <h2 className="mt-1 text-xl font-black">{recommendation.title}</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 opacity-80">
            {recommendation.body}
          </p>
        </div>
        <Link
          href={recommendation.href}
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-white/80 px-4 text-sm font-black text-slate-950 ring-1 ring-current/10 transition hover:bg-white"
        >
          {recommendation.action}
        </Link>
      </div>
    </div>
  );
}

function PipelineStateBadge({ row }: { row: PipelineProductRow }) {
  const state = getPipelineState(row);
  const Icon = state.icon;

  return (
    <div
      className={joinClasses(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black ring-1",
        state.className
      )}
      title={state.detail}
    >
      <Icon size={13} strokeWidth={2.4} />
      {state.label}
    </div>
  );
}

function ProductPipelineCard({ row }: { row: PipelineProductRow }) {
  const state = getPipelineState(row);
  const pendingCount = toNumber(row.pending_observation_count);
  const blockedCount = toNumber(row.blocked_observation_count);
  const appStoreJobs = toNumber(row.app_store_job_count);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/50">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-black text-slate-950">{row.product_name}</h3>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">
              {categoryLabel(row.product_category)}
            </span>
            <PipelineStateBadge row={row} />
          </div>
          <div className="mt-1 font-mono text-xs text-slate-400">
            {row.product_slug} · {row.provider || "未填服务商"} · {productStatusLabel(row.product_status)}
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            {state.detail}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {appStoreJobs > 0 ? (
            <ManualCollectionProgressForm
              productSlug={row.product_slug}
              buttonLabel="采集这个产品"
              pendingLabel="正在采集"
            />
          ) : (
            <Link
              href={`/admin/products/${row.product_id}/edit`}
              className="inline-flex h-9 items-center rounded-lg border border-amber-200 bg-amber-50 px-3 text-xs font-black text-amber-700 transition hover:bg-amber-100"
            >
              补 App Store
            </Link>
          )}
          <Link
            href={`/admin/review?q=${encodeURIComponent(row.product_slug)}`}
            className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:bg-slate-50"
          >
            查看异常
          </Link>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <div className="rounded-2xl bg-slate-50 p-3">
          <div className="text-xs font-bold text-slate-400">采集任务</div>
          <div className="mt-1 text-lg font-black text-slate-950">
            {appStoreJobs} / {toNumber(row.total_job_count)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            启用 {toNumber(row.active_job_count)}，到期 {toNumber(row.due_job_count)}
          </div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <div className="text-xs font-bold text-slate-400">最近采集</div>
          <div className="mt-1 text-sm font-black text-slate-950">
            {runStatusLabel(row.latest_run_status)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {formatDate(row.latest_run_started_at)}
          </div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <div className="text-xs font-bold text-slate-400">异常待决</div>
          <div className="mt-1 text-lg font-black text-slate-950">{pendingCount}</div>
          <div className="mt-1 text-xs text-slate-500">
            硬异常 {blockedCount}，补样本 {toNumber(row.waiting_observation_count)}
          </div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <div className="text-xs font-bold text-slate-400">正式价格</div>
          <div className="mt-1 text-lg font-black text-slate-950">
            {toNumber(row.published_price_count)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            地区 {toNumber(row.published_region_count)}，套餐 {toNumber(row.plan_count)}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          {row.has_fresh_success ? (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 ring-1 ring-emerald-200">
              12 小时内成功采集
            </span>
          ) : null}
          {toNumber(row.changed_observation_count) > 0 ? (
            <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700 ring-1 ring-blue-200">
              价格变化 {toNumber(row.changed_observation_count)}
            </span>
          ) : null}
          {toNumber(row.low_confidence_observation_count) > 0 ? (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700 ring-1 ring-amber-200">
              低可信 {toNumber(row.low_confidence_observation_count)}
            </span>
          ) : null}
          {toNumber(row.discovery_candidate_count) > 0 ? (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600 ring-1 ring-slate-200">
              来自线索 {toNumber(row.discovery_candidate_count)}
            </span>
          ) : null}
        </div>
        <div className="flex gap-3 text-xs font-black">
          <Link href={`/admin/products/${row.product_id}/edit`} className="text-blue-700 hover:text-blue-900">
            产品资料
          </Link>
          <Link href="/admin/collector-jobs" className="text-blue-700 hover:text-blue-900">
            采集任务
          </Link>
          <Link href="/admin/prices" className="text-blue-700 hover:text-blue-900">
            正式价格
          </Link>
        </div>
      </div>
    </div>
  );
}

export default async function AdminPipelinePage({
  searchParams,
}: {
  searchParams?: Promise<{
    q?: string;
    category?: string;
  }>;
}) {
  const params = searchParams ? await searchParams : {};
  const q = String(params.q ?? "").trim();
  const category = categories.some((item) => item.value === params.category)
    ? String(params.category)
    : "all";
  let rows: PipelineProductRow[] = [];
  let stats: PipelineStats = emptyPipelineStats();
  let loadError: string | null = null;

  try {
    [rows, stats] = await Promise.all([
      getPipelineRows({ q, category }),
      getPipelineStats(),
    ]);
  } catch (error) {
    loadError = getErrorMessage(error);
  }

  return (
    <div>
      <AdminPageHeader
        eyebrow="Pipeline"
        title="价格采集流水线"
        description="后台主入口按产品聚合：先看产品有没有 App Store 采集任务，再看最近是否采集成功、是否有异常待决、是否已有正式价格。"
        action={
          <Link
            href="/admin/discovery"
            className="inline-flex h-10 items-center rounded-xl bg-blue-700 px-4 text-sm font-black text-white shadow-sm transition hover:bg-blue-800"
          >
            新增线索
          </Link>
        }
      />

      <AdminPipelineSteps currentStep="pipeline" />

      {loadError ? (
        <AdminCard className="mb-6 border-amber-200 bg-amber-50">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-sm font-black text-amber-700">数据库未连接</div>
              <h2 className="mt-1 text-xl font-black text-slate-950">
                暂时无法读取采集流水线
              </h2>
              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
                请先启动本地 PostgreSQL，再刷新本页。当前错误：{loadError.slice(0, 180)}
              </p>
            </div>
            <Link
              href="/admin/system"
              className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-white px-4 text-sm font-black text-amber-700 ring-1 ring-amber-200 transition hover:bg-amber-100"
            >
              查看系统状态
            </Link>
          </div>
        </AdminCard>
      ) : (
        <PipelineRecommendation stats={stats} />
      )}

      <div className="mb-6 grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        <AdminCard>
          <div className="text-sm font-bold text-slate-500">产品</div>
          <div className="mt-2 text-2xl font-black text-slate-950">{stats.productCount}</div>
          <div className="mt-2 text-sm text-slate-500">当前服务库产品。</div>
        </AdminCard>
        <AdminCard>
          <div className="text-sm font-bold text-slate-500">缺任务</div>
          <div className="mt-2 text-2xl font-black text-amber-700">{stats.setupCount}</div>
          <div className="mt-2 text-sm text-slate-500">需要补 App Store 链接。</div>
        </AdminCard>
        <AdminCard>
          <div className="text-sm font-bold text-slate-500">待审核</div>
          <div className="mt-2 text-2xl font-black text-blue-700">{stats.pendingCount}</div>
          <div className="mt-2 text-sm text-slate-500">有待决价格观测。</div>
        </AdminCard>
        <AdminCard>
          <div className="text-sm font-bold text-slate-500">失败</div>
          <div className="mt-2 text-2xl font-black text-red-700">{stats.failedCount}</div>
          <div className="mt-2 text-sm text-slate-500">最近采集失败。</div>
        </AdminCard>
        <AdminCard>
          <div className="text-sm font-bold text-slate-500">到期复采</div>
          <div className="mt-2 text-2xl font-black text-slate-950">{stats.dueCount}</div>
          <div className="mt-2 text-sm text-slate-500">可由后台任务处理。</div>
        </AdminCard>
        <AdminCard>
          <div className="text-sm font-bold text-slate-500">正式价格</div>
          <div className="mt-2 text-2xl font-black text-emerald-700">{stats.publishedPriceCount}</div>
          <div className="mt-2 text-sm text-slate-500">已上线价格记录。</div>
        </AdminCard>
      </div>

      <AdminCard className="mb-6">
        <form className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-base font-black text-slate-950">筛选产品</h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              搜产品名或 slug，常用场景是输入 Netflix、Grok、ChatGPT 后只处理这一个产品。
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative block">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                name="q"
                defaultValue={q}
                placeholder="搜索产品"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white pr-3 pl-9 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 sm:w-64"
              />
            </label>
            <select
              name="category"
              defaultValue={category}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10"
            >
              {categories.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="h-10 rounded-xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800"
            >
              筛选
            </button>
            {q || category !== "all" ? (
              <Link
                href="/admin/pipeline"
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-black text-slate-600 transition hover:bg-slate-50"
              >
                清除
              </Link>
            ) : null}
          </div>
        </form>
      </AdminCard>

      <div className="grid gap-4">
        {rows.map((row) => (
          <ProductPipelineCard key={row.product_id} row={row} />
        ))}

        {rows.length === 0 && !loadError ? (
          <AdminCard>
            <div className="py-12 text-center">
              <div className="text-base font-black text-slate-950">没有匹配的产品</div>
              <p className="mt-2 text-sm text-slate-500">
                可以清除筛选，或者先从线索入口加入新产品。
              </p>
              <Link
                href="/admin/discovery"
                className="mt-5 inline-flex h-10 items-center rounded-xl bg-blue-700 px-4 text-sm font-black text-white transition hover:bg-blue-800"
              >
                去线索入口
              </Link>
            </div>
          </AdminCard>
        ) : null}
      </div>
    </div>
  );
}

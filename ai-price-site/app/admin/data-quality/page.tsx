import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  DatabaseZap,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import {
  AdminCard,
  AdminPageHeader,
  AdminStatCard,
} from "../../../components/admin/AdminCard";
import { prisma } from "../../../lib/prisma";
import ManualCollectionProgressForm from "../review/ManualCollectionProgressForm";

export const dynamic = "force-dynamic";

type ProductQualityRow = {
  id: string;
  slug: string;
  name: string;
  category: string;
  status: string;
  plan_count: number;
  active_app_store_job_count: number;
  queued_job_count: number;
  stale_queue_count: number;
  latest_queued_at: Date | string | null;
  running_run_count: number;
  latest_run_status: string | null;
  latest_run_started_at: Date | string | null;
  latest_run_finished_at: Date | string | null;
  latest_run_error: string | null;
  latest_runner_state: string | null;
  latest_run_age_seconds: number | null;
  published_price_count: number;
  published_country_count: number;
  app_store_price_count: number;
  stale_published_count: number;
  latest_price_checked_at: Date | string | null;
  pending_observation_count: number;
  pending_app_store_count: number;
  pending_anomaly_count: number;
  hard_anomaly_count: number;
  latest_observed_at: Date | string | null;
  review_reason_codes: string | null;
};

type HealthLevel = "good" | "info" | "warning" | "danger";

type ProductHealth = {
  level: HealthLevel;
  label: string;
  reason: string;
  nextAction: string;
};

function toDate(value: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: Date | string | null) {
  const date = toDate(value);
  if (!date) return "暂无";

  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelative(value: Date | string | null) {
  const date = toDate(value);
  if (!date) return "从未";

  const diff = Date.now() - date.getTime();
  const minutes = Math.max(0, Math.floor(diff / 60_000));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} 天前`;
  if (hours > 0) return `${hours} 小时前`;
  if (minutes > 0) return `${minutes} 分钟前`;
  return "刚刚";
}

function formatDuration(seconds: number | null) {
  if (!seconds) return "未记录";
  if (seconds < 60) return `${seconds} 秒`;

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} 分钟`;

  const hours = Math.round(minutes / 60);
  return `${hours} 小时`;
}

function hasUnconsumedQueue(row: ProductQualityRow) {
  const latestRunAt = toDate(row.latest_run_started_at);
  const latestQueuedAt = toDate(row.latest_queued_at);

  return Boolean(latestQueuedAt && (!latestRunAt || latestQueuedAt > latestRunAt));
}

function categoryLabel(category: string) {
  const labels: Record<string, string> = {
    ai: "AI 订阅",
    streaming: "流媒体",
    software: "软件",
    game: "游戏",
    gift_card: "礼品卡",
    vpn: "VPN",
    payment: "支付",
    other: "其他",
  };

  return labels[category] || category;
}

function getProductHealth(row: ProductQualityRow): ProductHealth {
  if (row.running_run_count > 0 || row.latest_run_status === "running") {
    return {
      level: "info",
      label: "正在采集",
      reason: "后台采集脚本正在执行，完成后会自动写回结果。",
      nextAction: "等待脚本完成",
    };
  }

  if (row.active_app_store_job_count <= 0) {
    return {
      level: "danger",
      label: "缺少采集任务",
      reason: "没有可运行的 App Store 采集任务，新增产品会卡在服务库里。",
      nextAction: "补充采集任务",
    };
  }

  if (row.latest_run_status === "failed") {
    return {
      level: "danger",
      label: "采集失败",
      reason: row.latest_run_error || "最近一次采集失败，需要先看失败原因。",
      nextAction: "查看采集任务",
    };
  }

  if (row.hard_anomaly_count > 0) {
    return {
      level: "danger",
      label: "硬异常拦截",
      reason: "系统认为有币种、周期或小数点级别的高风险异常，不能自动上线。",
      nextAction: "查看异常明细",
    };
  }

  if (row.published_price_count <= 0) {
    return {
      level: "danger",
      label: "未上线",
      reason: "还没有正式价格，前台不会可靠展示这个产品。",
      nextAction: "立即采集",
    };
  }

  if (row.queued_job_count > 0 && hasUnconsumedQueue(row)) {
    return {
      level: "info",
      label: "已排队",
      reason: "采集任务刚刚进入下一轮队列，等待后台脚本接管。",
      nextAction: "等待脚本完成",
    };
  }

  if (row.stale_queue_count > 0 && hasUnconsumedQueue(row)) {
    return {
      level: "warning",
      label: "队列未消费",
      reason: "任务处于待运行状态已超过 15 分钟，可能是后台调度没有接管。",
      nextAction: "检查采集任务",
    };
  }

  if (row.pending_anomaly_count > 0) {
    return {
      level: "warning",
      label: "异常待处理",
      reason: "自动审核没有直接放行这些价格，但它们不会影响已上线稳定价格。",
      nextAction: "查看异常明细",
    };
  }

  if (row.pending_observation_count >= 80) {
    return {
      level: "warning",
      label: "待审核积压",
      reason: "待审核记录偏多，建议按产品重新采集或让自动审核再跑一轮。",
      nextAction: "按产品处理",
    };
  }

  if (row.stale_published_count > 0) {
    return {
      level: "warning",
      label: "价格需复采",
      reason: "部分正式价格超过 7 天没有刷新，不适合继续当作最新价格。",
      nextAction: "重新采集",
    };
  }

  if (!row.latest_run_started_at) {
    return {
      level: "warning",
      label: "从未采集",
      reason: "产品有采集任务，但还没有实际运行记录。",
      nextAction: "立即采集",
    };
  }

  return {
    level: "good",
    label: "健康",
    reason: "采集、审核和正式价格状态稳定，日常无需手工介入。",
    nextAction: "保持观察",
  };
}

function healthPriority(level: HealthLevel) {
  if (level === "danger") return 1;
  if (level === "warning") return 2;
  if (level === "info") return 3;
  return 4;
}

function healthClasses(level: HealthLevel) {
  if (level === "good") {
    return {
      badge: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      dot: "bg-emerald-500",
      row: "border-emerald-100 bg-emerald-50/30",
    };
  }

  if (level === "info") {
    return {
      badge: "bg-blue-50 text-blue-700 ring-blue-200",
      dot: "bg-blue-500",
      row: "border-blue-100 bg-blue-50/30",
    };
  }

  if (level === "warning") {
    return {
      badge: "bg-amber-50 text-amber-700 ring-amber-200",
      dot: "bg-amber-500",
      row: "border-amber-100 bg-amber-50/30",
    };
  }

  return {
    badge: "bg-red-50 text-red-700 ring-red-200",
    dot: "bg-red-500",
    row: "border-red-100 bg-red-50/30",
  };
}

function healthIcon(level: HealthLevel) {
  if (level === "good") return CheckCircle2;
  if (level === "info") return Loader2;
  if (level === "warning") return AlertTriangle;
  return ShieldAlert;
}

function countByHealth(rows: ProductQualityRow[], level: HealthLevel) {
  return rows.filter((row) => getProductHealth(row).level === level).length;
}

async function getProductQualityRows() {
  return prisma.$queryRaw<ProductQualityRow[]>`
    WITH product_base AS (
      SELECT
        product.id,
        product.slug,
        product.name,
        product.category::text AS category,
        product.status::text AS status
      FROM products product
      WHERE product.status::text <> 'archived'
    ),
    plan_state AS (
      SELECT
        plan.product_id,
        COUNT(*)::int AS plan_count
      FROM plans plan
      GROUP BY plan.product_id
    ),
    price_state AS (
      SELECT
        price.product_id,
        COUNT(*) FILTER (WHERE price.status::text = 'published')::int AS published_price_count,
        COUNT(DISTINCT price.country_id) FILTER (WHERE price.status::text = 'published')::int AS published_country_count,
        COUNT(*) FILTER (
          WHERE price.status::text = 'published'
            AND price.billing_platform::text = 'ios'
        )::int AS app_store_price_count,
        COUNT(*) FILTER (
          WHERE price.status::text = 'published'
            AND (
              price.last_checked_at IS NULL
              OR price.last_checked_at < NOW() - INTERVAL '7 days'
            )
        )::int AS stale_published_count,
        MAX(price.last_checked_at) FILTER (WHERE price.status::text = 'published') AS latest_price_checked_at
      FROM region_prices price
      GROUP BY price.product_id
    ),
    observation_state AS (
      SELECT
        observation.product_id,
        COUNT(*) FILTER (WHERE observation.status::text = 'pending')::int AS pending_observation_count,
        COUNT(*) FILTER (
          WHERE observation.status::text = 'pending'
            AND observation.billing_platform::text = 'ios'
        )::int AS pending_app_store_count,
        COUNT(*) FILTER (
          WHERE observation.status::text = 'pending'
            AND observation.anomaly_flag
        )::int AS pending_anomaly_count,
        COUNT(*) FILTER (
          WHERE observation.status::text = 'pending'
            AND (
              observation.anomaly_flag
              OR lower(COALESCE(observation.anomaly_reason, '')) LIKE '%hard%'
              OR COALESCE(observation.raw_payload ->> 'auto_review_reason_code', '') IN (
                'app_store_global_price_outlier',
                'app_store_hard_anomaly_guard',
                'hard_price_guard'
              )
            )
        )::int AS hard_anomaly_count,
        MAX(observation.observed_at) AS latest_observed_at,
        string_agg(
          DISTINCT NULLIF(COALESCE(
            observation.raw_payload ->> 'auto_review_reason_code',
            observation.anomaly_reason
          ), ''),
          ', '
        ) FILTER (WHERE observation.status::text = 'pending') AS review_reason_codes
      FROM price_observations observation
      GROUP BY observation.product_id
    ),
    job_state AS (
      SELECT
        job.product_id,
        COUNT(*) FILTER (
          WHERE source.type::text = 'app_store'
            AND job.status <> 'archived'
        )::int AS active_app_store_job_count,
        COUNT(*) FILTER (
          WHERE source.type::text = 'app_store'
            AND job.status = 'active'
            AND job.priority >= 100
            AND (
              job.next_run_at IS NULL
              OR job.next_run_at <= NOW()
            )
            AND job.updated_at > NOW() - INTERVAL '15 minutes'
        )::int AS queued_job_count
        ,
        COUNT(*) FILTER (
          WHERE source.type::text = 'app_store'
            AND job.status = 'active'
            AND job.priority >= 100
            AND (
              job.next_run_at IS NULL
              OR job.next_run_at <= NOW()
            )
            AND job.updated_at <= NOW() - INTERVAL '15 minutes'
        )::int AS stale_queue_count,
        MAX(job.updated_at) FILTER (
          WHERE source.type::text = 'app_store'
            AND job.status = 'active'
            AND job.priority >= 100
            AND (
              job.next_run_at IS NULL
              OR job.next_run_at <= NOW()
            )
        ) AS latest_queued_at
      FROM collector_jobs job
      LEFT JOIN price_sources source ON source.id = job.source_id
      WHERE job.product_id IS NOT NULL
      GROUP BY job.product_id
    ),
    running_state AS (
      SELECT
        COALESCE(run.product_id, job.product_id) AS product_id,
        COUNT(*) FILTER (
          WHERE run.status = 'running'
            AND run.started_at > NOW() - INTERVAL '20 minutes'
        )::int AS running_run_count
      FROM collector_job_runs run
      LEFT JOIN collector_jobs job ON job.id = run.job_id
      LEFT JOIN price_sources source ON source.id = COALESCE(run.source_id, job.source_id)
      WHERE COALESCE(run.product_id, job.product_id) IS NOT NULL
        AND source.type::text = 'app_store'
      GROUP BY COALESCE(run.product_id, job.product_id)
    ),
    latest_run AS (
      SELECT DISTINCT ON (COALESCE(run.product_id, job.product_id))
        COALESCE(run.product_id, job.product_id) AS product_id,
        run.status AS latest_run_status,
        run.started_at AS latest_run_started_at,
        run.finished_at AS latest_run_finished_at,
        run.error_message AS latest_run_error,
        run.raw_payload ->> 'state' AS latest_runner_state,
        CASE
          WHEN run.started_at IS NULL THEN NULL
          ELSE GREATEST(0, EXTRACT(EPOCH FROM (COALESCE(run.finished_at, NOW()) - run.started_at)))::int
        END AS latest_run_age_seconds
      FROM collector_job_runs run
      LEFT JOIN collector_jobs job ON job.id = run.job_id
      LEFT JOIN price_sources source ON source.id = COALESCE(run.source_id, job.source_id)
      WHERE COALESCE(run.product_id, job.product_id) IS NOT NULL
        AND source.type::text = 'app_store'
      ORDER BY COALESCE(run.product_id, job.product_id), run.started_at DESC
    )
    SELECT
      product.id::text,
      product.slug,
      product.name,
      product.category,
      product.status,
      COALESCE(plan_state.plan_count, 0)::int AS plan_count,
      COALESCE(job_state.active_app_store_job_count, 0)::int AS active_app_store_job_count,
      COALESCE(job_state.queued_job_count, 0)::int AS queued_job_count,
      COALESCE(job_state.stale_queue_count, 0)::int AS stale_queue_count,
      job_state.latest_queued_at,
      COALESCE(running_state.running_run_count, 0)::int AS running_run_count,
      latest_run.latest_run_status,
      latest_run.latest_run_started_at,
      latest_run.latest_run_finished_at,
      latest_run.latest_run_error,
      latest_run.latest_runner_state,
      latest_run.latest_run_age_seconds,
      COALESCE(price_state.published_price_count, 0)::int AS published_price_count,
      COALESCE(price_state.published_country_count, 0)::int AS published_country_count,
      COALESCE(price_state.app_store_price_count, 0)::int AS app_store_price_count,
      COALESCE(price_state.stale_published_count, 0)::int AS stale_published_count,
      price_state.latest_price_checked_at,
      COALESCE(observation_state.pending_observation_count, 0)::int AS pending_observation_count,
      COALESCE(observation_state.pending_app_store_count, 0)::int AS pending_app_store_count,
      COALESCE(observation_state.pending_anomaly_count, 0)::int AS pending_anomaly_count,
      COALESCE(observation_state.hard_anomaly_count, 0)::int AS hard_anomaly_count,
      observation_state.latest_observed_at,
      observation_state.review_reason_codes
    FROM product_base product
    LEFT JOIN plan_state ON plan_state.product_id = product.id
    LEFT JOIN price_state ON price_state.product_id = product.id
    LEFT JOIN observation_state ON observation_state.product_id = product.id
    LEFT JOIN job_state ON job_state.product_id = product.id
    LEFT JOIN running_state ON running_state.product_id = product.id
    LEFT JOIN latest_run ON latest_run.product_id = product.id
    ORDER BY
      CASE
        WHEN COALESCE(running_state.running_run_count, 0) > 0 THEN 1
        WHEN COALESCE(job_state.active_app_store_job_count, 0) <= 0 THEN 2
        WHEN latest_run.latest_run_status = 'failed' THEN 3
        WHEN COALESCE(observation_state.hard_anomaly_count, 0) > 0 THEN 4
        WHEN COALESCE(price_state.published_price_count, 0) <= 0 THEN 5
        WHEN COALESCE(job_state.queued_job_count, 0) > 0 THEN 6
        WHEN COALESCE(job_state.stale_queue_count, 0) > 0 THEN 7
        WHEN COALESCE(observation_state.pending_anomaly_count, 0) > 0 THEN 8
        WHEN COALESCE(observation_state.pending_observation_count, 0) >= 80 THEN 9
        WHEN COALESCE(price_state.stale_published_count, 0) > 0 THEN 10
        ELSE 11
      END,
      COALESCE(observation_state.pending_observation_count, 0) DESC,
      product.name ASC
  `;
}

export default async function AdminDataQualityPage() {
  const rows = (await getProductQualityRows()).sort((a, b) => {
    const healthA = getProductHealth(a);
    const healthB = getProductHealth(b);
    const priorityDiff = healthPriority(healthA.level) - healthPriority(healthB.level);

    if (priorityDiff !== 0) return priorityDiff;
    if (a.pending_observation_count !== b.pending_observation_count) {
      return b.pending_observation_count - a.pending_observation_count;
    }

    return a.name.localeCompare(b.name, "zh-CN");
  });
  const goodCount = countByHealth(rows, "good");
  const infoCount = countByHealth(rows, "info");
  const warningCount = countByHealth(rows, "warning");
  const dangerCount = countByHealth(rows, "danger");
  const pendingTotal = rows.reduce(
    (sum, row) => sum + row.pending_observation_count,
    0
  );
  const staleTotal = rows.reduce((sum, row) => sum + row.stale_published_count, 0);

  return (
    <div>
      <AdminPageHeader
        eyebrow="数据质量"
        title="产品数据健康总览"
        description="把采集、自动审核、异常拦截和正式价格按产品归因。日常先看这里，只处理红色和橙色产品，不再逐条翻待审核记录。"
        action={
          <Link
            href="/admin/collector-jobs"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            查看采集任务
            <ArrowRight size={16} strokeWidth={2} />
          </Link>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <AdminStatCard label="产品总数" value={rows.length} helper="服务库内未归档产品" />
        <AdminStatCard label="健康" value={goodCount} helper="无需手工处理" />
        <AdminStatCard label="采集中/排队" value={infoCount} helper="等待后台脚本写回" />
        <AdminStatCard label="需关注" value={warningCount} helper="建议复采或看原因" />
        <AdminStatCard label="需处理" value={dangerCount} helper="会影响上线或采集" />
      </div>

      <AdminCard className="mb-6 border-blue-200 bg-blue-50/70">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-3">
            <span className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
              <DatabaseZap size={20} strokeWidth={2.2} />
            </span>
            <div>
              <h2 className="text-base font-bold text-blue-950">
                后台判断规则
              </h2>
              <p className="mt-1 max-w-4xl text-sm leading-6 text-blue-800">
                绿色产品不需要反复采集。红色代表缺任务、采集失败、硬异常或没有正式价格；橙色代表待审核积压、异常样本或价格超过 7 天未刷新。这样可以把手工维护从“几百条记录”压缩成“几个产品的下一步动作”。
              </p>
            </div>
          </div>

          <div className="grid min-w-[260px] grid-cols-2 gap-2 text-xs font-semibold text-blue-800">
            <div className="rounded-xl bg-white/70 px-3 py-2">
              待审核总量：{pendingTotal}
            </div>
            <div className="rounded-xl bg-white/70 px-3 py-2">
              需复采价格：{staleTotal}
            </div>
          </div>
        </div>
      </AdminCard>

      <AdminCard>
        <div className="mb-5 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              产品级处理队列
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              一行代表一个产品。需要处理时先看“结论”和“下一步”，再进入对应的审核或采集页面。
            </p>
          </div>
          <p className="text-xs font-semibold text-slate-400">
            更新时间：{formatDate(new Date())}
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <div className="hidden grid-cols-[1.25fr_0.65fr_0.8fr_0.9fr_0.9fr_1.1fr_0.8fr] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-500 lg:grid">
            <div>产品</div>
            <div>正式价格</div>
            <div>待处理</div>
            <div>采集状态</div>
            <div>最近更新</div>
            <div>结论</div>
            <div className="text-right">操作</div>
          </div>

          <div className="divide-y divide-slate-100">
            {rows.map((row) => {
              const health = getProductHealth(row);
              const classes = healthClasses(health.level);
              const Icon = healthIcon(health.level);
              const unconsumedQueue = hasUnconsumedQueue(row);

              return (
                <div
                  key={row.id}
                  className={[
                    "grid gap-4 px-4 py-4 text-sm lg:grid-cols-[1.25fr_0.65fr_0.8fr_0.9fr_0.9fr_1.1fr_0.8fr] lg:items-center",
                    classes.row,
                  ].join(" ")}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${classes.dot}`} />
                      <p className="font-bold text-slate-950">{row.name}</p>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {row.slug} · {categoryLabel(row.category)} · {row.plan_count} 个套餐
                    </p>
                  </div>

                  <div>
                    <p className="font-bold text-slate-950">
                      {row.published_price_count} 条
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {row.published_country_count} 地区
                    </p>
                  </div>

                  <div>
                    <p className="font-bold text-slate-950">
                      {row.pending_observation_count} 待审
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      异常 {row.pending_anomaly_count} · 硬异常 {row.hard_anomaly_count}
                    </p>
                  </div>

                  <div>
                    <span
                      className={[
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1",
                        classes.badge,
                      ].join(" ")}
                    >
                      <Icon size={13} strokeWidth={2.2} />
                      {health.label}
                    </span>
                    <p className="mt-1 text-xs text-slate-500">
                      App Store 任务 {row.active_app_store_job_count}
                      {row.stale_queue_count > 0 && unconsumedQueue
                        ? ` · 未消费 ${row.stale_queue_count}`
                        : ""}
                    </p>
                  </div>

                  <div>
                    <p className="font-semibold text-slate-700">
                      采集 {formatRelative(row.latest_run_started_at)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      价格 {formatRelative(row.latest_price_checked_at)}
                    </p>
                  </div>

                  <div>
                    <p className="font-semibold text-slate-800">{health.reason}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      最近运行：{row.latest_run_status || "暂无"} · {formatDuration(row.latest_run_age_seconds)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <ManualCollectionProgressForm
                      productSlug={row.slug}
                      buttonLabel="只采这个产品"
                      pendingLabel="正在采集"
                      disabled={
                        row.active_app_store_job_count <= 0 ||
                        row.running_run_count > 0 ||
                        row.latest_run_status === "running"
                      }
                    />
                    <Link
                      href={`/admin/review?q=${encodeURIComponent(row.slug)}`}
                      className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      审核
                    </Link>
                    <Link
                      href={`/admin/data-quality/${encodeURIComponent(row.slug)}`}
                      className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      诊断
                    </Link>
                    <Link
                      href={`/admin/collector-jobs?q=${encodeURIComponent(row.slug)}`}
                      className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                      任务
                    </Link>
                  </div>
                </div>
              );
            })}

            {rows.length === 0 ? (
              <div className="px-4 py-12 text-center text-sm text-slate-500">
                暂无产品数据。先从线索入口添加产品，再生成采集任务。
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
          <Clock3 size={15} className="mt-0.5 shrink-0" strokeWidth={2} />
          <p>
            这页只做产品级归因，不替代明细审核。若某个产品长期处于“已排队”或“正在采集”，优先进入采集任务页查看后台脚本是否卡住。
          </p>
        </div>
      </AdminCard>
    </div>
  );
}

import "server-only";

import { prisma } from "./prisma";
import type { HealthStatus } from "./system-health";

export type AutomationTask = {
  key: string;
  title: string;
  description: string;
  cadence: string;
  status: HealthStatus;
  stateLabel: string;
  latestRunAt: Date | string | null;
  latestSuccessAt: Date | string | null;
  nextExpectedAt: Date | string | null;
  durationSeconds: number | null;
  errorMessage: string | null;
  backlog: string;
  actionHref: string;
  actionLabel: string;
};

export type OperationalRecoveryIncident = {
  key: string;
  productSlug: string | null;
  productName: string;
  jobCount: number;
  state: string;
  label: string;
  detail: string;
  status: HealthStatus;
  actionHref: string;
};

export type OperationalRecoveryOverview = {
  status: HealthStatus;
  latestCycleAt: Date | string | null;
  latestTrigger: string | null;
  staleRunsRecovered: number;
  jobsRequeued: number;
  jobsQuarantined: number;
  retryingJobs: number;
  quarantinedJobs: number;
  staleRunningRuns: number;
  incidents: OperationalRecoveryIncident[];
};

type SystemTaskRunRow = {
  task_key: string;
  status: string;
  started_at: Date | string;
  finished_at: Date | string | null;
  latest_success_at: Date | string | null;
  duration_seconds: unknown;
  exit_code: unknown;
  error_message: string | null;
};

type AutomationBacklogRow = {
  due_collector_jobs: unknown;
  failed_collector_runs_24h: unknown;
  stale_published_prices: unknown;
  pending_anomalies: unknown;
  required_rates: unknown;
  fresh_rates: unknown;
  monitored_sources: unknown;
};

type OperationalRecoveryCycleRow = {
  trigger_kind: string;
  stale_runs_failed: unknown;
  stale_jobs_requeued: unknown;
  transient_jobs_requeued: unknown;
  permanent_jobs_quarantined: unknown;
  exhausted_jobs_quarantined: unknown;
  created_at: Date | string;
};

type OperationalRecoveryStatsRow = {
  retrying_jobs: unknown;
  quarantined_jobs: unknown;
  stale_running_runs: unknown;
};

type OperationalIncidentRow = {
  incident_key: string;
  product_slug: string | null;
  product_name: string | null;
  job_count: unknown;
  operational_state: string;
  last_error: string | null;
};

type TaskConfig = {
  key: string;
  title: string;
  description: string;
  cadence: string;
  cadenceHours: number;
  warningHours: number;
  criticalHours: number;
  maxRuntimeHours: number;
  actionHref: string;
  actionLabel: string;
};

const REQUIRED_EXCHANGE_RATE_QUOTES =
  "AED,ARS,AUD,BRL,CAD,CHF,CLP,CNY,COP,DKK,EGP,EUR,GBP,HKD,IDR,ILS,INR,JPY,KES,KRW,MXN,MYR,NGN,NOK,NZD,PHP,PKR,PLN,SAR,SEK,SGD,THB,TRY,TWD,VND,ZAR";

const TASK_CONFIGS: TaskConfig[] = [
  {
    key: "exchange_rate_sync",
    title: "汇率同步",
    description: "刷新前台美元折算与人民币显示使用的全部必需币种。",
    cadence: "每 12 小时",
    cadenceHours: 12,
    warningHours: 18,
    criticalHours: 30,
    maxRuntimeHours: 0.25,
    actionHref: "/admin/system#exchange-rate-sync",
    actionLabel: "查看汇率",
  },
  {
    key: "collector_runner",
    title: "采集任务执行器",
    description: "消费已到期的产品采集任务，并记录每次脚本运行结果。",
    cadence: "每 30 分钟",
    cadenceHours: 0.5,
    warningHours: 2,
    criticalHours: 6,
    maxRuntimeHours: 1,
    actionHref: "/admin/collector-jobs",
    actionLabel: "查看任务",
  },
  {
    key: "price_pipeline",
    title: "价格维护流水线",
    description: "处理过期价格、覆盖缺口、异常复采、自动审核与购买力刷新。",
    cadence: "每天",
    cadenceHours: 24,
    warningHours: 36,
    criticalHours: 60,
    maxRuntimeHours: 1,
    actionHref: "/admin/pipeline",
    actionLabel: "查看流水线",
  },
  {
    key: "discovery_scan",
    title: "线索源扫描",
    description: "检查长期监测来源是否出现新产品或套餐变化。",
    cadence: "每小时",
    cadenceHours: 1,
    warningHours: 3,
    criticalHours: 8,
    maxRuntimeHours: 0.5,
    actionHref: "/admin/discovery",
    actionLabel: "查看线索",
  },
  {
    key: "analytics_aggregation",
    title: "访问统计聚合",
    description: "把访问与点击事件汇总为后台趋势和商业漏斗数据。",
    cadence: "每 15 分钟",
    cadenceHours: 0.25,
    warningHours: 1,
    criticalHours: 3,
    maxRuntimeHours: 0.25,
    actionHref: "/admin",
    actionLabel: "查看总览",
  },
  {
    key: "database_backup",
    title: "数据库备份",
    description: "创建经过校验并带校验和的 PostgreSQL 私有备份。",
    cadence: "每天",
    cadenceHours: 24,
    warningHours: 36,
    criticalHours: 60,
    maxRuntimeHours: 1,
    actionHref: "/admin/system#database-backup",
    actionLabel: "查看状态",
  },
  {
    key: "event_retention",
    title: "事件日志清理",
    description: "按保留策略删除过期原始事件，控制数据库体积。",
    cadence: "每天",
    cadenceHours: 24,
    warningHours: 48,
    criticalHours: 72,
    maxRuntimeHours: 0.5,
    actionHref: "/admin/events",
    actionLabel: "查看事件",
  },
];

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  if (value && typeof value === "object" && "toString" in value) {
    return Number(value.toString()) || 0;
  }
  return 0;
}

function toDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function hoursSince(value: Date | string | null | undefined) {
  const date = toDate(value);
  if (!date) return null;
  return (Date.now() - date.getTime()) / 3_600_000;
}

function addHours(value: Date | string | null | undefined, hours: number) {
  const date = toDate(value);
  if (!date) return null;
  return new Date(date.getTime() + hours * 3_600_000);
}

function getTaskState(config: TaskConfig, row: SystemTaskRunRow | undefined) {
  if (!row) {
    return {
      status: "unknown" as const,
      stateLabel: "等待首次记录",
    };
  }

  const runAge = hoursSince(row.started_at);
  if (row.status === "running") {
    if (runAge !== null && runAge > config.maxRuntimeHours) {
      return {
        status: "critical" as const,
        stateLabel: "运行超时",
      };
    }
    return {
      status: "ok" as const,
      stateLabel: "运行中",
    };
  }

  if (row.status === "failed") {
    return {
      status: "critical" as const,
      stateLabel: "最近失败",
    };
  }

  const successAge = hoursSince(row.latest_success_at || row.finished_at);
  if (successAge === null || successAge > config.criticalHours) {
    return {
      status: "critical" as const,
      stateLabel: "长时间未成功",
    };
  }
  if (successAge > config.warningHours) {
    return {
      status: "warning" as const,
      stateLabel: "等待下一次运行",
    };
  }
  return {
    status: "ok" as const,
    stateLabel: "正常",
  };
}

function getBacklog(taskKey: string, row: AutomationBacklogRow | undefined) {
  if (!row) return "暂未读取积压数据";

  if (taskKey === "exchange_rate_sync") {
    return `${toNumber(row.fresh_rates)} / ${toNumber(row.required_rates)} 个必需币种新鲜`;
  }
  if (taskKey === "collector_runner") {
    return `到期待跑 ${toNumber(row.due_collector_jobs)}；24 小时失败 ${toNumber(row.failed_collector_runs_24h)}`;
  }
  if (taskKey === "price_pipeline") {
    return `过期正式价 ${toNumber(row.stale_published_prices)}；异常观测 ${toNumber(row.pending_anomalies)}`;
  }
  if (taskKey === "discovery_scan") {
    return `长期监测来源 ${toNumber(row.monitored_sources)} 个`;
  }
  if (taskKey === "analytics_aggregation") return "聚合后台访问与点击趋势";
  if (taskKey === "database_backup") return "备份文件由服务器私有目录保存";
  return "按保留策略自动维护";
}

export async function getAutomationTaskMonitor(): Promise<AutomationTask[]> {
  const [runRows, backlogRows] = await Promise.all([
    prisma.$queryRaw<SystemTaskRunRow[]>`
      WITH ranked AS (
        SELECT
          task_key,
          status,
          started_at,
          finished_at,
          exit_code,
          error_message,
          EXTRACT(EPOCH FROM (COALESCE(finished_at, NOW()) - started_at))::int AS duration_seconds,
          MAX(finished_at) FILTER (WHERE status = 'succeeded') OVER (PARTITION BY task_key) AS latest_success_at,
          ROW_NUMBER() OVER (PARTITION BY task_key ORDER BY started_at DESC) AS row_number
        FROM system_task_runs
      )
      SELECT
        task_key,
        status,
        started_at,
        finished_at,
        latest_success_at,
        duration_seconds,
        exit_code,
        error_message
      FROM ranked
      WHERE row_number = 1
    `,
    prisma.$queryRaw<AutomationBacklogRow[]>`
      WITH required_rates AS (
        SELECT regexp_split_to_table(${REQUIRED_EXCHANGE_RATE_QUOTES}, ',') AS quote_currency
      ), latest_rates AS (
        SELECT DISTINCT ON (quote_currency)
          quote_currency,
          fetched_at
        FROM latest_exchange_rates
        WHERE base_currency = 'USD'
        ORDER BY quote_currency, fetched_at DESC, rate_date DESC
      )
      SELECT
        (SELECT COUNT(*)::int FROM collector_jobs WHERE status = 'active' AND next_run_at IS NOT NULL AND next_run_at <= NOW()) AS due_collector_jobs,
        (SELECT COUNT(*)::int FROM collector_job_runs WHERE status = 'failed' AND started_at >= NOW() - INTERVAL '24 hours') AS failed_collector_runs_24h,
        (SELECT COUNT(*)::int FROM region_prices WHERE status = 'published'::publish_status AND billing_platform = 'ios' AND last_checked_at < NOW() - INTERVAL '14 days') AS stale_published_prices,
        (SELECT COUNT(*)::int FROM price_observations WHERE status = 'pending'::observation_status AND COALESCE(anomaly_flag, FALSE)) AS pending_anomalies,
        (SELECT COUNT(*)::int FROM required_rates) AS required_rates,
        (SELECT COUNT(*)::int FROM required_rates required JOIN latest_rates latest USING (quote_currency) WHERE latest.fetched_at >= NOW() - INTERVAL '18 hours') AS fresh_rates,
        (SELECT COUNT(*)::int FROM discovery_sources WHERE status = 'active') AS monitored_sources
    `,
  ]);

  const runByKey = new Map(runRows.map((row) => [row.task_key, row]));
  const backlog = backlogRows[0];

  return TASK_CONFIGS.map((config) => {
    const row = runByKey.get(config.key);
    const state = getTaskState(config, row);
    const latestSuccessAt = row?.latest_success_at || null;

    return {
      key: config.key,
      title: config.title,
      description: config.description,
      cadence: config.cadence,
      status: state.status,
      stateLabel: state.stateLabel,
      latestRunAt: row?.started_at || null,
      latestSuccessAt,
      nextExpectedAt: addHours(latestSuccessAt, config.cadenceHours),
      durationSeconds: row ? toNumber(row.duration_seconds) : null,
      errorMessage: row?.error_message || null,
      backlog: getBacklog(config.key, backlog),
      actionHref: config.actionHref,
      actionLabel: config.actionLabel,
    };
  });
}

function getIncidentLabel(state: string) {
  if (state === "permanent_failure") return "配置错误";
  if (state === "retry_exhausted") return "重试耗尽";
  if (state === "stale_running") return "运行超时";
  return "任务已隔离";
}

function formatIncidentDetail(errorMessage: string | null) {
  const message = String(errorMessage || "").trim();
  if (!message) return "任务已停止自动执行，请检查产品采集配置。";
  if (
    message.includes("Invalid array passed in") ||
    message.includes("ConvertFrom-Json") ||
    message.includes("product plan specification JSON is invalid")
  ) {
    return "共享套餐规则曾无法解析。规则修复后，采集器会自动重新启用受影响任务。";
  }
  if (message.includes("missing app_store_id")) {
    return "缺少 App Store 应用 ID，请在产品采集任务中补全后重新启用。";
  }
  if (message.includes("missing google_play_package")) {
    return "缺少 Google Play 包名，请补全采集配置后重新启用。";
  }
  if (message.includes("Collector identity mismatch")) {
    return "采集脚本返回的产品身份与任务配置不一致，系统已阻止错误数据入库。";
  }
  return message.length > 180 ? `${message.slice(0, 177)}...` : message;
}

export async function getOperationalRecoveryMonitor(): Promise<OperationalRecoveryOverview> {
  const [cycleRows, statsRows, incidentRows] = await Promise.all([
    prisma.$queryRaw<OperationalRecoveryCycleRow[]>`
      SELECT
        trigger_kind,
        stale_runs_failed,
        stale_jobs_requeued,
        transient_jobs_requeued,
        permanent_jobs_quarantined,
        exhausted_jobs_quarantined,
        created_at
      FROM operational_recovery_cycles
      ORDER BY created_at DESC
      LIMIT 1
    `,
    prisma.$queryRaw<OperationalRecoveryStatsRow[]>`
      SELECT
        COUNT(*) FILTER (
          WHERE status = 'active'
            AND job_config ->> 'operational_state' IN (
              'retry_scheduled',
              'recovery_retry_scheduled',
              'auto_retry_queued'
            )
        )::int AS retrying_jobs,
        COUNT(*) FILTER (WHERE status = 'failed')::int AS quarantined_jobs,
        (
          SELECT COUNT(*)::int
          FROM collector_job_runs run
          WHERE run.status = 'running'
            AND (
              (
                run.raw_payload ->> 'state' = 'queued_from_admin'
                AND run.started_at < NOW() - INTERVAL '3 minutes'
              )
              OR (
                COALESCE(run.raw_payload ->> 'state', '') <> 'queued_from_admin'
                AND run.started_at < NOW() - INTERVAL '20 minutes'
              )
            )
        ) AS stale_running_runs
      FROM collector_jobs
    `,
    prisma.$queryRaw<OperationalIncidentRow[]>`
      WITH failed_products AS (
        SELECT
          'failed:' || COALESCE(product.slug, job.id::text) AS incident_key,
          product.slug AS product_slug,
          COALESCE(product.name, '未关联产品') AS product_name,
          COUNT(*)::int AS job_count,
          CASE
            WHEN BOOL_OR(job.job_config ->> 'operational_state' = 'permanent_failure')
              THEN 'permanent_failure'
            WHEN BOOL_OR(job.job_config ->> 'operational_state' = 'retry_exhausted')
              THEN 'retry_exhausted'
            ELSE 'failed'
          END AS operational_state,
          (ARRAY_AGG(job.last_error ORDER BY job.updated_at DESC)
            FILTER (WHERE job.last_error IS NOT NULL))[1] AS last_error,
          MAX(job.updated_at) AS incident_at
        FROM collector_jobs job
        LEFT JOIN products product ON product.id = job.product_id
        WHERE job.status = 'failed'
        GROUP BY product.slug, product.name, COALESCE(product.slug, job.id::text)
      ), stale_products AS (
        SELECT
          'stale:' || COALESCE(product.slug, run.job_id::text) AS incident_key,
          product.slug AS product_slug,
          COALESCE(product.name, '未关联产品') AS product_name,
          COUNT(*)::int AS job_count,
          'stale_running'::text AS operational_state,
          '采集进程超过预期时间仍未结束。'::text AS last_error,
          MAX(run.started_at) AS incident_at
        FROM collector_job_runs run
        LEFT JOIN products product ON product.id = run.product_id
        WHERE run.status = 'running'
          AND (
            (
              run.raw_payload ->> 'state' = 'queued_from_admin'
              AND run.started_at < NOW() - INTERVAL '3 minutes'
            )
            OR (
              COALESCE(run.raw_payload ->> 'state', '') <> 'queued_from_admin'
              AND run.started_at < NOW() - INTERVAL '20 minutes'
            )
          )
        GROUP BY product.slug, product.name, COALESCE(product.slug, run.job_id::text)
      )
      SELECT
        incident_key,
        product_slug,
        product_name,
        job_count,
        operational_state,
        last_error
      FROM (
        SELECT * FROM failed_products
        UNION ALL
        SELECT * FROM stale_products
      ) incidents
      ORDER BY incident_at DESC
      LIMIT 8
    `,
  ]);

  const cycle = cycleRows[0];
  const stats = statsRows[0];
  const retryingJobs = toNumber(stats?.retrying_jobs);
  const quarantinedJobs = toNumber(stats?.quarantined_jobs);
  const staleRunningRuns = toNumber(stats?.stale_running_runs);
  const status: HealthStatus =
    quarantinedJobs > 0 || staleRunningRuns > 0
      ? "critical"
      : retryingJobs > 0
        ? "warning"
        : "ok";

  return {
    status,
    latestCycleAt: cycle?.created_at || null,
    latestTrigger: cycle?.trigger_kind || null,
    staleRunsRecovered: toNumber(cycle?.stale_runs_failed),
    jobsRequeued:
      toNumber(cycle?.stale_jobs_requeued) + toNumber(cycle?.transient_jobs_requeued),
    jobsQuarantined:
      toNumber(cycle?.permanent_jobs_quarantined) +
      toNumber(cycle?.exhausted_jobs_quarantined),
    retryingJobs,
    quarantinedJobs,
    staleRunningRuns,
    incidents: incidentRows.map((row) => ({
      key: row.incident_key,
      productSlug: row.product_slug,
      productName: row.product_name || "未关联产品",
      jobCount: toNumber(row.job_count),
      state: row.operational_state,
      label: getIncidentLabel(row.operational_state),
      detail: formatIncidentDetail(row.last_error),
      status: "critical" as const,
      actionHref: row.product_slug
        ? `/admin/collector-jobs?q=${encodeURIComponent(row.product_slug)}`
        : "/admin/collector-jobs",
    })),
  };
}

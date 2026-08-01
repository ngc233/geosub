import "server-only";

import { Prisma } from "@prisma/client";
import { getAuthorityCoverageTaskRecords } from "./admin-authority-coverage-tasks.ts";
import { prisma } from "./prisma.ts";
import { getProductSeoQualityAudits } from "./product-seo-quality-data.ts";
import {
  buildAuthorityCoverageQueue,
  type AuthorityCoverageItem,
} from "./search-authority-coverage.ts";
import type { AuthorityCoverageTaskRecord } from "./admin-authority-coverage-tasks.ts";

type CollectorProductStateRow = {
  product_id: string;
  active_job_count: number;
  queue_pending: boolean;
  scheduled_due: boolean;
  run_running: boolean;
  latest_run_failed: boolean;
  next_run_at: Date | null;
};

export type DailyOperationState =
  | "failed"
  | "running"
  | "queued"
  | "action"
  | "healthy";

export type DailyOperationItem = {
  productId: string;
  productSlug: string;
  productName: string;
  state: DailyOperationState;
  reason: string;
  systemSummary: string;
  actionLabel: string;
  actionHref: string;
  qualityScore: number;
  taskEffect: AuthorityCoverageTaskRecord["effect"] | null;
  businessEffect: AuthorityCoverageTaskRecord["businessEffect"] | null;
  businessSummary: string | null;
};

function operationState({
  coverage,
  collector,
}: {
  coverage: AuthorityCoverageItem;
  collector?: CollectorProductStateRow;
}): DailyOperationState {
  if (collector?.latest_run_failed) return "failed";
  if (collector?.run_running) return "running";
  if (collector?.queue_pending) return "queued";
  if (coverage.actionKind !== "monitor") return "action";
  return "healthy";
}

function stateRank(state: DailyOperationState) {
  return {
    failed: 0,
    action: 1,
    running: 2,
    queued: 3,
    healthy: 4,
  }[state];
}

function systemSummary(
  state: DailyOperationState,
  collector?: CollectorProductStateRow,
) {
  if (state === "failed") return "最近一轮采集失败，需要检查运行记录";
  if (state === "running") return "采集器正在运行，无需重复点击";
  if (state === "queued") return "系统已经排队，等待采集器执行";
  if (collector?.scheduled_due) {
    return "自动任务已到执行时间，正在等待采集器接管";
  }
  if (!collector || collector.active_job_count === 0) {
    return "没有启用的 App Store 采集任务";
  }
  if (collector.next_run_at) {
    return `自动任务已启用，下次计划 ${new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    }).format(collector.next_run_at)} UTC`;
  }
  return "自动任务已启用，等待系统安排下一轮";
}

function actionFor(
  coverage: AuthorityCoverageItem,
  state: DailyOperationState,
) {
  if (state === "failed" || coverage.actionKind === "collect") {
    return {
      label: state === "failed" ? "查看失败原因" : "查看采集任务",
      href: `/admin/collector-jobs?q=${encodeURIComponent(coverage.productSlug)}`,
    };
  }
  if (state === "running" || state === "queued") {
    return {
      label: "查看运行进度",
      href: `/admin/collector-jobs?q=${encodeURIComponent(coverage.productSlug)}`,
    };
  }
  if (state === "healthy") {
    return {
      label: "查看健康度",
      href: `/admin/data-quality/${coverage.productSlug}`,
    };
  }
  return {
    label: coverage.recommendedAction,
    href: coverage.actionHref,
  };
}

function businessSummary(task?: AuthorityCoverageTaskRecord) {
  if (!task) return null;
  const metrics = task.businessMetrics;
  return `任务后：搜索点击 ${metrics.resultClicks} · 套餐意向 ${metrics.planEngagements} · 商业点击 ${metrics.commercialConversions}`;
}

export function buildDailyOperationsSummary({
  coverageItems,
  collectorStates,
  tasks,
}: {
  coverageItems: AuthorityCoverageItem[];
  collectorStates: CollectorProductStateRow[];
  tasks: AuthorityCoverageTaskRecord[];
}): DailyOperationItem[] {
  const collectorByProduct = new Map(
    collectorStates.map((state) => [state.product_id, state]),
  );
  const taskByProductGap = new Map(
    tasks.map((task) => [`${task.productId}:${task.gapCode}`, task]),
  );
  const latestTaskByProduct = new Map<string, AuthorityCoverageTaskRecord>();
  for (const task of tasks) {
    if (!latestTaskByProduct.has(task.productId)) {
      latestTaskByProduct.set(task.productId, task);
    }
  }

  return coverageItems.map((coverage) => {
    const collector = collectorByProduct.get(coverage.productId);
    const state = operationState({ coverage, collector });
    const task = coverage.gapCode
      ? taskByProductGap.get(`${coverage.productId}:${coverage.gapCode}`)
      : latestTaskByProduct.get(coverage.productId);
    const action = actionFor(coverage, state);

    return {
      productId: coverage.productId,
      productSlug: coverage.productSlug,
      productName: coverage.productName,
      state,
      reason: coverage.actionEvidence,
      systemSummary: systemSummary(state, collector),
      actionLabel: action.label,
      actionHref: action.href,
      qualityScore: coverage.qualityScore,
      taskEffect: task?.effect || null,
      businessEffect: task?.businessEffect || null,
      businessSummary: businessSummary(task),
    };
  }).sort((left, right) =>
    stateRank(left.state) - stateRank(right.state)
    || left.qualityScore - right.qualityScore
    || left.productName.localeCompare(right.productName)
  );
}

async function getCollectorProductStates() {
  return prisma.$queryRaw<CollectorProductStateRow[]>(Prisma.sql`
    WITH app_store_jobs AS (
      SELECT
        job.*,
        latest.status AS latest_run_status,
        latest.started_at AS latest_run_started_at
      FROM collector_jobs job
      LEFT JOIN price_sources source ON source.id = job.source_id
      LEFT JOIN LATERAL (
        SELECT run.status, run.started_at
        FROM collector_job_runs run
        WHERE run.job_id = job.id
        ORDER BY run.started_at DESC
        LIMIT 1
      ) latest ON TRUE
      WHERE job.product_id IS NOT NULL
        AND (
          source.type::text = 'app_store'
          OR job.job_config ->> 'collector_kind' = 'app_store'
        )
    ),
    product_job_state AS (
      SELECT
        product_id,
        COUNT(*) FILTER (WHERE status = 'active')::int AS active_job_count,
        BOOL_OR(
          status = 'active'
          AND priority >= 100
          AND (next_run_at IS NULL OR next_run_at <= NOW())
          AND (
            latest_run_started_at IS NULL
            OR updated_at > latest_run_started_at
          )
        ) AS queue_pending,
        BOOL_OR(
          status = 'active'
          AND next_run_at IS NOT NULL
          AND next_run_at <= NOW()
        ) AS scheduled_due,
        BOOL_OR(latest_run_status = 'running') AS run_running,
        MIN(next_run_at) FILTER (WHERE status = 'active') AS next_run_at
      FROM app_store_jobs
      GROUP BY product_id
    ),
    latest_product_run AS (
      SELECT DISTINCT ON (job.product_id)
        job.product_id,
        run.status
      FROM app_store_jobs job
      JOIN collector_job_runs run ON run.job_id = job.id
      ORDER BY job.product_id, run.started_at DESC
    )
    SELECT
      state.product_id::text,
      state.active_job_count,
      state.queue_pending,
      state.scheduled_due,
      state.run_running,
      COALESCE(latest.status = 'failed', FALSE) AS latest_run_failed,
      state.next_run_at
    FROM product_job_state state
    LEFT JOIN latest_product_run latest ON latest.product_id = state.product_id
  `);
}

export async function getDailyOperationsSummary() {
  const audits = await getProductSeoQualityAudits();
  const [collectorStates, tasks] = await Promise.all([
    getCollectorProductStates(),
    getAuthorityCoverageTaskRecords(audits),
  ]);
  return buildDailyOperationsSummary({
    coverageItems: buildAuthorityCoverageQueue(audits, []),
    collectorStates,
    tasks,
  });
}

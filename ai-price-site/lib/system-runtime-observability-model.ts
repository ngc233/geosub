export type RuntimeHealthStatus = "ok" | "warning" | "critical" | "unknown";

export type PoolActivityRow = {
  application_name: string | null;
  total_connections: unknown;
  active_connections: unknown;
  idle_in_transaction: unknown;
  longest_active_ms: unknown;
};

export type CollectorQueueTelemetryRow = {
  queued_runs: unknown;
  active_runs: unknown;
  latest_worker_claim_at: Date | string | null;
  collector_failures_24h: unknown;
  auto_review_failures_24h: unknown;
  spawn_failures_24h: unknown;
  total_failures_24h: unknown;
};

export type PoolActivitySummary = {
  applicationName: string;
  total: number;
  active: number;
  idleInTransaction: number;
  max: number;
  longestActiveMs: number;
  utilizationPercent: number;
  status: RuntimeHealthStatus;
};

export type CollectorQueueObservability = {
  dispatchMode: "spawn" | "queue";
  queuedRuns: number;
  activeRuns: number;
  latestWorkerClaimAt: string | null;
  failures24h: {
    total: number;
    collector: number;
    autoReview: number;
    spawn: number;
    unclassified: number;
  };
  status: RuntimeHealthStatus;
};

export type SystemRuntimeObservability = {
  status: RuntimeHealthStatus;
  poolsAvailable: boolean;
  pools: {
    web: PoolActivitySummary;
    admin: PoolActivitySummary;
    otherConnections: number;
  };
  collectorQueue: CollectorQueueObservability;
  warnings: string[];
};

function toNonNegativeInt(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
  }
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
  }
  if (value && typeof value === "object" && "toString" in value) {
    const parsed = Number(value.toString());
    return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
  }
  return 0;
}

function toIsoDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function worstStatus(statuses: RuntimeHealthStatus[]): RuntimeHealthStatus {
  if (statuses.includes("critical")) return "critical";
  if (statuses.includes("warning")) return "warning";
  if (statuses.includes("unknown")) return "unknown";
  return "ok";
}

export function assessPoolActivity({
  applicationName,
  total,
  active,
  idleInTransaction,
  max,
  longestActiveMs,
}: {
  applicationName: string;
  total: number;
  active: number;
  idleInTransaction: number;
  max: number;
  longestActiveMs: number;
}): PoolActivitySummary {
  const safeMax = Math.max(1, max);
  const utilizationPercent = Math.min(100, Math.round((total / safeMax) * 100));

  let status: RuntimeHealthStatus = "ok";
  if (total >= safeMax || idleInTransaction >= 3 || longestActiveMs >= 15_000) {
    status = "critical";
  } else if (
    utilizationPercent >= 80 ||
    idleInTransaction > 0 ||
    longestActiveMs >= 5_000
  ) {
    status = "warning";
  }

  return {
    applicationName,
    total,
    active,
    idleInTransaction,
    max: safeMax,
    longestActiveMs,
    utilizationPercent,
    status,
  };
}

export function buildRuntimeObservabilitySummary({
  poolRows,
  poolsAvailable = true,
  webPoolName = "geosub-web",
  webPoolMax = 10,
  adminPoolName = "geosub-admin",
  adminPoolMax = 4,
  queueRow,
  dispatchMode,
  nowMs = Date.now(),
}: {
  poolRows: readonly PoolActivityRow[];
  poolsAvailable?: boolean;
  webPoolName?: string;
  webPoolMax?: number;
  adminPoolName?: string;
  adminPoolMax?: number;
  queueRow: CollectorQueueTelemetryRow | null;
  dispatchMode: "spawn" | "queue";
  nowMs?: number;
}): SystemRuntimeObservability {
  const warnings: string[] = [];

  const aggregate = (targetName: string) => {
    let total = 0;
    let active = 0;
    let idleInTransaction = 0;
    let longestActiveMs = 0;

    for (const row of poolRows) {
      if ((row.application_name || "").trim() !== targetName) continue;
      total += toNonNegativeInt(row.total_connections);
      active += toNonNegativeInt(row.active_connections);
      idleInTransaction += toNonNegativeInt(row.idle_in_transaction);
      longestActiveMs = Math.max(
        longestActiveMs,
        toNonNegativeInt(row.longest_active_ms),
      );
    }

    return { total, active, idleInTransaction, longestActiveMs };
  };

  const webAgg = aggregate(webPoolName);
  const adminAgg = aggregate(adminPoolName);

  let otherConnections = 0;
  for (const row of poolRows) {
    const name = (row.application_name || "").trim();
    if (name === webPoolName || name === adminPoolName) continue;
    otherConnections += toNonNegativeInt(row.total_connections);
  }

  const web = poolsAvailable
    ? assessPoolActivity({
        applicationName: webPoolName,
        max: webPoolMax,
        ...webAgg,
      })
    : {
        applicationName: webPoolName,
        total: 0,
        active: 0,
        idleInTransaction: 0,
        max: Math.max(1, webPoolMax),
        longestActiveMs: 0,
        utilizationPercent: 0,
        status: "unknown" as const,
      };

  const admin = poolsAvailable
    ? assessPoolActivity({
        applicationName: adminPoolName,
        max: adminPoolMax,
        ...adminAgg,
      })
    : {
        applicationName: adminPoolName,
        total: 0,
        active: 0,
        idleInTransaction: 0,
        max: Math.max(1, adminPoolMax),
        longestActiveMs: 0,
        utilizationPercent: 0,
        status: "unknown" as const,
      };

  if (!poolsAvailable) {
    warnings.push("当前数据库角色无法读取 pg_stat_activity，连接池明细暂不可用。");
  } else {
    if (web.status !== "ok") {
      warnings.push(
        `前台连接池（${web.applicationName}）当前占用 ${web.total}/${web.max}，最长活跃查询 ${web.longestActiveMs} ms。`,
      );
    }
    if (admin.status !== "ok") {
      warnings.push(
        `后台连接池（${admin.applicationName}）当前占用 ${admin.total}/${admin.max}，最长活跃查询 ${admin.longestActiveMs} ms。`,
      );
    }
  }

  const queuedRuns = toNonNegativeInt(queueRow?.queued_runs);
  const activeRuns = toNonNegativeInt(queueRow?.active_runs);
  const latestWorkerClaimAt = toIsoDate(queueRow?.latest_worker_claim_at);
  const totalFailures = toNonNegativeInt(queueRow?.total_failures_24h);
  const collectorFailures = toNonNegativeInt(queueRow?.collector_failures_24h);
  const autoReviewFailures = toNonNegativeInt(
    queueRow?.auto_review_failures_24h,
  );
  const spawnFailures = toNonNegativeInt(queueRow?.spawn_failures_24h);
  const classifiedSum =
    collectorFailures + autoReviewFailures + spawnFailures;
  const unclassifiedFailures = Math.max(0, totalFailures - classifiedSum);

  let queueStatus: RuntimeHealthStatus = queueRow ? "ok" : "unknown";
  if (queueRow) {
    const workerClaimAgeMs = latestWorkerClaimAt
      ? Math.max(0, nowMs - new Date(latestWorkerClaimAt).getTime())
      : null;

    if (
      dispatchMode === "queue" &&
      queuedRuns > 0 &&
      (workerClaimAgeMs === null || workerClaimAgeMs > 5 * 60 * 1000)
    ) {
      queueStatus = "warning";
      warnings.push(
        `当前处于队列模式（queue），有 ${queuedRuns} 个待领任务但超过 5 分钟无常驻 Worker 领单记录。`,
      );
    }

    if (spawnFailures > 0) {
      queueStatus = "warning";
      warnings.push(`近 24 小时出现 ${spawnFailures} 次采集进程启动阶段（spawn）失败。`);
    }

    if (autoReviewFailures > 0) {
      queueStatus = "warning";
      warnings.push(
        `近 24 小时出现 ${autoReviewFailures} 次采集后自动审核阶段（auto_review）失败。`,
      );
    }
  }

  const status = worstStatus([web.status, admin.status, queueStatus]);

  return {
    status,
    poolsAvailable,
    pools: {
      web,
      admin,
      otherConnections,
    },
    collectorQueue: {
      dispatchMode,
      queuedRuns,
      activeRuns,
      latestWorkerClaimAt,
      failures24h: {
        total: totalFailures,
        collector: collectorFailures,
        autoReview: autoReviewFailures,
        spawn: spawnFailures,
        unclassified: unclassifiedFailures,
      },
      status: queueStatus,
    },
    warnings,
  };
}

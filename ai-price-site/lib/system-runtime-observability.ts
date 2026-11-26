import "server-only";

import { isAutoReviewFailureSql } from "./admin-product-scope";
import {
  adminPrisma,
  buildAdminPoolConfig,
  buildPublicPoolConfig,
} from "./prisma";
import {
  buildRuntimeObservabilitySummary,
  type CollectorQueueTelemetryRow,
  type PoolActivityRow,
  type SystemRuntimeObservability,
} from "./system-runtime-observability-model";

export * from "./system-runtime-observability-model";

function readDispatchMode(): "spawn" | "queue" {
  return (process.env.GEOSUB_COLLECTOR_DISPATCH_MODE || "")
    .trim()
    .toLowerCase() === "queue"
    ? "queue"
    : "spawn";
}

export async function getSystemRuntimeObservability(): Promise<SystemRuntimeObservability> {
  const publicPool = buildPublicPoolConfig(process.env.DATABASE_URL || "");
  const adminPool = buildAdminPoolConfig(
    process.env.ADMIN_DATABASE_URL || process.env.DATABASE_URL || "",
  );
  const dispatchMode = readDispatchMode();
  const reviewFailureCondition = isAutoReviewFailureSql("run");

  const [poolResult, queueResult] = await Promise.all([
    adminPrisma
      .$queryRaw<PoolActivityRow[]>`
        SELECT
          COALESCE(NULLIF(application_name, ''), 'other') AS application_name,
          COUNT(*)::int AS total_connections,
          COUNT(*) FILTER (WHERE state = 'active')::int AS active_connections,
          COUNT(*) FILTER (WHERE state = 'idle in transaction')::int AS idle_in_transaction,
          COALESCE(
            MAX(
              CASE
                WHEN state = 'active' AND query_start IS NOT NULL
                THEN GREATEST(0, EXTRACT(EPOCH FROM (NOW() - query_start)) * 1000)
                ELSE 0
              END
            ),
            0
          )::int AS longest_active_ms
        FROM pg_stat_activity
        WHERE datname = current_database()
        GROUP BY COALESCE(NULLIF(application_name, ''), 'other')
      `
      .then((rows) => ({ ok: true as const, rows }))
      .catch(() => ({ ok: false as const, rows: [] as PoolActivityRow[] })),
    adminPrisma
      .$queryRaw<CollectorQueueTelemetryRow[]>`
        SELECT
          COUNT(*) FILTER (
            WHERE run.status = 'running'
              AND run.raw_payload ->> 'state' = 'queued_from_admin'
          )::int AS queued_runs,
          COUNT(*) FILTER (
            WHERE run.status = 'running'
              AND COALESCE(run.raw_payload ->> 'state', '') <> 'queued_from_admin'
          )::int AS active_runs,
          MAX(
            CASE
              WHEN run.raw_payload ? 'worker_host'
                OR run.raw_payload ->> 'state' = 'worker_running'
              THEN run.started_at
              ELSE NULL
            END
          ) AS latest_worker_claim_at,
          COUNT(*) FILTER (
            WHERE run.status = 'failed'
              AND run.started_at >= NOW() - INTERVAL '24 hours'
              AND run.raw_payload ->> 'failure_phase' = 'collector'
          )::int AS collector_failures_24h,
          COUNT(*) FILTER (
            WHERE run.status = 'failed'
              AND run.started_at >= NOW() - INTERVAL '24 hours'
              AND ${reviewFailureCondition}
          )::int AS auto_review_failures_24h,
          COUNT(*) FILTER (
            WHERE run.status = 'failed'
              AND run.started_at >= NOW() - INTERVAL '24 hours'
              AND run.raw_payload ->> 'failure_phase' = 'spawn'
          )::int AS spawn_failures_24h,
          COUNT(*) FILTER (
            WHERE run.status = 'failed'
              AND run.started_at >= NOW() - INTERVAL '24 hours'
          )::int AS total_failures_24h
        FROM collector_job_runs run
        WHERE run.status = 'running'
          OR run.started_at >= NOW() - INTERVAL '24 hours'
          OR run.raw_payload ? 'worker_host'
      `
      .then((rows) => rows[0] ?? null)
      .catch(() => null),
  ]);

  return buildRuntimeObservabilitySummary({
    poolRows: poolResult.rows,
    poolsAvailable: poolResult.ok,
    webPoolName: publicPool.application_name,
    webPoolMax: publicPool.max,
    adminPoolName: adminPool.application_name,
    adminPoolMax: adminPool.max,
    queueRow: queueResult,
    dispatchMode,
  });
}

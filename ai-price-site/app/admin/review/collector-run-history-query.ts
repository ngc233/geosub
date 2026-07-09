import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import type { CollectorRunHistoryRow } from "./types";

function getPayloadText(rawPayload: Prisma.JsonValue, key: string) {
  if (!rawPayload || typeof rawPayload !== "object" || Array.isArray(rawPayload)) {
    return null;
  }

  const value = (rawPayload as Record<string, unknown>)[key];
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return null;
}

function sourceTypeText(value: string | null | undefined) {
  return value ? value.toLowerCase() : null;
}

function runAgeSeconds(startedAt: Date, finishedAt: Date | null) {
  const end = finishedAt?.getTime() ?? Date.now();
  return Math.max(0, Math.floor((end - startedAt.getTime()) / 1000));
}

type CollectorRunOutcomeSummary = Pick<
  CollectorRunHistoryRow,
  | "observed_count"
  | "pending_observation_count"
  | "approved_observation_count"
  | "rejected_observation_count"
  | "ignored_observation_count"
  | "anomaly_observation_count"
  | "published_price_count"
>;

type CollectorRunOutcomeSummaryRow = CollectorRunOutcomeSummary & {
  run_id: string;
};

const emptyOutcomeSummary: CollectorRunOutcomeSummary = {
  observed_count: 0,
  pending_observation_count: 0,
  approved_observation_count: 0,
  rejected_observation_count: 0,
  ignored_observation_count: 0,
  anomaly_observation_count: 0,
  published_price_count: 0,
};

function normalizeOutcomeSummary(row: CollectorRunOutcomeSummaryRow): CollectorRunOutcomeSummary {
  return {
    observed_count: Number(row.observed_count || 0),
    pending_observation_count: Number(row.pending_observation_count || 0),
    approved_observation_count: Number(row.approved_observation_count || 0),
    rejected_observation_count: Number(row.rejected_observation_count || 0),
    ignored_observation_count: Number(row.ignored_observation_count || 0),
    anomaly_observation_count: Number(row.anomaly_observation_count || 0),
    published_price_count: Number(row.published_price_count || 0),
  };
}

async function getCollectorRunOutcomeSummary(runIds: string[]) {
  if (runIds.length === 0) {
    return new Map<string, CollectorRunOutcomeSummary>();
  }

  const rows = await prisma.$queryRaw<CollectorRunOutcomeSummaryRow[]>`
    WITH scoped_run AS (
      SELECT
        run.id,
        run.product_id,
        run.source_id,
        run.started_at,
        COALESCE(run.finished_at, NOW()) AS finished_at
      FROM collector_job_runs run
      WHERE run.id::text IN (${Prisma.join(runIds)})
    ),
    observation_summary AS (
      SELECT
        scoped_run.id::text AS run_id,
        COUNT(observation.id)::int AS observed_count,
        COUNT(*) FILTER (
          WHERE observation.status = 'pending'::observation_status
        )::int AS pending_observation_count,
        COUNT(*) FILTER (
          WHERE observation.status = 'approved'::observation_status
        )::int AS approved_observation_count,
        COUNT(*) FILTER (
          WHERE observation.status = 'rejected'::observation_status
        )::int AS rejected_observation_count,
        COUNT(*) FILTER (
          WHERE observation.status = 'ignored'::observation_status
        )::int AS ignored_observation_count,
        COUNT(*) FILTER (
          WHERE COALESCE(observation.anomaly_flag, FALSE)
        )::int AS anomaly_observation_count
      FROM scoped_run
      LEFT JOIN price_observations observation
        ON scoped_run.product_id IS NOT NULL
        AND observation.product_id = scoped_run.product_id
        AND (
          scoped_run.source_id IS NULL
          OR observation.source_id IS NULL
          OR observation.source_id = scoped_run.source_id
        )
        AND observation.observed_at >= scoped_run.started_at - INTERVAL '2 minutes'
        AND observation.observed_at <= LEAST(
          scoped_run.finished_at + INTERVAL '10 minutes',
          scoped_run.started_at + INTERVAL '2 hours'
        )
      GROUP BY scoped_run.id
    ),
    published_summary AS (
      SELECT
        scoped_run.id::text AS run_id,
        COUNT(price.id)::int AS published_price_count
      FROM scoped_run
      LEFT JOIN region_prices price
        ON scoped_run.product_id IS NOT NULL
        AND price.product_id = scoped_run.product_id
        AND (
          scoped_run.source_id IS NULL
          OR price.primary_source_id IS NULL
          OR price.primary_source_id = scoped_run.source_id
        )
        AND price.status = 'published'::publish_status
        AND price.last_checked_at >= scoped_run.started_at - INTERVAL '2 minutes'
        AND price.last_checked_at <= LEAST(
          scoped_run.finished_at + INTERVAL '10 minutes',
          scoped_run.started_at + INTERVAL '2 hours'
        )
      GROUP BY scoped_run.id
    )
    SELECT
      scoped_run.id::text AS run_id,
      COALESCE(observation_summary.observed_count, 0)::int AS observed_count,
      COALESCE(observation_summary.pending_observation_count, 0)::int AS pending_observation_count,
      COALESCE(observation_summary.approved_observation_count, 0)::int AS approved_observation_count,
      COALESCE(observation_summary.rejected_observation_count, 0)::int AS rejected_observation_count,
      COALESCE(observation_summary.ignored_observation_count, 0)::int AS ignored_observation_count,
      COALESCE(observation_summary.anomaly_observation_count, 0)::int AS anomaly_observation_count,
      COALESCE(published_summary.published_price_count, 0)::int AS published_price_count
    FROM scoped_run
    LEFT JOIN observation_summary ON observation_summary.run_id = scoped_run.id::text
    LEFT JOIN published_summary ON published_summary.run_id = scoped_run.id::text
  `;

  return new Map(rows.map((row) => [row.run_id, normalizeOutcomeSummary(row)]));
}

export async function getCollectorRunHistoryRows(productQuery: string, limit = 12) {
  const trimmedQuery = productQuery.trim();

  const rows = await prisma.collectorJobRun.findMany({
    where: trimmedQuery
      ? {
          product: {
            OR: [
              {
                slug: {
                  contains: trimmedQuery,
                  mode: "insensitive",
                },
              },
              {
                name: {
                  contains: trimmedQuery,
                  mode: "insensitive",
                },
              },
            ],
          },
        }
      : undefined,
    orderBy: {
      startedAt: "desc",
    },
    take: limit,
    include: {
      product: {
        select: {
          slug: true,
          name: true,
        },
      },
      source: {
        select: {
          type: true,
        },
      },
    },
  });
  const outcomeSummary = await getCollectorRunOutcomeSummary(rows.map((row) => row.id));

  return rows.map(
    (row): CollectorRunHistoryRow => {
      const outcome = outcomeSummary.get(row.id) ?? emptyOutcomeSummary;

      return {
        id: row.id,
        product_slug: row.product?.slug ?? null,
        product_name: row.product?.name ?? null,
        source_type: sourceTypeText(row.source?.type),
        status: row.status,
        collector_kind: row.collectorKind,
        started_at: row.startedAt,
        finished_at: row.finishedAt,
        duration_ms: row.durationMs,
        error_message: row.errorMessage,
        output_excerpt: row.outputExcerpt,
        diagnosis: getPayloadText(row.rawPayload, "diagnosis"),
        process_id: getPayloadText(row.rawPayload, "pid"),
        runner_state: getPayloadText(row.rawPayload, "state"),
        run_age_seconds: runAgeSeconds(row.startedAt, row.finishedAt),
        ...outcome,
      };
    }
  );
}

import "server-only";

import type { Prisma } from "@prisma/client";
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

  return rows.map(
    (row): CollectorRunHistoryRow => ({
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
    })
  );
}

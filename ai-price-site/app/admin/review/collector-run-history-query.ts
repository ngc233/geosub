import "server-only";

import { prisma } from "../../../lib/prisma";
import type { CollectorRunHistoryRow } from "./types";

export async function getCollectorRunHistoryRows(productQuery: string, limit = 12) {
  const trimmedQuery = productQuery.trim();
  const productQueryLike = `%${trimmedQuery}%`;

  return prisma.$queryRaw<CollectorRunHistoryRow[]>`
    SELECT
      run.id::text,
      product.slug AS product_slug,
      product.name AS product_name,
      source.type::text AS source_type,
      run.status,
      run.collector_kind,
      run.started_at,
      run.finished_at,
      run.duration_ms,
      run.error_message,
      run.output_excerpt,
      run.raw_payload ->> 'diagnosis' AS diagnosis,
      run.raw_payload ->> 'pid' AS process_id,
      run.raw_payload ->> 'state' AS runner_state,
      GREATEST(0, EXTRACT(EPOCH FROM (COALESCE(run.finished_at, NOW()) - run.started_at)))::int AS run_age_seconds
    FROM collector_job_runs run
    LEFT JOIN products product ON product.id = run.product_id
    LEFT JOIN price_sources source ON source.id = run.source_id
    WHERE (
      ${trimmedQuery} = ''
      OR product.slug ILIKE ${productQueryLike}
      OR product.name ILIKE ${productQueryLike}
    )
    ORDER BY run.started_at DESC
    LIMIT ${limit}
  `;
}

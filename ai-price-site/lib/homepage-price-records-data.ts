import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import type { PriceObservationRecord } from "./price-records";

export const HOMEPAGE_HISTORY_BUDGET_MS = 6_000;
export const HOMEPAGE_HISTORY_LIMIT = 50_000;
export class HomepageHistoryTimeout extends Error {
  constructor() { super("Homepage history budget exhausted"); this.name = "HomepageHistoryTimeout"; }
}

// No evidence payloads in this phase. Determine the complete bounded window
// before fetching evidence: an overflow must hide the whole block, not a top-six
// computed from an arbitrary partial history. Materialize eligible streams once.
export const homepageHistoryIds = Prisma.sql`
  WITH streams AS MATERIALIZED (
    SELECT DISTINCT endpoint.product_id, endpoint.plan_id, endpoint.country_id, endpoint.billing_platform
    FROM price_observations endpoint
    JOIN products p ON p.id = endpoint.product_id AND p.status = 'published'
    JOIN plans pl ON pl.id = endpoint.plan_id AND pl.product_id = p.id AND pl.status = 'published'
    JOIN countries c ON c.id = endpoint.country_id
    WHERE p.category IN ('ai', 'streaming') AND endpoint.billing_platform = 'ios'
      AND endpoint.status = 'approved'
      AND endpoint.observed_at BETWEEN NOW() - INTERVAL '30 days' AND NOW()
  )
  SELECT po.id FROM streams s
  JOIN price_observations po ON po.product_id = s.product_id AND po.plan_id = s.plan_id
    AND po.country_id = s.country_id AND po.billing_platform = s.billing_platform
  WHERE po.observed_at BETWEEN NOW() - INTERVAL '120 days' AND NOW()
  ORDER BY po.observed_at DESC, po.id DESC LIMIT ${HOMEPAGE_HISTORY_LIMIT + 1}
`;

export function homepageHistoryEvidence(ids: string[]) {
  return Prisma.sql`
    SELECT po.id, p.slug AS "productSlug", p.name AS "productName", p.category::text AS category,
      pl.slug AS "planSlug", pl.name AS "planName", c.code AS "countryCode", po.source_id AS "sourceId",
      po.source_url AS "sourceUrl",
      to_char(po.observed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "observedAt",
      po.billing_platform::text AS platform, po.price_type::text AS "priceType",
      po.raw_price AS amount, po.currency, po.status::text AS status,
      po.confidence_score AS confidence, po.anomaly_flag AS anomaly,
      po.raw_payload ->> 'auto_review_reason_code' AS "reviewReason",
      CASE WHEN po.status IN ('approved', 'ignored') THEN jsonb_build_object(
        'country', po.raw_payload #> '{raw_snapshot,country}',
        'planSpecSlug', po.raw_payload #> '{raw_snapshot,planSpecSlug}',
        'billingCycle', po.raw_payload #> '{raw_snapshot,billingCycle}',
        'inAppPurchases', CASE WHEN po.status = 'approved'
          THEN po.raw_payload #> '{raw_snapshot,inAppPurchases}'
          WHEN jsonb_typeof(po.raw_payload #> '{raw_snapshot,inAppPurchases}') = 'array'
          THEN jsonb_path_query_array(po.raw_payload #> '{raw_snapshot,inAppPurchases}', '$[0]')
          ELSE NULL END
      ) ELSE NULL END AS snapshot,
      CASE WHEN po.status = 'approved' THEN po.raw_payload ->> 'item_name' END AS "itemName",
      CASE WHEN po.status = 'approved' THEN po.raw_payload #>> '{raw_snapshot,originalObservedPriceText}' END AS "originalPriceText"
    FROM price_observations po
    JOIN products p ON p.id = po.product_id
    JOIN plans pl ON pl.id = po.plan_id
    JOIN countries c ON c.id = po.country_id
    WHERE po.id = ANY(${ids}::uuid[])
    ORDER BY po.observed_at DESC, po.id DESC
  `;
}

// Server-side statement_timeout cancels the actual SQL. A decreasing budget
// covers all pages, not just each statement. No Promise.race/orphaned query.
export async function getHomepagePriceRecords() {
  const deadline = performance.now() + HOMEPAGE_HISTORY_BUDGET_MS;
  return prisma.$transaction(async (tx) => {
    async function query<T>(sql: Prisma.Sql): Promise<T> {
      const remaining = Math.floor(deadline - performance.now());
      if (remaining <= 0) throw new HomepageHistoryTimeout();
      await tx.$queryRaw`SELECT set_config('statement_timeout', ${String(remaining)}, true)`;
      const result = await tx.$queryRaw<T>(sql);
      if (performance.now() >= deadline) throw new HomepageHistoryTimeout();
      return result;
    }
    await tx.$executeRaw`SET TRANSACTION READ ONLY`;
    const [{ now }] = await query<Array<{ now: Date }>>(Prisma.sql`SELECT NOW() AS now`);
    const ids = await query<Array<{ id: string }>>(homepageHistoryIds);
    if (ids.length > HOMEPAGE_HISTORY_LIMIT) return { records: [], truncated: true, now };
    const records: PriceObservationRecord[] = [];
    for (let index = 0; index < ids.length; index += 5_000) {
      const rows = await query<Array<Omit<PriceObservationRecord, "amount"> & { amount: unknown }>>(
        homepageHistoryEvidence(ids.slice(index, index + 5_000).map(row => row.id)),
      );
      records.push(...rows.map(row => ({ ...row, amount: Number(row.amount) })));
    }
    return { records, truncated: false, now };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    maxWait: 500, timeout: HOMEPAGE_HISTORY_BUDGET_MS + 500 });
}

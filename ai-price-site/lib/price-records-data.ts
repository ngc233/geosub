import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { getPublicPriceSnapshot, isObservationId, type PriceObservationRecord } from "./price-records";

type RecordRow = Omit<PriceObservationRecord, "amount"> & { amount: unknown };
const recordSelect = Prisma.sql`
  SELECT po.id, p.slug AS "productSlug", p.name AS "productName", p.category::text AS category,
    pl.slug AS "planSlug", pl.name AS "planName", c.code AS "countryCode", po.source_id AS "sourceId",
    po.source_url AS "sourceUrl",
    to_char(po.observed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS "observedAt",
    po.billing_platform::text AS platform,
    po.price_type::text AS "priceType", po.raw_price AS amount, po.currency,
    po.status::text AS status, po.confidence_score AS confidence, po.anomaly_flag AS anomaly,
    po.raw_payload ->> 'auto_review_reason_code' AS "reviewReason",
    po.raw_payload -> 'raw_snapshot' AS snapshot, po.raw_payload ->> 'item_name' AS "itemName",
    po.raw_payload #>> '{raw_snapshot,originalObservedPriceText}' AS "originalPriceText"
  FROM price_observations po
  JOIN products p ON p.id = po.product_id AND p.status = 'published'
  JOIN plans pl ON pl.id = po.plan_id AND pl.product_id = p.id AND pl.status = 'published'
  JOIN countries c ON c.id = po.country_id
  WHERE p.category IN ('ai', 'streaming') AND po.billing_platform = 'ios'
    AND po.observed_at <= NOW()
`;
function toRecord(row: RecordRow): PriceObservationRecord {
  return { ...row, amount: Number(row.amount) };
}
export async function getPriceSnapshotById(id: string) {
  if (!isObservationId(id)) return null;
  const rows = await prisma.$queryRaw<RecordRow[]>(Prisma.sql`${recordSelect} AND po.id = ${id}::uuid LIMIT 1`);
  return rows[0] ? getPublicPriceSnapshot(toRecord(rows[0])) : null;
}
export async function getProductPriceRecords(productSlug: string) {
  if (!/^[a-z0-9-]{1,80}$/.test(productSlug)) return { records: [], truncated: false };
  // Include review failures as sequence boundaries, rather than filtering them
  // out and accidentally joining two incomparable prices across the gap.
  const rows = await prisma.$queryRaw<RecordRow[]>(Prisma.sql`${recordSelect}
    AND p.slug = ${productSlug} AND po.observed_at >= NOW() - INTERVAL '120 days'
    ORDER BY po.observed_at DESC, po.id DESC LIMIT 5001`);
  return { records: rows.slice(0, 5000).map(toRecord), truncated: rows.length > 5000 };
}

export async function getPriceRecordProducts() {
  return prisma.$queryRaw<Array<{ slug: string; name: string; category: "ai" | "streaming" }>>`
    SELECT slug, name, category::text AS category FROM products
    WHERE status = 'published' AND category IN ('ai', 'streaming') ORDER BY name LIMIT 200
  `;
}

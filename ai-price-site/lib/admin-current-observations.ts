import { Prisma } from "@prisma/client";

// Select the latest evidence across all statuses before counting pending work.
// A newer approved/ignored row must supersede older pending rows of the same identity.
export function latestObservationIdsSql(productId?: string | Prisma.Sql) {
  return Prisma.sql`
    SELECT DISTINCT ON (product_id, plan_id, country_id, billing_platform, price_type)
      id
    FROM price_observations
    ${productId ? Prisma.sql`WHERE product_id = ${productId}::uuid` : Prisma.empty}
    ORDER BY product_id, plan_id, country_id, billing_platform, price_type,
      observed_at DESC, created_at DESC, id DESC
  `;
}

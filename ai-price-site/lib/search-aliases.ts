import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import type { PreparedSiteLocale } from "./site-locale";

export type ActiveSearchAlias = {
  alias: string;
  targetKind: "product" | "plan";
  productId: string | null;
  planId: string | null;
};

type ActiveSearchAliasRow = {
  alias: string;
  target_kind: "product" | "plan";
  product_id: string | null;
  plan_id: string | null;
};

export async function getActiveSearchAliases(
  locale: PreparedSiteLocale,
): Promise<ActiveSearchAlias[]> {
  const rows = await prisma.$queryRaw<ActiveSearchAliasRow[]>(Prisma.sql`
    SELECT
      alias,
      target_kind,
      product_id::text,
      plan_id::text
    FROM search_aliases
    WHERE status = 'active'
      AND locale = ${locale}
    ORDER BY updated_at DESC
    LIMIT 500
  `);

  return rows.map((row) => ({
    alias: row.alias,
    targetKind: row.target_kind,
    productId: row.product_id,
    planId: row.plan_id,
  }));
}

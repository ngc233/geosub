import "server-only";

import { Prisma, PublishStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { normalizeSearchOpportunityQuery } from "./search-opportunity";

export const SEARCH_ALIAS_STATUSES = ["active", "disabled"] as const;
export type SearchAliasStatus = (typeof SEARCH_ALIAS_STATUSES)[number];
export type SearchAliasTargetKind = "product" | "plan";
export type SearchAliasRecord = {
  id: string;
  alias: string;
  normalizedAlias: string;
  locale: string;
  targetKind: SearchAliasTargetKind;
  productId: string | null;
  planId: string | null;
  targetTitle: string;
  targetHref: string;
  status: SearchAliasStatus;
  evidenceClickCount: number;
  evidenceVisitorCount: number;
  lastClickedAt: Date | null;
  updatedAt: Date;
};

type SearchAliasRow = {
  id: string;
  alias: string;
  normalized_alias: string;
  locale: string;
  target_kind: SearchAliasTargetKind;
  product_id: string | null;
  plan_id: string | null;
  target_title: string;
  target_href: string;
  status: SearchAliasStatus;
  evidence_click_count: number;
  evidence_visitor_count: number;
  last_clicked_at: Date | null;
  updated_at: Date;
};

export function isSearchAliasStatus(value: string): value is SearchAliasStatus {
  return SEARCH_ALIAS_STATUSES.includes(value as SearchAliasStatus);
}

function mapSearchAlias(row: SearchAliasRow): SearchAliasRecord {
  return {
    id: row.id,
    alias: row.alias,
    normalizedAlias: row.normalized_alias,
    locale: row.locale,
    targetKind: row.target_kind,
    productId: row.product_id,
    planId: row.plan_id,
    targetTitle: row.target_title,
    targetHref: row.target_href,
    status: row.status,
    evidenceClickCount: row.evidence_click_count,
    evidenceVisitorCount: row.evidence_visitor_count,
    lastClickedAt: row.last_clicked_at,
    updatedAt: row.updated_at,
  };
}

export async function getSearchAliasRecords(limit = 200) {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 500);
  const rows = await prisma.$queryRaw<SearchAliasRow[]>(Prisma.sql`
    SELECT
      id::text,
      alias,
      normalized_alias,
      locale,
      target_kind,
      product_id::text,
      plan_id::text,
      target_title,
      target_href,
      status,
      evidence_click_count,
      evidence_visitor_count,
      last_clicked_at,
      updated_at
    FROM search_aliases
    ORDER BY
      CASE status WHEN 'active' THEN 1 ELSE 2 END,
      updated_at DESC
    LIMIT ${safeLimit}
  `);
  return rows.map(mapSearchAlias);
}

async function assertPublishedTarget({
  targetKind,
  productId,
  planId,
}: {
  targetKind: SearchAliasTargetKind;
  productId: string | null;
  planId: string | null;
}) {
  if (targetKind === "product") {
    if (!productId) throw new Error("Product alias target is required.");
    const product = await prisma.product.findFirst({
      where: { id: productId, status: PublishStatus.PUBLISHED },
      select: { id: true },
    });
    if (!product) throw new Error("Published product alias target was not found.");
    return;
  }

  if (!planId) throw new Error("Plan alias target is required.");
  const plan = await prisma.plan.findFirst({
    where: {
      id: planId,
      status: PublishStatus.PUBLISHED,
      product: { status: PublishStatus.PUBLISHED },
    },
    select: { id: true },
  });
  if (!plan) throw new Error("Published plan alias target was not found.");
}

async function getAliasEvidence({
  normalizedAlias,
  locale,
  targetKind,
  productId,
  planId,
}: {
  normalizedAlias: string;
  locale: string;
  targetKind: SearchAliasTargetKind;
  productId: string | null;
  planId: string | null;
}) {
  const rows = await prisma.$queryRaw<Array<{
    click_count: bigint;
    visitor_count: bigint;
    last_clicked_at: Date | null;
  }>>(Prisma.sql`
    SELECT
      COUNT(*) AS click_count,
      COUNT(DISTINCT COALESCE(session_id, anonymous_id)) AS visitor_count,
      MAX(created_at) AS last_clicked_at
    FROM event_logs
    WHERE created_at >= NOW() - INTERVAL '90 days'
      AND event_key = 'click_search_result'
      AND page_path NOT LIKE '/admin%'
      AND COALESCE(page_path, '') NOT LIKE '%tracking-test%'
      AND COALESCE(locale, 'zh') = ${locale}
      AND LOWER(
        REGEXP_REPLACE(TRIM(metadata->>'query'), '\s+', ' ', 'g')
      ) = ${normalizedAlias}
      AND metadata->>'resultKind' = ${targetKind}
      AND (
        (
          ${targetKind} = 'product'
          AND product_id = ${productId}::uuid
        )
        OR
        (
          ${targetKind} = 'plan'
          AND plan_id = ${planId}::uuid
        )
      )
  `);
  const evidence = rows[0];
  return {
    clickCount: Number(evidence?.click_count || 0),
    visitorCount: Number(evidence?.visitor_count || 0),
    lastClickedAt: evidence?.last_clicked_at || null,
  };
}

export async function approveSearchAlias({
  alias,
  locale,
  targetKind,
  productId,
  planId,
  targetTitle,
  targetHref,
  adminId,
}: {
  alias: string;
  locale: string;
  targetKind: SearchAliasTargetKind;
  productId: string | null;
  planId: string | null;
  targetTitle: string;
  targetHref: string;
  adminId: string;
}) {
  const normalizedAlias = normalizeSearchOpportunityQuery(alias);
  if (!normalizedAlias || normalizedAlias.length < 2) {
    throw new Error("Search alias must contain at least two characters.");
  }
  await assertPublishedTarget({ targetKind, productId, planId });
  const evidence = await getAliasEvidence({
    normalizedAlias,
    locale,
    targetKind,
    productId,
    planId,
  });
  if (evidence.clickCount < 2 || evidence.visitorCount < 2) {
    throw new Error(
      "Search alias needs at least two clicks from two visitors before approval.",
    );
  }

  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    INSERT INTO search_aliases (
      alias,
      normalized_alias,
      locale,
      target_kind,
      product_id,
      plan_id,
      target_title,
      target_href,
      status,
      evidence_click_count,
      evidence_visitor_count,
      last_clicked_at,
      created_by_id,
      updated_by_id,
      created_at,
      updated_at
    )
    VALUES (
      ${alias.trim().slice(0, 120)},
      ${normalizedAlias},
      ${locale.slice(0, 10)},
      ${targetKind},
      ${productId}::uuid,
      ${planId}::uuid,
      ${targetTitle.trim().slice(0, 200)},
      ${targetHref.trim().slice(0, 500)},
      'active',
      ${evidence.clickCount},
      ${evidence.visitorCount},
      ${evidence.lastClickedAt},
      ${adminId}::uuid,
      ${adminId}::uuid,
      NOW(),
      NOW()
    )
    ON CONFLICT (normalized_alias, locale) DO UPDATE
    SET
      alias = EXCLUDED.alias,
      target_kind = EXCLUDED.target_kind,
      product_id = EXCLUDED.product_id,
      plan_id = EXCLUDED.plan_id,
      target_title = EXCLUDED.target_title,
      target_href = EXCLUDED.target_href,
      status = 'active',
      evidence_click_count = GREATEST(
        search_aliases.evidence_click_count,
        EXCLUDED.evidence_click_count
      ),
      evidence_visitor_count = GREATEST(
        search_aliases.evidence_visitor_count,
        EXCLUDED.evidence_visitor_count
      ),
      last_clicked_at = GREATEST(
        search_aliases.last_clicked_at,
        EXCLUDED.last_clicked_at
      ),
      updated_by_id = EXCLUDED.updated_by_id,
      updated_at = NOW()
    RETURNING id::text
  `);

  return rows[0];
}

export async function setSearchAliasStatus({
  id,
  status,
  adminId,
}: {
  id: string;
  status: SearchAliasStatus;
  adminId: string;
}) {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    UPDATE search_aliases
    SET
      status = ${status},
      updated_by_id = ${adminId}::uuid,
      updated_at = NOW()
    WHERE id = ${id}::uuid
    RETURNING id::text
  `);
  if (!rows[0]) throw new Error("Search alias was not found.");
  return rows[0];
}

import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.ts";
import type { SearchConversionTerm } from "./admin-search-demand.ts";
import type {
  SearchConversionBlockerCode,
  SearchConversionDiagnostic,
} from "./search-conversion-diagnostics.ts";
import {
  classifySearchConversionRepairEffect,
  findCurrentConversionTerm,
  isSearchConversionRepairStatus,
  searchConversionRepairKey,
  searchConversionTargetKey,
  type SearchConversionRepairEffect,
  type SearchConversionRepairStatus,
} from "./search-conversion-repair.ts";
import { normalizeSearchOpportunityQuery } from "./search-opportunity.ts";

export { isSearchConversionRepairStatus, searchConversionRepairKey };
export type { SearchConversionRepairStatus };

export type SearchConversionRepairRecord = {
  id: string;
  query: string;
  normalizedQuery: string;
  locale: string;
  productId: string | null;
  planId: string | null;
  blockerCode: SearchConversionBlockerCode;
  status: SearchConversionRepairStatus;
  actionHref: string;
  note: string | null;
  baselineWindowDays: number;
  baselineResultClicks: number;
  baselinePlanEngagements: number;
  baselineCommercialConversions: number;
  currentResultClicks: number;
  currentPlanEngagements: number;
  currentCommercialConversions: number;
  resultClickDelta: number;
  planEngagementDelta: number;
  commercialConversionDelta: number;
  effect: SearchConversionRepairEffect;
  evaluationStartedAt: Date;
  resolvedAt: Date | null;
  updatedAt: Date;
};

type SearchConversionRepairRow = {
  id: string;
  query: string;
  normalized_query: string;
  locale: string;
  product_id: string | null;
  plan_id: string | null;
  blocker_code: SearchConversionBlockerCode;
  status: SearchConversionRepairStatus;
  action_href: string;
  note: string | null;
  baseline_window_days: number;
  baseline_result_clicks: number;
  baseline_plan_engagements: number;
  baseline_commercial_conversions: number;
  evaluation_started_at: Date;
  resolved_at: Date | null;
  updated_at: Date;
};

function mapRecord(
  row: SearchConversionRepairRow,
  terms: SearchConversionTerm[],
): SearchConversionRepairRecord {
  const current = findCurrentConversionTerm(terms, {
    normalizedQuery: row.normalized_query,
    locale: row.locale,
    productId: row.product_id,
    planId: row.plan_id,
  });
  const currentResultClicks = current?.resultClickCount || 0;
  const currentPlanEngagements = current?.planEngagementCount || 0;
  const currentCommercialConversions = current?.commercialConversionCount || 0;
  const resultClickDelta = currentResultClicks - row.baseline_result_clicks;
  const planEngagementDelta = currentPlanEngagements
    - row.baseline_plan_engagements;
  const commercialConversionDelta = currentCommercialConversions
    - row.baseline_commercial_conversions;

  return {
    id: row.id,
    query: row.query,
    normalizedQuery: row.normalized_query,
    locale: row.locale,
    productId: row.product_id,
    planId: row.plan_id,
    blockerCode: row.blocker_code,
    status: row.status,
    actionHref: row.action_href,
    note: row.note,
    baselineWindowDays: row.baseline_window_days,
    baselineResultClicks: row.baseline_result_clicks,
    baselinePlanEngagements: row.baseline_plan_engagements,
    baselineCommercialConversions: row.baseline_commercial_conversions,
    currentResultClicks,
    currentPlanEngagements,
    currentCommercialConversions,
    resultClickDelta,
    planEngagementDelta,
    commercialConversionDelta,
    effect: classifySearchConversionRepairEffect({
      resultClickDelta,
      planEngagementDelta,
      commercialConversionDelta,
    }),
    evaluationStartedAt: row.evaluation_started_at,
    resolvedAt: row.resolved_at,
    updatedAt: row.updated_at,
  };
}

export async function getSearchConversionRepairRecords(
  terms: SearchConversionTerm[],
  limit = 100,
) {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 200);
  const rows = await prisma.$queryRaw<SearchConversionRepairRow[]>(Prisma.sql`
    SELECT
      id::text,
      query,
      normalized_query,
      locale,
      product_id::text,
      plan_id::text,
      blocker_code,
      status,
      action_href,
      note,
      baseline_window_days,
      baseline_result_clicks,
      baseline_plan_engagements,
      baseline_commercial_conversions,
      evaluation_started_at,
      resolved_at,
      updated_at
    FROM search_conversion_repairs
    ORDER BY
      CASE status
        WHEN 'in_progress' THEN 1
        WHEN 'resolved' THEN 2
        ELSE 3
      END,
      updated_at DESC
    LIMIT ${safeLimit}
  `);
  return rows.map((row) => mapRecord(row, terms));
}

export async function startSearchConversionRepair({
  diagnostic,
  baseline,
  days,
  adminId,
}: {
  diagnostic: Pick<
    SearchConversionDiagnostic,
    | "query"
    | "locale"
    | "productId"
    | "planId"
    | "blockerCode"
    | "actionHref"
  >;
  baseline: Pick<
    SearchConversionTerm,
    | "resultClickCount"
    | "planEngagementCount"
    | "commercialConversionCount"
  >;
  days: number;
  adminId: string;
}) {
  const normalizedQuery = normalizeSearchOpportunityQuery(diagnostic.query);
  if (!normalizedQuery) {
    throw new Error("Search conversion repair query is required.");
  }
  const targetKey = searchConversionTargetKey(diagnostic);
  const safeDays = [7, 30, 90].includes(days) ? days : 30;

  const rows = await prisma.$queryRaw<SearchConversionRepairRow[]>(Prisma.sql`
    INSERT INTO search_conversion_repairs (
      query,
      normalized_query,
      locale,
      target_key,
      product_id,
      plan_id,
      blocker_code,
      status,
      action_href,
      baseline_result_clicks,
      baseline_plan_engagements,
      baseline_commercial_conversions,
      baseline_window_days,
      created_by_id,
      updated_by_id,
      evaluation_started_at,
      created_at,
      updated_at
    ) VALUES (
      ${diagnostic.query.trim().slice(0, 240)},
      ${normalizedQuery},
      ${diagnostic.locale},
      ${targetKey},
      ${diagnostic.productId}::uuid,
      ${diagnostic.planId}::uuid,
      ${diagnostic.blockerCode},
      'in_progress',
      ${diagnostic.actionHref.slice(0, 1000)},
      ${baseline.resultClickCount},
      ${baseline.planEngagementCount},
      ${baseline.commercialConversionCount},
      ${safeDays},
      ${adminId}::uuid,
      ${adminId}::uuid,
      NOW(),
      NOW(),
      NOW()
    )
    ON CONFLICT (normalized_query, locale, target_key, blocker_code) DO UPDATE
    SET
      query = EXCLUDED.query,
      product_id = EXCLUDED.product_id,
      plan_id = EXCLUDED.plan_id,
      status = 'in_progress',
      action_href = EXCLUDED.action_href,
      baseline_result_clicks = EXCLUDED.baseline_result_clicks,
      baseline_plan_engagements = EXCLUDED.baseline_plan_engagements,
      baseline_commercial_conversions = EXCLUDED.baseline_commercial_conversions,
      baseline_window_days = EXCLUDED.baseline_window_days,
      updated_by_id = EXCLUDED.updated_by_id,
      evaluation_started_at = NOW(),
      resolved_at = NULL,
      updated_at = NOW()
    RETURNING
      id::text,
      query,
      normalized_query,
      locale,
      product_id::text,
      plan_id::text,
      blocker_code,
      status,
      action_href,
      note,
      baseline_window_days,
      baseline_result_clicks,
      baseline_plan_engagements,
      baseline_commercial_conversions,
      evaluation_started_at,
      resolved_at,
      updated_at
  `);
  return mapRecord(rows[0], []);
}

export async function updateSearchConversionRepairStatus({
  id,
  status,
  note,
  adminId,
}: {
  id: string;
  status: SearchConversionRepairStatus;
  note?: string | null;
  adminId: string;
}) {
  await prisma.$executeRaw(Prisma.sql`
    UPDATE search_conversion_repairs
    SET
      status = ${status},
      note = COALESCE(${note?.trim().slice(0, 1000) || null}, note),
      updated_by_id = ${adminId}::uuid,
      resolved_at = CASE WHEN ${status} = 'resolved' THEN NOW() ELSE NULL END,
      updated_at = NOW()
    WHERE id = ${id}::uuid
  `);
}

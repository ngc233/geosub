import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.ts";
import type { AuthorityProductAudit } from "./search-authority-coverage.ts";
import {
  classifyAuthorityCoverageBusinessEffect,
  classifyAuthorityCoverageTaskEffect,
  isAuthorityCoverageTaskStatus,
  type AuthorityCoverageBusinessEffect,
  type AuthorityCoverageBusinessMetrics,
  type AuthorityCoverageGapCode,
  type AuthorityCoverageSnapshot,
  type AuthorityCoverageTaskEffect,
  type AuthorityCoverageTaskStatus,
} from "./search-authority-task.ts";

export { isAuthorityCoverageTaskStatus };

type AuthorityCoverageTaskRow = {
  id: string;
  product_id: string;
  gap_code: AuthorityCoverageGapCode;
  action_kind: "collect" | "review_data" | "edit_content";
  status: AuthorityCoverageTaskStatus;
  action_href: string;
  note: string | null;
  baseline_price_count: number;
  baseline_stale_price_count: number;
  baseline_country_count: number;
  baseline_tax_gap_count: number;
  baseline_seo_locale_count: number;
  baseline_decision_score: number;
  baseline_quality_score: number;
  evaluation_started_at: Date;
  resolved_at: Date | null;
  updated_at: Date;
  post_task_result_clicks: bigint;
  post_task_plan_engagements: bigint;
  post_task_commercial_conversions: bigint;
};

export type AuthorityCoverageTaskRecord = {
  id: string;
  productId: string;
  gapCode: AuthorityCoverageGapCode;
  actionKind: AuthorityCoverageTaskRow["action_kind"];
  status: AuthorityCoverageTaskStatus;
  actionHref: string;
  note: string | null;
  baseline: AuthorityCoverageSnapshot;
  current: AuthorityCoverageSnapshot;
  effect: AuthorityCoverageTaskEffect;
  businessMetrics: AuthorityCoverageBusinessMetrics;
  businessEffect: AuthorityCoverageBusinessEffect;
  evaluationStartedAt: Date;
  resolvedAt: Date | null;
  updatedAt: Date;
};

function snapshotFromAudit(audit: AuthorityProductAudit): AuthorityCoverageSnapshot {
  return {
    priceCount: audit.priceCount,
    stalePriceCount: audit.stalePriceCount,
    countryCount: audit.countryCount,
    taxGapCount: audit.taxGapCount,
    completeSeoLocaleCount: audit.completeSeoLocaleCount,
    requiredSeoLocaleCount: audit.requiredSeoLocaleCount,
    decisionScore: audit.sections.decision,
    score: audit.score,
  };
}

function baselineFromRow(
  row: AuthorityCoverageTaskRow,
  requiredSeoLocaleCount: number,
): AuthorityCoverageSnapshot {
  return {
    priceCount: row.baseline_price_count,
    stalePriceCount: row.baseline_stale_price_count,
    countryCount: row.baseline_country_count,
    taxGapCount: row.baseline_tax_gap_count,
    completeSeoLocaleCount: row.baseline_seo_locale_count,
    requiredSeoLocaleCount,
    decisionScore: row.baseline_decision_score,
    score: row.baseline_quality_score,
  };
}

export async function getAuthorityCoverageTaskRecords(
  audits: AuthorityProductAudit[],
  limit = 100,
) {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 200);
  const auditByProduct = new Map(audits.map((audit) => [audit.id, audit]));
  const rows = await prisma.$queryRaw<AuthorityCoverageTaskRow[]>(Prisma.sql`
    SELECT
      id::text,
      product_id::text,
      gap_code,
      action_kind,
      status,
      action_href,
      note,
      baseline_price_count,
      baseline_stale_price_count,
      baseline_country_count,
      baseline_tax_gap_count,
      baseline_seo_locale_count,
      baseline_decision_score,
      baseline_quality_score,
      evaluation_started_at,
      resolved_at,
      updated_at,
      business.post_task_result_clicks,
      business.post_task_plan_engagements,
      business.post_task_commercial_conversions
    FROM authority_coverage_tasks task
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) FILTER (
          WHERE event.event_key = 'click_search_result'
        ) AS post_task_result_clicks,
        COUNT(*) FILTER (
          WHERE event.event_key = 'select_plan'
        ) AS post_task_plan_engagements,
        COUNT(*) FILTER (
          WHERE event.event_key IN (
            'click_affiliate',
            'click_official',
            'click_ad'
          )
        ) AS post_task_commercial_conversions
      FROM event_logs event
      WHERE event.product_id = task.product_id
        AND event.created_at >= task.evaluation_started_at
        AND event.page_path NOT LIKE '/admin%'
        AND COALESCE(event.page_path, '') NOT LIKE '%tracking-test%'
        AND event.event_key IN (
          'click_search_result',
          'select_plan',
          'click_affiliate',
          'click_official',
          'click_ad'
        )
    ) business ON TRUE
    ORDER BY
      CASE status WHEN 'in_progress' THEN 1 WHEN 'resolved' THEN 2 ELSE 3 END,
      task.updated_at DESC
    LIMIT ${safeLimit}
  `);

  return rows.flatMap((row) => {
    const audit = auditByProduct.get(row.product_id);
    if (!audit || !isAuthorityCoverageTaskStatus(row.status)) return [];
    const current = snapshotFromAudit(audit);
    const baseline = baselineFromRow(row, audit.requiredSeoLocaleCount);
    const businessMetrics = {
      resultClicks: Number(row.post_task_result_clicks),
      planEngagements: Number(row.post_task_plan_engagements),
      commercialConversions: Number(row.post_task_commercial_conversions),
    } satisfies AuthorityCoverageBusinessMetrics;
    return [{
      id: row.id,
      productId: row.product_id,
      gapCode: row.gap_code,
      actionKind: row.action_kind,
      status: row.status,
      actionHref: row.action_href,
      note: row.note,
      baseline,
      current,
      effect: classifyAuthorityCoverageTaskEffect({
        gapCode: row.gap_code,
        baseline,
        current,
        taskStatus: row.status,
      }),
      businessMetrics,
      businessEffect: classifyAuthorityCoverageBusinessEffect(businessMetrics),
      evaluationStartedAt: row.evaluation_started_at,
      resolvedAt: row.resolved_at,
      updatedAt: row.updated_at,
    } satisfies AuthorityCoverageTaskRecord];
  });
}

export async function startAuthorityCoverageTask({
  audit,
  gapCode,
  actionKind,
  actionHref,
  adminId,
}: {
  audit: AuthorityProductAudit;
  gapCode: AuthorityCoverageGapCode;
  actionKind: AuthorityCoverageTaskRow["action_kind"];
  actionHref: string;
  adminId: string;
}) {
  const baseline = snapshotFromAudit(audit);
  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    INSERT INTO authority_coverage_tasks (
      product_id,
      gap_code,
      action_kind,
      status,
      action_href,
      baseline_price_count,
      baseline_stale_price_count,
      baseline_country_count,
      baseline_tax_gap_count,
      baseline_seo_locale_count,
      baseline_decision_score,
      baseline_quality_score,
      created_by_id,
      updated_by_id,
      evaluation_started_at,
      created_at,
      updated_at
    ) VALUES (
      ${audit.id}::uuid,
      ${gapCode},
      ${actionKind},
      'in_progress',
      ${actionHref.slice(0, 1000)},
      ${baseline.priceCount},
      ${baseline.stalePriceCount},
      ${baseline.countryCount},
      ${baseline.taxGapCount},
      ${baseline.completeSeoLocaleCount},
      ${baseline.decisionScore},
      ${baseline.score},
      ${adminId}::uuid,
      ${adminId}::uuid,
      NOW(),
      NOW(),
      NOW()
    )
    ON CONFLICT (product_id, gap_code) DO UPDATE SET
      action_kind = EXCLUDED.action_kind,
      status = 'in_progress',
      action_href = EXCLUDED.action_href,
      baseline_price_count = EXCLUDED.baseline_price_count,
      baseline_stale_price_count = EXCLUDED.baseline_stale_price_count,
      baseline_country_count = EXCLUDED.baseline_country_count,
      baseline_tax_gap_count = EXCLUDED.baseline_tax_gap_count,
      baseline_seo_locale_count = EXCLUDED.baseline_seo_locale_count,
      baseline_decision_score = EXCLUDED.baseline_decision_score,
      baseline_quality_score = EXCLUDED.baseline_quality_score,
      updated_by_id = EXCLUDED.updated_by_id,
      evaluation_started_at = NOW(),
      resolved_at = NULL,
      updated_at = NOW()
    RETURNING id::text
  `);
  return rows[0];
}

export async function updateAuthorityCoverageTaskStatus({
  id,
  status,
  note,
  adminId,
}: {
  id: string;
  status: AuthorityCoverageTaskStatus;
  note?: string | null;
  adminId: string;
}) {
  await prisma.$executeRaw(Prisma.sql`
    UPDATE authority_coverage_tasks
    SET
      status = ${status},
      note = COALESCE(${note?.trim().slice(0, 1000) || null}, note),
      updated_by_id = ${adminId}::uuid,
      resolved_at = CASE WHEN ${status} = 'resolved' THEN NOW() ELSE NULL END,
      updated_at = NOW()
    WHERE id = ${id}::uuid
  `);
}

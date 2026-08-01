import "server-only";

import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import {
  isSearchOpportunityWorkflowStatus,
  normalizeSearchOpportunityQuery,
  classifySearchOpportunityEffect,
  type SearchGapKind,
  type SearchOpportunityEffectState,
  type SearchOpportunityWorkflowStatus,
} from "./search-opportunity";

export {
  isSearchOpportunityWorkflowStatus,
  normalizeSearchOpportunityQuery,
};
export type { SearchOpportunityWorkflowStatus };

export type SearchOpportunityRecord = {
  id: string;
  query: string;
  normalizedQuery: string;
  kind: SearchGapKind;
  status: SearchOpportunityWorkflowStatus;
  note: string | null;
  linkedCandidateId: string | null;
  linkedArticleId: string | null;
  firstSeenAt: Date;
  lastSeenAt: Date;
  resolvedAt: Date | null;
  evaluationStartedAt: Date | null;
  effectState: SearchOpportunityEffectState;
  effectSearchCount: number;
  effectNoResultCount: number;
  effectClickCount: number;
  effectVisitorCount: number;
  effectLastSeenAt: Date | null;
  updatedAt: Date;
};

type SearchOpportunityRow = {
  id: string;
  query: string;
  normalized_query: string;
  kind: SearchGapKind;
  status: SearchOpportunityWorkflowStatus;
  note: string | null;
  linked_candidate_id: string | null;
  linked_article_id: string | null;
  first_seen_at: Date;
  last_seen_at: Date;
  resolved_at: Date | null;
  evaluation_started_at: Date | null;
  effect_search_count: bigint;
  effect_no_result_count: bigint;
  effect_click_count: bigint;
  effect_visitor_count: bigint;
  effect_last_seen_at: Date | null;
  updated_at: Date;
};

function mapRecord(row: SearchOpportunityRow): SearchOpportunityRecord {
  const effectMetrics = {
    searchCount: Number(row.effect_search_count || 0),
    noResultCount: Number(row.effect_no_result_count || 0),
    clickCount: Number(row.effect_click_count || 0),
    visitorCount: Number(row.effect_visitor_count || 0),
  };

  return {
    id: row.id,
    query: row.query,
    normalizedQuery: row.normalized_query,
    kind: row.kind,
    status: row.status,
    note: row.note,
    linkedCandidateId: row.linked_candidate_id,
    linkedArticleId: row.linked_article_id,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    resolvedAt: row.resolved_at,
    evaluationStartedAt: row.evaluation_started_at,
    effectState: classifySearchOpportunityEffect(effectMetrics),
    effectSearchCount: effectMetrics.searchCount,
    effectNoResultCount: effectMetrics.noResultCount,
    effectClickCount: effectMetrics.clickCount,
    effectVisitorCount: effectMetrics.visitorCount,
    effectLastSeenAt: row.effect_last_seen_at,
    updatedAt: row.updated_at,
  };
}

export async function getSearchOpportunityRecords(limit = 100) {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 200);
  const rows = await prisma.$queryRaw<SearchOpportunityRow[]>(Prisma.sql`
    SELECT
      opportunity.id::text,
      opportunity.query,
      opportunity.normalized_query,
      opportunity.kind,
      opportunity.status,
      opportunity.note,
      opportunity.linked_candidate_id::text,
      opportunity.linked_article_id::text,
      opportunity.first_seen_at,
      opportunity.last_seen_at,
      opportunity.resolved_at,
      opportunity.evaluation_started_at,
      COALESCE(effect.search_count, 0) AS effect_search_count,
      COALESCE(effect.no_result_count, 0) AS effect_no_result_count,
      COALESCE(effect.click_count, 0) AS effect_click_count,
      COALESCE(effect.visitor_count, 0) AS effect_visitor_count,
      effect.last_seen_at AS effect_last_seen_at,
      opportunity.updated_at
    FROM search_opportunities AS opportunity
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) FILTER (
          WHERE event.event_key IN ('search_digital_service', 'search_no_result')
        ) AS search_count,
        COUNT(*) FILTER (
          WHERE event.event_key = 'search_no_result'
        ) AS no_result_count,
        COUNT(*) FILTER (
          WHERE event.event_key = 'click_search_result'
        ) AS click_count,
        COUNT(DISTINCT COALESCE(event.session_id, event.anonymous_id))
          AS visitor_count,
        MAX(event.created_at) AS last_seen_at
      FROM event_logs AS event
      WHERE opportunity.evaluation_started_at IS NOT NULL
        AND event.created_at >= opportunity.evaluation_started_at
        AND event.page_path NOT LIKE '/admin%'
        AND COALESCE(event.page_path, '') NOT LIKE '%tracking-test%'
        AND event.event_key IN (
          'search_digital_service',
          'search_no_result',
          'click_search_result'
        )
        AND LOWER(
          REGEXP_REPLACE(TRIM(event.metadata->>'query'), '\s+', ' ', 'g')
        ) = opportunity.normalized_query
    ) AS effect ON TRUE
    ORDER BY
      CASE opportunity.status
        WHEN 'in_progress' THEN 1
        WHEN 'open' THEN 2
        WHEN 'resolved' THEN 3
        ELSE 4
      END,
      opportunity.updated_at DESC
    LIMIT ${safeLimit}
  `);

  return rows.map(mapRecord);
}

export async function saveSearchOpportunity({
  query,
  kind,
  status,
  note,
  adminId,
}: {
  query: string;
  kind: SearchGapKind;
  status: SearchOpportunityWorkflowStatus;
  note?: string | null;
  adminId: string;
}) {
  const normalizedQuery = normalizeSearchOpportunityQuery(query);
  if (!normalizedQuery) {
    throw new Error("Search opportunity query is required.");
  }

  const rows = await prisma.$queryRaw<SearchOpportunityRow[]>(Prisma.sql`
    INSERT INTO search_opportunities (
      query,
      normalized_query,
      kind,
      status,
      note,
      created_by_id,
      updated_by_id,
      first_seen_at,
      last_seen_at,
      evaluation_started_at,
      resolved_at,
      created_at,
      updated_at
    )
    VALUES (
      ${query.trim().slice(0, 240)},
      ${normalizedQuery},
      ${kind},
      ${status},
      ${note?.trim().slice(0, 1000) || null},
      ${adminId}::uuid,
      ${adminId}::uuid,
      NOW(),
      NOW(),
      CASE WHEN ${status} = 'in_progress' THEN NOW() ELSE NULL END,
      CASE WHEN ${status} = 'resolved' THEN NOW() ELSE NULL END,
      NOW(),
      NOW()
    )
    ON CONFLICT (normalized_query) DO UPDATE
    SET
      query = EXCLUDED.query,
      kind = EXCLUDED.kind,
      status = EXCLUDED.status,
      note = COALESCE(EXCLUDED.note, search_opportunities.note),
      updated_by_id = EXCLUDED.updated_by_id,
      last_seen_at = NOW(),
      evaluation_started_at = CASE
        WHEN EXCLUDED.status = 'open' THEN NULL
        WHEN EXCLUDED.status = 'in_progress'
          AND search_opportunities.status <> 'in_progress' THEN NOW()
        ELSE search_opportunities.evaluation_started_at
      END,
      resolved_at = CASE
        WHEN EXCLUDED.status = 'resolved' THEN NOW()
        ELSE NULL
      END,
      updated_at = NOW()
    RETURNING
      id::text,
      query,
      normalized_query,
      kind,
      status,
      note,
      linked_candidate_id::text,
      linked_article_id::text,
      first_seen_at,
      last_seen_at,
      evaluation_started_at,
      resolved_at,
      0::bigint AS effect_search_count,
      0::bigint AS effect_no_result_count,
      0::bigint AS effect_click_count,
      0::bigint AS effect_visitor_count,
      NULL::timestamptz AS effect_last_seen_at,
      updated_at
  `);

  return mapRecord(rows[0]);
}

export async function linkSearchOpportunity({
  query,
  candidateId,
  articleId,
  adminId,
}: {
  query: string;
  candidateId?: string | null;
  articleId?: string | null;
  adminId: string;
}) {
  const normalizedQuery = normalizeSearchOpportunityQuery(query);
  if (!normalizedQuery || (!candidateId && !articleId)) return;

  await prisma.$executeRaw(Prisma.sql`
    UPDATE search_opportunities
    SET
      linked_candidate_id = COALESCE(
        ${candidateId || null}::uuid,
        linked_candidate_id
      ),
      linked_article_id = COALESCE(
        ${articleId || null}::uuid,
        linked_article_id
      ),
      status = 'in_progress',
      evaluation_started_at = COALESCE(evaluation_started_at, NOW()),
      updated_by_id = ${adminId}::uuid,
      updated_at = NOW()
    WHERE normalized_query = ${normalizedQuery}
  `);
}

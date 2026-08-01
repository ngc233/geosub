import { Prisma } from "@prisma/client";
import { prisma } from "./prisma.ts";
import type { SearchDemandTerm } from "./search-opportunity.ts";

export {
  buildSearchGapQueue,
  buildSearchGrowthQueue,
  classifySearchGap,
  shouldShowSearchOpportunity,
} from "./search-opportunity.ts";
export type {
  SearchConversionSignal,
  SearchDemandTerm,
  SearchGapKind,
  SearchGapSuggestion,
  SearchGrowthOpportunity,
  SearchGrowthPriorityTier,
  SearchGrowthStage,
  SearchOpportunityStatus,
} from "./search-opportunity.ts";

export const SEARCH_DEMAND_RANGES = [7, 30, 90] as const;
export type SearchDemandRange = (typeof SEARCH_DEMAND_RANGES)[number];

type SearchTermRow = {
  query: string;
  locales: string | null;
  search_count: bigint;
  no_result_count: bigint;
  click_count: bigint;
  visitor_count: bigint;
  last_seen_at: Date;
};

type SearchResultRow = {
  title: string;
  href: string;
  kind: string;
  click_count: bigint;
  last_clicked_at: Date;
};

type SearchTotalsRow = {
  search_count: bigint;
  no_result_count: bigint;
  click_count: bigint;
  unique_term_count: bigint;
};

type SearchAliasRow = {
  query: string;
  locale: string;
  result_title: string;
  result_href: string;
  result_kind: string;
  product_id: string | null;
  plan_id: string | null;
  click_count: bigint;
  visitor_count: bigint;
  last_clicked_at: Date;
};

type SearchConversionRow = {
  query: string;
  locale: string;
  product_id: string | null;
  plan_id: string | null;
  target_title: string | null;
  target_href: string | null;
  target_kind: string | null;
  result_click_count: bigint;
  visitor_count: bigint;
  plan_engagement_count: bigint;
  commercial_conversion_count: bigint;
  last_clicked_at: Date;
  total_result_click_count: bigint;
  total_plan_engagement_count: bigint;
  total_commercial_conversion_count: bigint;
};

export type SearchDemandResult = {
  title: string;
  href: string;
  kind: string;
  clickCount: number;
  lastClickedAt: Date;
};

export type SearchAliasSuggestion = {
  query: string;
  locale: string;
  resultTitle: string;
  resultHref: string;
  resultKind: string;
  productId: string | null;
  planId: string | null;
  clickCount: number;
  visitorCount: number;
  lastClickedAt: Date;
};

export type SearchConversionTerm = {
  query: string;
  locale: string;
  productId: string | null;
  planId: string | null;
  targetTitle: string | null;
  targetHref: string | null;
  targetKind: string | null;
  resultClickCount: number;
  visitorCount: number;
  planEngagementCount: number;
  commercialConversionCount: number;
  commercialConversionRate: number;
  lastClickedAt: Date;
};

export function parseSearchDemandRange(value?: string): SearchDemandRange {
  const days = Number(value || 30);
  return SEARCH_DEMAND_RANGES.includes(days as SearchDemandRange)
    ? days as SearchDemandRange
    : 30;
}

export async function getSearchDemandSummary(days: SearchDemandRange) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const productionFilter = Prisma.sql`
    "created_at" >= ${since}
    AND "page_path" NOT LIKE '/admin%'
    AND COALESCE("page_path", '') NOT LIKE '%tracking-test%'
  `;

  const [
    termRows,
    resultRows,
    totalsRows,
    aliasRows,
    conversionRows,
  ] = await Promise.all([
    prisma.$queryRaw<SearchTermRow[]>(Prisma.sql`
      SELECT
        LOWER(TRIM("metadata"->>'query')) AS "query",
        STRING_AGG(
          DISTINCT COALESCE("locale", 'unknown'),
          ', ' ORDER BY COALESCE("locale", 'unknown')
        ) AS "locales",
        COUNT(*) FILTER (
          WHERE "event_key" IN ('search_digital_service', 'search_no_result')
        ) AS "search_count",
        COUNT(*) FILTER (
          WHERE "event_key" = 'search_no_result'
        ) AS "no_result_count",
        COUNT(*) FILTER (
          WHERE "event_key" = 'click_search_result'
        ) AS "click_count",
        COUNT(DISTINCT COALESCE("session_id", "anonymous_id"))
          AS "visitor_count",
        MAX("created_at") AS "last_seen_at"
      FROM "event_logs"
      WHERE ${productionFilter}
        AND "event_key" IN (
          'search_digital_service',
          'search_no_result',
          'click_search_result'
        )
        AND COALESCE("metadata"->>'query', '') <> ''
      GROUP BY LOWER(TRIM("metadata"->>'query'))
      ORDER BY
        COUNT(*) FILTER (WHERE "event_key" = 'search_no_result') DESC,
        COUNT(*) FILTER (
          WHERE "event_key" IN ('search_digital_service', 'search_no_result')
        ) DESC,
        MAX("created_at") DESC
      LIMIT 100
    `),
    prisma.$queryRaw<SearchResultRow[]>(Prisma.sql`
      SELECT
        COALESCE(
          NULLIF(TRIM("metadata"->>'resultTitle'), ''),
          '未命名结果'
        ) AS "title",
        COALESCE("metadata"->>'resultHref', '') AS "href",
        COALESCE("metadata"->>'resultKind', 'unknown') AS "kind",
        COUNT(*) AS "click_count",
        MAX("created_at") AS "last_clicked_at"
      FROM "event_logs"
      WHERE ${productionFilter}
        AND "event_key" = 'click_search_result'
        AND COALESCE("metadata"->>'resultHref', '') <> ''
      GROUP BY
        COALESCE(NULLIF(TRIM("metadata"->>'resultTitle'), ''), '未命名结果'),
        COALESCE("metadata"->>'resultHref', ''),
        COALESCE("metadata"->>'resultKind', 'unknown')
      ORDER BY COUNT(*) DESC, MAX("created_at") DESC
      LIMIT 20
    `),
    prisma.$queryRaw<SearchTotalsRow[]>(Prisma.sql`
      SELECT
        COUNT(*) FILTER (
          WHERE "event_key" IN ('search_digital_service', 'search_no_result')
        ) AS "search_count",
        COUNT(*) FILTER (
          WHERE "event_key" = 'search_no_result'
        ) AS "no_result_count",
        COUNT(*) FILTER (
          WHERE "event_key" = 'click_search_result'
        ) AS "click_count",
        COUNT(DISTINCT LOWER(TRIM("metadata"->>'query'))) FILTER (
          WHERE "event_key" IN ('search_digital_service', 'search_no_result')
        ) AS "unique_term_count"
      FROM "event_logs"
      WHERE ${productionFilter}
        AND "event_key" IN (
          'search_digital_service',
          'search_no_result',
          'click_search_result'
        )
        AND COALESCE("metadata"->>'query', '') <> ''
    `),
    prisma.$queryRaw<SearchAliasRow[]>(Prisma.sql`
      SELECT
        LOWER(TRIM("metadata"->>'query')) AS "query",
        COALESCE("locale", 'zh') AS "locale",
        COALESCE(NULLIF(TRIM("metadata"->>'resultTitle'), ''), '未命名结果')
          AS "result_title",
        COALESCE("metadata"->>'resultHref', '') AS "result_href",
        COALESCE("metadata"->>'resultKind', 'unknown') AS "result_kind",
        "product_id"::text,
        "plan_id"::text,
        COUNT(*) AS "click_count",
        COUNT(DISTINCT COALESCE("session_id", "anonymous_id"))
          AS "visitor_count",
        MAX("created_at") AS "last_clicked_at"
      FROM "event_logs"
      WHERE ${productionFilter}
        AND "event_key" = 'click_search_result'
        AND COALESCE("metadata"->>'query', '') <> ''
        AND COALESCE("metadata"->>'resultHref', '') <> ''
        AND COALESCE("metadata"->>'resultKind', '') IN ('product', 'plan')
        AND (
          ("metadata"->>'resultKind' = 'product' AND "product_id" IS NOT NULL)
          OR
          ("metadata"->>'resultKind' = 'plan' AND "plan_id" IS NOT NULL)
        )
        AND LOWER(TRIM("metadata"->>'query'))
          <> LOWER(TRIM(COALESCE("metadata"->>'resultTitle', '')))
      GROUP BY
        LOWER(TRIM("metadata"->>'query')),
        COALESCE("locale", 'zh'),
        COALESCE(NULLIF(TRIM("metadata"->>'resultTitle'), ''), '未命名结果'),
        COALESCE("metadata"->>'resultHref', ''),
        COALESCE("metadata"->>'resultKind', 'unknown'),
        "product_id",
        "plan_id"
      ORDER BY
        COUNT(*) DESC,
        COUNT(DISTINCT COALESCE("session_id", "anonymous_id")) DESC,
        MAX("created_at") DESC
      LIMIT 30
    `),
    prisma.$queryRaw<SearchConversionRow[]>(Prisma.sql`
      WITH search_journeys AS (
        SELECT
          event.id,
          LOWER(TRIM(event.metadata->>'query')) AS query,
          COALESCE(event.locale, 'zh') AS locale,
          COALESCE(
            NULLIF(event.session_id, ''),
            NULLIF(event.anonymous_id, '')
          ) AS session_key,
          COALESCE(event.metadata->>'resultKind', 'unknown') AS target_kind,
          event.product_id,
          event.plan_id,
          NULLIF(TRIM(event.metadata->>'resultTitle'), '') AS target_title,
          NULLIF(TRIM(event.metadata->>'resultHref'), '') AS target_href,
          event.created_at AS search_clicked_at,
          LEAD(event.created_at) OVER (
            PARTITION BY COALESCE(
              NULLIF(event.session_id, ''),
              NULLIF(event.anonymous_id, '')
            )
            ORDER BY event.created_at, event.id
          ) AS next_search_clicked_at
        FROM event_logs event
        WHERE event.created_at >= ${since}
          AND event.page_path NOT LIKE '/admin%'
          AND COALESCE(event.page_path, '') NOT LIKE '%tracking-test%'
          AND event.event_key = 'click_search_result'
          AND COALESCE(event.metadata->>'query', '') <> ''
          AND COALESCE(
            NULLIF(event.session_id, ''),
            NULLIF(event.anonymous_id, '')
          ) IS NOT NULL
      ),
      journey_outcomes AS (
        SELECT
          journey.id,
          journey.query,
          journey.locale,
          journey.session_key,
          journey.target_kind,
          journey.product_id,
          journey.plan_id,
          journey.target_title,
          journey.target_href,
          journey.search_clicked_at,
          MIN(event.created_at) FILTER (
            WHERE event.event_key = 'select_plan'
          ) AS plan_engaged_at,
          MIN(event.created_at) FILTER (
            WHERE event.event_key IN (
              'click_affiliate',
              'click_official',
              'click_ad'
            )
          ) AS commercial_converted_at
        FROM search_journeys journey
        LEFT JOIN event_logs event
          ON event.created_at >= journey.search_clicked_at
          AND event.created_at <= journey.search_clicked_at + INTERVAL '30 minutes'
          AND (
            journey.next_search_clicked_at IS NULL
            OR event.created_at < journey.next_search_clicked_at
          )
          AND (
            event.session_id = journey.session_key
            OR event.anonymous_id = journey.session_key
          )
          AND event.event_key IN (
            'select_plan',
            'click_affiliate',
            'click_official',
            'click_ad'
          )
          AND event.page_path NOT LIKE '/admin%'
          AND COALESCE(event.page_path, '') NOT LIKE '%tracking-test%'
        GROUP BY
          journey.id,
          journey.query,
          journey.locale,
          journey.session_key,
          journey.target_kind,
          journey.product_id,
          journey.plan_id,
          journey.target_title,
          journey.target_href,
          journey.search_clicked_at
      ),
      target_counts AS (
        SELECT
          query,
          locale,
          product_id,
          plan_id,
          target_title,
          target_href,
          target_kind,
          COUNT(*) AS target_click_count,
          ROW_NUMBER() OVER (
            PARTITION BY query, locale
            ORDER BY
              COUNT(*) DESC,
              MAX(search_clicked_at) DESC,
              COALESCE(target_title, '') ASC
          ) AS target_rank
        FROM journey_outcomes
        GROUP BY
          query,
          locale,
          product_id,
          plan_id,
          target_title,
          target_href,
          target_kind
      ),
      conversion_terms AS (
        SELECT
          query,
          locale,
          COUNT(*) AS result_click_count,
          COUNT(DISTINCT session_key) AS visitor_count,
          COUNT(*) FILTER (
            WHERE target_kind = 'plan' OR plan_engaged_at IS NOT NULL
          ) AS plan_engagement_count,
          COUNT(*) FILTER (
            WHERE commercial_converted_at IS NOT NULL
          ) AS commercial_conversion_count,
          MAX(search_clicked_at) AS last_clicked_at
        FROM journey_outcomes
        GROUP BY query, locale
      )
      SELECT
        term.query,
        term.locale,
        target.product_id,
        target.plan_id,
        target.target_title,
        target.target_href,
        target.target_kind,
        term.result_click_count,
        term.visitor_count,
        term.plan_engagement_count,
        term.commercial_conversion_count,
        term.last_clicked_at,
        SUM(term.result_click_count) OVER () AS total_result_click_count,
        SUM(term.plan_engagement_count) OVER ()
          AS total_plan_engagement_count,
        SUM(term.commercial_conversion_count) OVER ()
          AS total_commercial_conversion_count
      FROM conversion_terms term
      LEFT JOIN target_counts target
        ON target.query = term.query
       AND target.locale = term.locale
       AND target.target_rank = 1
      ORDER BY
        term.commercial_conversion_count DESC,
        term.plan_engagement_count DESC,
        term.result_click_count DESC,
        term.last_clicked_at DESC
      LIMIT 50
    `),
  ]);

  const terms: SearchDemandTerm[] = termRows.map((row) => {
    const searchCount = Number(row.search_count);
    const clickCount = Number(row.click_count);

    return {
      query: row.query,
      locales: row.locales ? row.locales.split(", ").filter(Boolean) : [],
      searchCount,
      noResultCount: Number(row.no_result_count),
      clickCount,
      clickRate: searchCount > 0
        ? Math.round((clickCount / searchCount) * 100)
        : 0,
      visitorCount: Number(row.visitor_count),
      lastSeenAt: row.last_seen_at,
    };
  });
  const results: SearchDemandResult[] = resultRows.map((row) => ({
    title: row.title,
    href: row.href,
    kind: row.kind,
    clickCount: Number(row.click_count),
    lastClickedAt: row.last_clicked_at,
  }));
  const totals = totalsRows[0];
  const aliasSuggestions: SearchAliasSuggestion[] = aliasRows.map((row) => ({
    query: row.query,
    locale: row.locale,
    resultTitle: row.result_title,
    resultHref: row.result_href,
    resultKind: row.result_kind,
    productId: row.product_id,
    planId: row.plan_id,
    clickCount: Number(row.click_count),
    visitorCount: Number(row.visitor_count),
    lastClickedAt: row.last_clicked_at,
  }));
  const conversionTerms: SearchConversionTerm[] = conversionRows.map((row) => {
    const resultClickCount = Number(row.result_click_count);
    const commercialConversionCount = Number(row.commercial_conversion_count);

    return {
      query: row.query,
      locale: row.locale,
      productId: row.product_id,
      planId: row.plan_id,
      targetTitle: row.target_title,
      targetHref: row.target_href,
      targetKind: row.target_kind,
      resultClickCount,
      visitorCount: Number(row.visitor_count),
      planEngagementCount: Number(row.plan_engagement_count),
      commercialConversionCount,
      commercialConversionRate: resultClickCount > 0
        ? Math.round((commercialConversionCount / resultClickCount) * 100)
        : 0,
      lastClickedAt: row.last_clicked_at,
    };
  });
  const conversionTotals = conversionRows[0]
    ? {
        resultClicks: Number(conversionRows[0].total_result_click_count),
        planEngagements: Number(
          conversionRows[0].total_plan_engagement_count,
        ),
        commercialConversions: Number(
          conversionRows[0].total_commercial_conversion_count,
        ),
      }
    : {
        resultClicks: 0,
        planEngagements: 0,
        commercialConversions: 0,
      };

  return {
    terms,
    results,
    totalSearches: Number(totals?.search_count || 0),
    totalNoResults: Number(totals?.no_result_count || 0),
    totalClicks: Number(totals?.click_count || 0),
    uniqueTerms: Number(totals?.unique_term_count || 0),
    aliasSuggestions,
    conversionTerms,
    conversionTotals: {
      ...conversionTotals,
      commercialConversionRate: conversionTotals.resultClicks > 0
        ? Math.round(
            (
              conversionTotals.commercialConversions
              / conversionTotals.resultClicks
            ) * 100,
          )
        : 0,
    },
  };
}

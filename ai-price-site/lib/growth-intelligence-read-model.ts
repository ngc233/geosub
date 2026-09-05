import "server-only";

import { AGGREGATE_PAGE_VIEW_METRIC } from "./aggregate-page-views.ts";
import { getSearchDemandSummary } from "./admin-search-demand.ts";
import { getSeoTrafficConversionOverview } from "./admin-seo-conversion.ts";
import { prisma } from "./prisma.ts";
import { classifyGrowthQuery } from "./growth-intelligence.ts";
import {
  getLatestSeoSearchPageImportBatch,
  type SeoSearchPageImportState,
} from "./seo-search-observation-import.ts";
import { getSeoSearchPageObservationState } from "./seo-search-observation-data.ts";
import {
  seoSearchPerformanceBaseline,
  type SeoSearchEngine,
  type SeoSearchPageObservation,
} from "./seo-search-performance-baseline.ts";
import { buildSearchGrowthQueue } from "./search-opportunity.ts";

export const GROWTH_INTELLIGENCE_OVERVIEW_SCHEMA_VERSION =
  "growth-intelligence.overview.v1";
export const GROWTH_INTELLIGENCE_WINDOW_DAYS = [7, 30, 90] as const;

export type GrowthIntelligenceWindowDays =
  (typeof GROWTH_INTELLIGENCE_WINDOW_DAYS)[number];

type GrowthSourceStatus = "complete" | "partial" | "unavailable";

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function utcDateDaysAgo(days: number, now = new Date()) {
  return new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - days,
    ),
  );
}

function daysSince(date: string, now = new Date()) {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return Math.max(
    0,
    Math.floor((utcDateDaysAgo(0, now).getTime() - parsed.getTime()) / 86_400_000),
  );
}

function percent(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 10_000) / 100;
}

function weightedPosition(observations: SeoSearchPageObservation[]) {
  const positioned = observations.filter(
    (item) => item.averagePosition !== undefined && item.impressions > 0,
  );
  const impressions = positioned.reduce((total, item) => total + item.impressions, 0);
  if (impressions === 0) return null;
  return Math.round(
    (positioned.reduce(
      (total, item) => total + item.averagePosition! * item.impressions,
      0,
    ) /
      impressions) *
      100,
  ) / 100;
}

function sourceObservationRows(
  state: SeoSearchPageImportState,
  engine: SeoSearchEngine,
) {
  const batch = getLatestSeoSearchPageImportBatch(state, engine);
  return {
    mode: batch ? ("manual_import" as const) : ("static_baseline" as const),
    importedAt: batch?.importedAt || null,
    evidence: batch?.evidence || null,
    rows: batch
      ? batch.observations
      : seoSearchPerformanceBaseline.filter((item) => item.engine === engine),
  };
}

function summarizeSearchSource(
  state: SeoSearchPageImportState,
  engine: SeoSearchEngine,
  now: Date,
) {
  const source = sourceObservationRows(state, engine);
  if (source.rows.length === 0) {
    return {
      engine,
      mode: source.mode,
      status: "unavailable" as GrowthSourceStatus,
      periodStart: null,
      periodEnd: null,
      settledThrough: null,
      importedAt: source.importedAt,
      evidence: source.evidence,
      totalsScope: "captured_page_rows",
      totals: { clicks: 0, impressions: 0, ctr: 0, averagePosition: null },
      pages: [],
      limitations: ["No validated page-level observation is available."],
    };
  }

  const periodStart = source.rows
    .map((item) => item.periodStart)
    .sort()[0];
  const periodEnd = source.rows
    .map((item) => item.periodEnd)
    .sort()
    .at(-1)!;
  const clicks = source.rows.reduce((total, item) => total + item.clicks, 0);
  const impressions = source.rows.reduce(
    (total, item) => total + item.impressions,
    0,
  );
  return {
    engine,
    mode: source.mode,
    // Import validation proves row shape, not provider settlement or completeness.
    status: "partial" as GrowthSourceStatus,
    periodStart,
    periodEnd,
    settledThrough: null,
    importedAt: source.importedAt,
    evidence: source.evidence,
    totalsScope: "captured_page_rows",
    totals: {
      clicks,
      impressions,
      ctr: percent(clicks, impressions),
      averagePosition: weightedPosition(source.rows),
    },
    pages: [...source.rows]
      .sort(
        (left, right) =>
          right.impressions - left.impressions || left.path.localeCompare(right.path),
      )
      .slice(0, 20)
      .map((item) => ({
        path: item.path,
        clicks: item.clicks,
        impressions: item.impressions,
        ctr: percent(item.clicks, item.impressions),
        averagePosition: item.averagePosition ?? null,
      })),
    limitations: [
      source.mode === "static_baseline"
        ? "This source is a historical code baseline, not a live provider response."
        : "This source was manually imported and is not an automated provider sync.",
      "Provider settlement is unknown; observation dates and import recency are not settlement evidence.",
      "Totals describe the imported page subset and its own period, not site totals or the requested API window.",
      ...(source.evidence ? [`Web page rows: ${source.evidence.capturedRows} of ${source.evidence.availableRows} captured; ${source.evidence.excludedRoundedRows} rounded rows excluded.`] : []),
      ...(daysSince(periodEnd, now) > 7
        ? ["The observation period ended more than seven days ago."]
        : []),
      engine === "google"
        ? "Search Console query and page rows can be hidden or truncated; row sums are not guaranteed to equal property totals."
        : "Bing page and query detail can update on a different cadence from site totals.",
    ],
  };
}

export function parseGrowthIntelligenceWindowDays(
  value: string | null | undefined,
): GrowthIntelligenceWindowDays | null {
  const parsed = Number(value || 30);
  return GROWTH_INTELLIGENCE_WINDOW_DAYS.includes(
    parsed as GrowthIntelligenceWindowDays,
  )
    ? (parsed as GrowthIntelligenceWindowDays)
    : null;
}

export async function getGrowthIntelligenceOverview(
  days: GrowthIntelligenceWindowDays,
  now = new Date(),
) {
  const startDate = utcDateDaysAgo(days - 1, now);
  const endDate = utcDateDaysAgo(0, now);

  const [
    observationState,
    dailyPageViews,
    topPageViews,
    conversion,
    searchDemand,
  ] = await Promise.all([
    getSeoSearchPageObservationState(),
    prisma.dailyStat.findMany({
      where: {
        metricKey: AGGREGATE_PAGE_VIEW_METRIC,
        dimensionType: "global",
        dimensionKey: "global",
        statDate: { gte: startDate, lte: endDate },
      },
      select: { statDate: true, metricValue: true, updatedAt: true },
      orderBy: { statDate: "asc" },
    }),
    prisma.dailyStat.groupBy({
      by: ["dimensionKey"],
      where: {
        metricKey: AGGREGATE_PAGE_VIEW_METRIC,
        dimensionType: "page",
        statDate: { gte: startDate, lte: endDate },
      },
      _sum: { metricValue: true },
      orderBy: { _sum: { metricValue: "desc" } },
      take: 20,
    }),
    getSeoTrafficConversionOverview(days),
    getSearchDemandSummary(days),
  ]);

  const google = summarizeSearchSource(observationState, "google", now);
  const bing = summarizeSearchSource(observationState, "bing", now);
  const onsiteOpportunities = buildSearchGrowthQueue(
    searchDemand.terms,
    searchDemand.conversionTerms.map((term) => ({
      query: term.query,
      locales: [term.locale],
      resultClickCount: term.resultClickCount,
      visitorCount: term.visitorCount,
      planEngagementCount: term.planEngagementCount,
      commercialConversionCount: term.commercialConversionCount,
      commercialConversionRate: term.commercialConversionRate,
      lastClickedAt: term.lastClickedAt,
    })),
  )
    .flatMap((item) => {
      if (item.visitorCount < 2) return [];
      const classified = classifyGrowthQuery({
        query: item.query,
        sampleCount: item.searchCount,
        // Keep this endpoint's existing aggregation and length limits.
        minSampleCount: 3,
        maxLength: 120,
      });
      if (classified.status !== "accepted" || classified.safeQuery.length < 2) return [];
      return [{
        ...item,
        query: classified.safeQuery,
        untrustedEvidence: classified.untrustedEvidence,
      }];
    })
    .slice(0, 20)
    .map((item) => ({
      query: item.query,
      untrustedEvidence: item.untrustedEvidence,
      priorityScore: item.priorityScore,
      priorityTier: item.priorityTier,
      stage: item.stage,
      kind: item.kind,
      searchCount: item.searchCount,
      noResultCount: item.noResultCount,
      resultClickCount: item.resultClickCount,
      planEngagementCount: item.planEngagementCount,
      commercialConversionCount: item.commercialConversionCount,
      locales: item.locales,
      recommendedAction: item.recommendedAction,
      reason: item.reason,
    }));

  return {
    schemaVersion: GROWTH_INTELLIGENCE_OVERVIEW_SCHEMA_VERSION,
    generatedAt: now.toISOString(),
    mode: "transitional_read_model" as const,
    window: {
      days,
      periodStart: isoDate(startDate),
      periodEnd: isoDate(endDate),
      timezone: "UTC",
      includesPartialCurrentDay: true,
    },
    sources: {
      googleSearchConsole: google,
      bingWebmaster: bing,
      firstPartyPageViews: {
        status: dailyPageViews.length > 0
          ? ("partial" as GrowthSourceStatus)
          : ("unavailable" as GrowthSourceStatus),
        metric: AGGREGATE_PAGE_VIEW_METRIC,
        daily: dailyPageViews.map((row) => ({
          date: isoDate(row.statDate),
          views: row.metricValue,
          complete: isoDate(row.statDate) < isoDate(endDate),
          updatedAt: row.updatedAt.toISOString(),
        })),
        topPages: topPageViews.map((row) => ({
          path: row.dimensionKey,
          views: Number(row._sum.metricValue || 0),
        })),
        limitations: [
          "This counter is identifier-free and does not de-duplicate visitors or sessions.",
          "The current UTC day is partial until the next day starts.",
        ],
      },
      firstPartyBehavior: {
        status: "partial" as GrowthSourceStatus,
        consentRequired: true,
        conversion,
        searchDemand: {
          totalSearches: searchDemand.totalSearches,
          totalNoResults: searchDemand.totalNoResults,
          totalResultClicks: searchDemand.totalClicks,
          uniqueTerms: searchDemand.uniqueTerms,
          conversionTotals: searchDemand.conversionTotals,
          visibleOpportunityCount: onsiteOpportunities.length,
          suppressedRule:
            "Queries require at least 3 searches and 2 visitors and must pass sensitive-text filtering.",
        },
        limitations: [
          "Consent, blockers and missing identifiers can make first-party sessions lower than search-platform clicks.",
          "Only aggregate paths and thresholded search demand are exposed; raw events are excluded.",
        ],
      },
      ga4: { status: "unavailable" as GrowthSourceStatus, configured: false },
      cloudflare: { status: "unavailable" as GrowthSourceStatus, configured: false },
    },
    opportunities: {
      onsiteSearch: onsiteOpportunities,
    },
    safety: {
      readOnly: true,
      rawEventsIncluded: false,
      visitorIdentifiersIncluded: false,
      vendorCredentialsIncluded: false,
      externalActionsAvailable: false,
    },
    limitations: [
      "Google and Bing are still sourced from validated manual imports or historical baselines; automated provider collection is not enabled.",
      "This transitional endpoint is evidence for analysis, not proof that a recommendation should be executed.",
      "Google and Bing metrics retain separate source semantics and must not be treated as directly interchangeable.",
    ],
  };
}

export type GrowthIntelligenceOverview = Awaited<
  ReturnType<typeof getGrowthIntelligenceOverview>
>;

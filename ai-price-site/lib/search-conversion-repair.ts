import type { SearchConversionTerm } from "./admin-search-demand.ts";
import type { SearchConversionBlockerCode } from "./search-conversion-diagnostics.ts";
import { normalizeSearchOpportunityQuery } from "./search-opportunity.ts";

export const SEARCH_CONVERSION_REPAIR_STATUSES = [
  "in_progress",
  "resolved",
  "ignored",
] as const;

export type SearchConversionRepairStatus =
  (typeof SEARCH_CONVERSION_REPAIR_STATUSES)[number];

export type SearchConversionRepairEffect =
  | "waiting"
  | "traffic_only"
  | "engagement_up"
  | "converted";

export function isSearchConversionRepairStatus(
  value: string,
): value is SearchConversionRepairStatus {
  return SEARCH_CONVERSION_REPAIR_STATUSES.includes(
    value as SearchConversionRepairStatus,
  );
}

export function searchConversionTargetKey({
  productId,
  planId,
}: {
  productId: string | null;
  planId: string | null;
}) {
  if (planId) return `plan:${planId}`;
  if (productId) return `product:${productId}`;
  return "unmatched";
}

export function searchConversionRepairKey({
  normalizedQuery,
  locale,
  productId,
  planId,
  blockerCode,
}: {
  normalizedQuery: string;
  locale: string;
  productId: string | null;
  planId: string | null;
  blockerCode: SearchConversionBlockerCode;
}) {
  return [
    normalizedQuery,
    locale,
    searchConversionTargetKey({ productId, planId }),
    blockerCode,
  ].join(":");
}

export function findCurrentConversionTerm(
  terms: SearchConversionTerm[],
  repair: {
    normalizedQuery: string;
    locale: string;
    productId: string | null;
    planId: string | null;
  },
) {
  return terms.find((term) => {
    const normalized = normalizeSearchOpportunityQuery(term.query);
    if (normalized !== repair.normalizedQuery || term.locale !== repair.locale) {
      return false;
    }
    if (repair.planId) return term.planId === repair.planId;
    if (repair.productId) {
      return term.productId === repair.productId && !term.planId;
    }
    return !term.productId && !term.planId;
  }) || null;
}

export function classifySearchConversionRepairEffect({
  resultClickDelta,
  planEngagementDelta,
  commercialConversionDelta,
}: {
  resultClickDelta: number;
  planEngagementDelta: number;
  commercialConversionDelta: number;
}): SearchConversionRepairEffect {
  if (commercialConversionDelta > 0) return "converted";
  if (planEngagementDelta > 0) return "engagement_up";
  if (resultClickDelta > 0) return "traffic_only";
  return "waiting";
}

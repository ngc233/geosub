import type { AuthorityProductAudit } from "./search-authority-coverage.ts";

export type AuthorityCoverageGapCode =
  | "missing_price"
  | "stale_price"
  | "tax_gap"
  | "region_gap"
  | "seo_gap"
  | "decision_gap";

export type AuthorityCoverageTaskStatus =
  | "in_progress"
  | "resolved"
  | "ignored";

export type AuthorityCoverageTaskEffect =
  | "waiting"
  | "improving"
  | "resolved"
  | "regressed";

export type AuthorityCoverageBusinessEffect =
  | "waiting"
  | "traffic"
  | "engagement"
  | "converted";

export type AuthorityCoverageBusinessMetrics = {
  resultClicks: number;
  planEngagements: number;
  commercialConversions: number;
};

export type AuthorityCoverageSnapshot = Pick<
  AuthorityProductAudit,
  | "priceCount"
  | "stalePriceCount"
  | "countryCount"
  | "taxGapCount"
  | "completeSeoLocaleCount"
  | "requiredSeoLocaleCount"
  | "score"
> & {
  decisionScore: number;
};

export function isAuthorityCoverageTaskStatus(
  value: string,
): value is AuthorityCoverageTaskStatus {
  return value === "in_progress" || value === "resolved" || value === "ignored";
}

export function authorityCoverageGapValue(
  gapCode: AuthorityCoverageGapCode,
  snapshot: AuthorityCoverageSnapshot,
) {
  switch (gapCode) {
    case "missing_price":
      return snapshot.priceCount;
    case "stale_price":
      return snapshot.stalePriceCount;
    case "tax_gap":
      return snapshot.taxGapCount;
    case "region_gap":
      return snapshot.countryCount;
    case "seo_gap":
      return snapshot.completeSeoLocaleCount;
    case "decision_gap":
      return snapshot.decisionScore;
  }
}

export function authorityCoverageGapResolved(
  gapCode: AuthorityCoverageGapCode,
  snapshot: AuthorityCoverageSnapshot,
) {
  switch (gapCode) {
    case "missing_price":
      return snapshot.priceCount > 0;
    case "stale_price":
      return snapshot.stalePriceCount === 0;
    case "tax_gap":
      return snapshot.taxGapCount === 0;
    case "region_gap":
      return snapshot.countryCount >= 20;
    case "seo_gap":
      return snapshot.completeSeoLocaleCount >= snapshot.requiredSeoLocaleCount;
    case "decision_gap":
      return snapshot.decisionScore >= 15;
  }
}

export function classifyAuthorityCoverageTaskEffect({
  gapCode,
  baseline,
  current,
  taskStatus,
}: {
  gapCode: AuthorityCoverageGapCode;
  baseline: AuthorityCoverageSnapshot;
  current: AuthorityCoverageSnapshot;
  taskStatus: AuthorityCoverageTaskStatus;
}): AuthorityCoverageTaskEffect {
  const resolved = authorityCoverageGapResolved(gapCode, current);
  if (resolved) return "resolved";

  const baselineValue = authorityCoverageGapValue(gapCode, baseline);
  const currentValue = authorityCoverageGapValue(gapCode, current);
  const higherIsBetter = gapCode === "missing_price"
    || gapCode === "region_gap"
    || gapCode === "seo_gap"
    || gapCode === "decision_gap";
  const improved = higherIsBetter
    ? currentValue > baselineValue
    : currentValue < baselineValue;
  if (improved) return "improving";

  if (taskStatus === "resolved") return "regressed";
  return "waiting";
}

export function classifyAuthorityCoverageBusinessEffect({
  resultClicks,
  planEngagements,
  commercialConversions,
}: AuthorityCoverageBusinessMetrics): AuthorityCoverageBusinessEffect {
  if (commercialConversions > 0) return "converted";
  if (planEngagements > 0) return "engagement";
  if (resultClicks > 0) return "traffic";
  return "waiting";
}

import type { getComparablePriceRows } from "./country-hubs.ts";
import { HOMEPAGE_REPRESENTATIVE_PLANS } from "./homepage-representative-plans.ts";

type ComparableRows = ReturnType<typeof getComparablePriceRows>;
export type RepresentativeIssue = {
  productSlug: string;
  planSlug: string;
  reason: "missing-plan" | "missing-us-price" | "insufficient-regions";
  regionCount: number;
};

// Only consume DATA-1's current, convertible monthly iOS rows. This projection
// never removes rows from the canonical collection used by D1/country pages.
export function getHomepageRepresentatives(
  rows: ComparableRows,
  configuration: Readonly<Record<string, string>> = HOMEPAGE_REPRESENTATIVE_PLANS,
) {
  const representatives: { productSlug: string; planSlug: string; usPrice: number; regionCount: number; prices: ComparableRows }[] = [];
  const issues: RepresentativeIssue[] = [];
  for (const [productSlug, planSlug] of Object.entries(configuration)) {
    const prices = rows.filter(row => row.productSlug === productSlug && row.planSlug === planSlug
      && Number.isFinite(row.usd) && row.usd > 0);
    const regionCount = new Set(prices.map(row => row.countryCode)).size;
    const us = prices.find(row => row.countryCode === "US");
    const reason = !prices.length ? "missing-plan" : !us ? "missing-us-price" : regionCount < 10 ? "insufficient-regions" : null;
    if (reason) {
      issues.push({ productSlug, planSlug, reason, regionCount });
      continue;
    }
    representatives.push({ productSlug, planSlug, usPrice: us!.usd, regionCount, prices });
  }
  return { representatives, issues };
}

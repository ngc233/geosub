import type { getComparablePriceRows } from "./country-hubs.ts";
import { HOMEPAGE_REPRESENTATIVE_PLANS } from "./homepage-representative-plans.ts";

// Review aid only; this does not select a live homepage representative plan.
export function getRepresentativePlanCandidates(rows: ReturnType<typeof getComparablePriceRows>, configuration: Readonly<Record<string, string>> = HOMEPAGE_REPRESENTATIVE_PLANS) {
  const groups = new Map<string, { productSlug: string; productName: string; planSlug: string; planName: string; countries: Set<string>; usPrice: number | null }>();
  for (const row of rows) {
    const key = `${row.productSlug}:${row.planSlug}`;
    const group = groups.get(key) ?? { productSlug: row.productSlug, productName: row.productName, planSlug: row.planSlug, planName: row.planName, countries: new Set<string>(), usPrice: null };
    group.countries.add(row.countryCode);
    if (row.countryCode === "US") group.usPrice = row.usd;
    groups.set(key, group);
  }
  const eligible = [...groups.values()].filter(group => group.usPrice !== null && group.countries.size >= 10)
    .sort((a, b) => a.productSlug.localeCompare(b.productSlug) || b.countries.size - a.countries.size || a.planSlug.localeCompare(b.planSlug));
  return eligible.map(({ countries, ...group }) => ({
    ...group, regionCount: countries.size,
    // Coverage orders the review table only; it never selects a replacement.
    recommended: configuration[group.productSlug] === group.planSlug,
  }));
}

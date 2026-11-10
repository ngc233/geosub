import type { getCountryHubRows } from "./country-hubs.ts";
import { homepageCountries } from "./homepage-summary.ts";
import { getChinesePlanDisplayName } from "./pricing-labels.ts";
import { formatPublicDate } from "./public-date.ts";

export type CountryCanvasRow = ReturnType<typeof getCountryHubRows>[number];
export function countrySaving(row: Pick<CountryCanvasRow, "usd" | "usPrice">) {
  return row.usd !== null && Number.isFinite(row.usd) && row.usd > 0
    && row.usPrice !== null && Number.isFinite(row.usPrice) && row.usPrice > 0
    ? 1 - row.usd / row.usPrice : null;
}
/** D8: use the homepage's equal-weight, unrounded median, including negatives.
 * FX-unavailable local rows stay in the table but never enter the summary. */
export function countrySummary(rows: CountryCanvasRow[], code: string) {
  const unique = new Map<string, CountryCanvasRow & { usd: number }>();
  for (const row of rows) {
    if (row.countryCode !== code || row.usd === null || countrySaving(row) === null) continue;
    const key = JSON.stringify([row.productSlug, row.planSlug, row.platform, row.billingCycle]);
    if (!unique.has(key)) unique.set(key, { ...row, usd: row.usd });
  }
  const comparable = [...unique.values()];
  const summary = homepageCountries(comparable).find(country => country.code === code);
  if (!summary) return null;
  return { ...summary, best: Math.max(...comparable.filter(row => row.countryCode === code).map(row => countrySaving(row)!)) };
}
export function countryCanvasRows(rows: CountryCanvasRow[], now = new Date()) {
  return [...rows].sort((a, b) => (countrySaving(b) ?? -Infinity) - (countrySaving(a) ?? -Infinity)
    || a.productName.localeCompare(b.productName) || a.planSlug.localeCompare(b.planSlug)).map(row => ({
      productSlug: row.productSlug, productName: row.productName, planSlug: row.planSlug,
      planName: getChinesePlanDisplayName(row.productName, row.planName), category: row.category,
      amount: row.amount, currency: row.currency, usd: row.usd, usPrice: row.usPrice,
      saving: countrySaving(row), checkedAtText: formatPublicDate(row.checkedAt, now)?.text ?? "",
      fxText: row.fxDate ? formatPublicDate(row.fxDate, now)?.text ?? "" : null,
      sourceUrl: row.sourceUrl, observationId: row.observationId,
    }));
}

import type { ProductPlan, RegionPrice } from "./public-pricing-model.ts";
import type { PlanAffordabilityRow } from "./affordability.ts";

/** V8 removes this explicit exception. Locale and the resolved canonical path
 * are both checked so aliases/query parameters cannot opt a locked page in. */
export function usesPlanCanvas(locale: string, canonicalPath: string) {
  const path = canonicalPath.split(/[?#]/)[0].replace(/\/+$/, "");
  return locale === "zh" && /^\/zh\/(ai-pricing|streaming-pricing)\/[^/]+\/[^/]+$/.test(path)
    && path !== "/zh/ai-pricing/chatgpt/plus";
}

export function planSaving(usd: number, usPrice?: number) {
  return usPrice !== undefined && usPrice > 0 ? 1 - usd / usPrice : null;
}

/** Input is the existing getPricingPagePlan result: never query, invent a US
 * reference, mix platforms, or round before counting/comparing. */
export function planDistribution(plan: ProductPlan) {
  const rows = [...plan.regions].sort((a, b) => a.priceUsd - b.priceUsd || a.code.localeCompare(b.code));
  const us = rows.find(row => row.code === "US");
  const middle = Math.floor(rows.length / 2);
  return { rows, lowest: rows[0], highest: rows.at(-1), us,
    visible: new Set(rows.map(row => row.code)).size >= 5,
    median: rows.length ? rows.length % 2 ? rows[middle].priceUsd : (rows[middle - 1].priceUsd + rows[middle].priceUsd) / 2 : null,
    cheaper: us ? rows.filter(row => row.priceUsd < us.priceUsd).length : null,
    multiple: rows[0]?.priceUsd > 0 ? rows.at(-1)!.priceUsd / rows[0].priceUsd : null };
}

export function filterPlanRegions(rows: RegionPrice[], filter: string, query: string, usPrice?: number) {
  const term = query.trim().toLocaleLowerCase();
  return rows.filter(row => (!term || `${row.country} ${row.code}`.toLocaleLowerCase().includes(term))
    && (filter === "all" || usPrice !== undefined && (filter === "low" ? row.priceUsd < usPrice : row.priceUsd > usPrice)));
}

/** D7: use the table's current nominal USD price, never the affordability
 * view's cached quote. PPP is not comparable to market-FX nominal prices. */
export function planWorkHours(plan: ProductPlan, incomes: PlanAffordabilityRow[]) {
  const counts: Record<string, number> = {};
  for (const row of incomes) counts[row.incomeMetricType ?? "UNKNOWN"] = (counts[row.incomeMetricType ?? "UNKNOWN"] ?? 0) + 1;
  const eligible = plan.billing === "monthly" ? plan.regions.flatMap(price => {
    const income = incomes.find(row => row.countryCode === price.code && ["GNI_ATLAS", "GDP_NOMINAL"].includes(row.incomeMetricType ?? "")
      && Number.isFinite(row.monthlyIncomeUsd) && row.monthlyIncomeUsd > 0 && row.incomeDataYear && row.incomeSource);
    return income ? [{ code: price.code, country: price.country, usd: price.priceUsd, hours: price.priceUsd / (income.monthlyIncomeUsd / 160),
      year: income.incomeDataYear!, source: income.incomeSource!, metric: income.incomeMetricType! }] : [];
  }) : [];
  const unique = [...new Map(eligible.map(row => [row.code, row])).values()];
  const sorted = unique.sort((a, b) => a.hours - b.hours || a.code.localeCompare(b.code));
  const preferred = new Set(["US", planDistribution(plan).lowest?.code]);
  const selected = [...sorted.filter(row => preferred.has(row.code)), ...sorted.filter(row => !preferred.has(row.code))].slice(0, 5)
    .sort((a, b) => a.hours - b.hours || a.code.localeCompare(b.code));
  return { counts, eligibleCount: sorted.length, rows: sorted.length >= 3 ? selected : [] };
}

/** Group attribution only; never alter the selected rows, years or amounts. */
export function planIncomeSources(rows: { source: string; country: string }[]) {
  const groups = new Map<string, string[]>();
  for (const row of rows) groups.set(row.source, [...(groups.get(row.source) ?? []), row.country]);
  return [...groups].map(([source, countries]) => ({ source, countries }));
}

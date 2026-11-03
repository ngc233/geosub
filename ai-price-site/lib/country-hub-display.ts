import type { getCountryHubRows } from "./country-hubs.ts";
import { dateRange } from "./pricing-r2.ts";

export type CountryPlanRow = Pick<ReturnType<typeof getCountryHubRows>[number],
  "productSlug" | "productName" | "category" | "planSlug" | "planName" | "countryCode" |
  "amount" | "currency" | "checkedAt" | "sourceUrl" | "observationId" | "usd" | "fxDate" | "difference">;
export type CountryPlanFilter = "all" | "lower";
export type CountryPlanSort = "original" | "price" | "name";

/** View-only aggregation. Eligibility, FX and differences stay in country-hubs. */
export function countryDisplaySummary(rows: readonly CountryPlanRow[]) {
  const comparable = rows.filter(row => row.difference !== null);
  const cheaper = comparable.filter(row => row.difference! < 0).length;
  return {
    products: new Set(rows.map(row => row.productSlug)).size, plans: rows.length,
    comparable: comparable.length, cheaper,
    collected: dateRange(rows.map(row => row.checkedAt || undefined)),
    fx: dateRange(rows.map(row => row.fxDate || undefined)),
    currencies: [...new Set(rows.map(row => row.currency))].sort(),
    categories: (["ai", "streaming"] as const).map(category => {
      const group = comparable.filter(row => row.category === category);
      const lower = group.filter(row => row.difference! < 0).length;
      return {category, total: rows.filter(row => row.category === category).length,
        comparable: group.length, cheaper: lower, percent: group.length ? Math.round(lower / group.length * 100) : null};
    }),
  };
}

export function filterCountryPlans<T extends CountryPlanRow>(rows: readonly T[], query: string, filter: CountryPlanFilter, sort: CountryPlanSort) {
  const search = query.trim().toLocaleLowerCase();
  const result = rows.filter(row => (filter !== "lower" || (row.difference !== null && row.difference < 0)) &&
    `${row.productName} ${row.planName} ${row.productSlug}`.toLocaleLowerCase().includes(search));
  if (sort === "price") return result.sort((a,b) => (a.usd ?? Infinity) - (b.usd ?? Infinity) || a.productName.localeCompare(b.productName, "zh"));
  if (sort === "name") return result.sort((a,b) => a.productName.localeCompare(b.productName, "zh") || a.planName.localeCompare(b.planName, "zh"));
  // Retain the existing AI / streaming presentation and each group's input order.
  return result.sort((a,b) => Number(a.category === "streaming") - Number(b.category === "streaming"));
}

export function countryMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("zh-CN", {style:"currency",currency,maximumFractionDigits:2}).format(amount);
}

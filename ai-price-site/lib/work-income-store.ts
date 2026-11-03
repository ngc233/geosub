import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "./prisma";
import { getDefaultPlanRegions, type ProductPlan } from "./public-pricing-model";
import { PUBLIC_PRICING_CACHE_TAG, PUBLIC_PRICING_REVALIDATE_SECONDS } from "./public-pricing-cache";
import { qualifyWorkIncome, type WorkIncome } from "./income-work-time";

type IncomeMetric = { country_code: string; year: number; monthly_value_usd: unknown; source: string };

/** Work-time estimates need a nominal USD denominator; PPP income is not USD. */
export async function getPlanWorkIncome(plan: ProductPlan): Promise<WorkIncome[]> {
  if (plan.billing !== "monthly") return [];
  const regions = getDefaultPlanRegions(plan);
  const codes = [...new Set(regions.map(region => region.code))].sort();
  if (!codes.length) return [];
  let metrics: { code: string; year: number; monthlyIncomeUsd: number; source: string }[];
  try { metrics = await unstable_cache(async () => {
    const rows = await prisma.$queryRaw<IncomeMetric[]>`
      SELECT DISTINCT ON (country_code) country_code, year, monthly_value_usd, source
      FROM country_income_metrics
      WHERE country_code = ANY(${codes}::text[])
        AND metric_type = 'GNI_ATLAS' AND indicator_code = 'NY.GNP.PCAP.CD'
      ORDER BY country_code, year DESC
    `;
    return rows.map(row => ({ code: row.country_code, year: row.year, monthlyIncomeUsd: Number(row.monthly_value_usd), source: row.source }));
  }, ["work-income-atlas-v1", ...codes], { revalidate: PUBLIC_PRICING_REVALIDATE_SECONDS, tags: [PUBLIC_PRICING_CACHE_TAG] })(); }
  catch { console.warn("[work-income] Income evidence unavailable; price view remains available."); return []; }
  const rows = regions.flatMap(region => {
    const income = metrics.find(row => row.code === region.code);
    return income
      ? [{ ...income, metric: "GNI_ATLAS", priceUsd: region.priceUsd }] : [];
  });
  return qualifyWorkIncome({ ...plan, regions }, rows);
}

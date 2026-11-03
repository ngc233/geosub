import type { ProductPlan } from "./public-pricing-model.ts";

export const WORK_HOURS_PER_MONTH = 160;
export type WorkIncome = { code: string; priceUsd: number; monthlyIncomeUsd: number; year: number | null; source: string | null; metric: string | null };

export function qualifyWorkIncome(plan: ProductPlan, incomes: WorkIncome[], currentYear = new Date().getUTCFullYear()) {
  const rows = plan.regions.flatMap(region => {
    const income = incomes.find(item => item.code === region.code);
    if (!income?.year || income.year < currentYear - 3 || income.year > currentYear || !income.source || income.metric !== "GNI_ATLAS" || !Number.isFinite(income.monthlyIncomeUsd) || income.monthlyIncomeUsd <= 0 || !Number.isFinite(income.priceUsd) || !Number.isFinite(region.priceUsd) || region.priceUsd <= 0 || Math.abs(income.priceUsd - region.priceUsd) > 0.005) return [];
    return [{ ...income, country: region.country }];
  });
  if (rows.length < Math.min(5, plan.regions.length) || !plan.regions.length || rows.length / plan.regions.length < .8 || !rows.some(row => row.code === "US")) return [];
  const years = rows.map(row => row.year!);
  return Math.max(...years) - Math.min(...years) <= 2 ? rows : [];
}

export function getIncomeWorkRows(plan: ProductPlan, incomes: WorkIncome[]) {
  return qualifyWorkIncome(plan, incomes).flatMap(income => {
    const region = plan.regions.find(row => row.code === income.code)!;
    const hours = region.priceUsd / income.monthlyIncomeUsd * WORK_HOURS_PER_MONTH;
    return Number.isFinite(hours) && hours >= 0 ? [{ ...income, hours }] : [];
  }).sort((a, b) => b.hours - a.hours);
}

export function workHourSquares(hours: number) {
  if (!Number.isFinite(hours) || hours < 0) return { full: 0, partial: 0, truncated: false };
  return { full: Math.min(100, Math.floor(hours)), partial: hours < 100 ? hours % 1 : 0, truncated: hours > 100 };
}

import { prisma } from "./prisma";

export type AffordabilityLevel =
  | "LOW"
  | "MODERATE_LOW"
  | "MODERATE"
  | "HIGH"
  | "VERY_HIGH";

type RawSummaryRow = {
  product_slug: string;
  product_name: string;
  plan_slug: string;
  plan_name: string;
  covered_regions: number | bigint;
  min_income_share_percent: unknown;
  max_income_share_percent: unknown;
  avg_income_share_percent: unknown;
  min_burden_vs_us: unknown;
  max_burden_vs_us: unknown;
  avg_burden_vs_us: unknown;
  lowest_burden_country: string | null;
  highest_burden_country: string | null;
  income_data_year: number | null;
  income_source: string | null;
  income_metric_type: string | null;
  income_indicator_code: string | null;
  income_synced_at: Date | string | null;
  affordability_updated_at: Date | string | null;
};

type RawDetailRow = {
  product_slug: string;
  product_name: string;
  plan_slug: string;
  plan_name: string;
  country_code: string;
  country_iso3: string | null;
  country_name_zh: string | null;
  country_name_en: string | null;
  local_price: unknown;
  currency: string | null;
  price_usd: unknown;
  diff_vs_us_percent: unknown;
  tax_note: string | null;
  availability_note: string | null;
  price_last_checked_at: Date | string | null;
  monthly_income_usd: unknown;
  income_share_percent: unknown;
  us_income_share_percent: unknown;
  burden_vs_us: unknown;
  affordability_level: AffordabilityLevel;
  income_data_year: number | null;
  income_source: string | null;
  income_metric_type: string | null;
  income_indicator_code: string | null;
  income_synced_at: Date | string | null;
};

export type PlanAffordabilitySummary = {
  productSlug: string;
  productName: string;
  planSlug: string;
  planName: string;
  coveredRegions: number;
  minIncomeSharePercent: number;
  maxIncomeSharePercent: number;
  avgIncomeSharePercent: number;
  minBurdenVsUs: number;
  maxBurdenVsUs: number;
  avgBurdenVsUs: number;
  lowestBurdenCountry: string | null;
  highestBurdenCountry: string | null;
  incomeDataYear: number | null;
  incomeSource: string | null;
  incomeMetricType: string | null;
  incomeIndicatorCode: string | null;
  incomeSyncedAt: Date | string | null;
  affordabilityUpdatedAt: Date | string | null;
};

export type PlanAffordabilityRow = {
  productSlug: string;
  productName: string;
  planSlug: string;
  planName: string;
  countryCode: string;
  countryIso3: string | null;
  countryNameZh: string | null;
  countryNameEn: string | null;
  localPrice: number;
  currency: string | null;
  priceUsd: number;
  diffVsUsPercent: number;
  taxNote: string | null;
  availabilityNote: string | null;
  priceLastCheckedAt: Date | string | null;
  monthlyIncomeUsd: number;
  incomeSharePercent: number;
  usIncomeSharePercent: number;
  burdenVsUs: number;
  affordabilityLevel: AffordabilityLevel;
  incomeDataYear: number | null;
  incomeSource: string | null;
  incomeMetricType: string | null;
  incomeIndicatorCode: string | null;
  incomeSyncedAt: Date | string | null;
};

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") return Number(value);

  if (value && typeof value === "object" && "toString" in value) {
    return Number(value.toString());
  }

  return 0;
}

function mapSummary(row: RawSummaryRow): PlanAffordabilitySummary {
  return {
    productSlug: row.product_slug,
    productName: row.product_name,
    planSlug: row.plan_slug,
    planName: row.plan_name,
    coveredRegions: toNumber(row.covered_regions),
    minIncomeSharePercent: toNumber(row.min_income_share_percent),
    maxIncomeSharePercent: toNumber(row.max_income_share_percent),
    avgIncomeSharePercent: toNumber(row.avg_income_share_percent),
    minBurdenVsUs: toNumber(row.min_burden_vs_us),
    maxBurdenVsUs: toNumber(row.max_burden_vs_us),
    avgBurdenVsUs: toNumber(row.avg_burden_vs_us),
    lowestBurdenCountry: row.lowest_burden_country,
    highestBurdenCountry: row.highest_burden_country,
    incomeDataYear: row.income_data_year,
    incomeSource: row.income_source,
    incomeMetricType: row.income_metric_type,
    incomeIndicatorCode: row.income_indicator_code,
    incomeSyncedAt: row.income_synced_at,
    affordabilityUpdatedAt: row.affordability_updated_at,
  };
}

function mapDetail(row: RawDetailRow): PlanAffordabilityRow {
  return {
    productSlug: row.product_slug,
    productName: row.product_name,
    planSlug: row.plan_slug,
    planName: row.plan_name,
    countryCode: row.country_code,
    countryIso3: row.country_iso3,
    countryNameZh: row.country_name_zh,
    countryNameEn: row.country_name_en,
    localPrice: toNumber(row.local_price),
    currency: row.currency,
    priceUsd: toNumber(row.price_usd),
    diffVsUsPercent: toNumber(row.diff_vs_us_percent),
    taxNote: row.tax_note,
    availabilityNote: row.availability_note,
    priceLastCheckedAt: row.price_last_checked_at,
    monthlyIncomeUsd: toNumber(row.monthly_income_usd),
    incomeSharePercent: toNumber(row.income_share_percent),
    usIncomeSharePercent: toNumber(row.us_income_share_percent),
    burdenVsUs: toNumber(row.burden_vs_us),
    affordabilityLevel: row.affordability_level,
    incomeDataYear: row.income_data_year,
    incomeSource: row.income_source,
    incomeMetricType: row.income_metric_type,
    incomeIndicatorCode: row.income_indicator_code,
    incomeSyncedAt: row.income_synced_at,
  };
}

export async function getPlanAffordability(productSlug: string, planSlug: string) {
  const [summaryRows, detailRows] = await Promise.all([
    prisma.$queryRaw<RawSummaryRow[]>`
      SELECT *
      FROM plan_affordability_summary_view
      WHERE product_slug = ${productSlug}
        AND plan_slug = ${planSlug}
      LIMIT 1
    `,
    prisma.$queryRaw<RawDetailRow[]>`
      SELECT *
      FROM plan_affordability_detail_view
      WHERE product_slug = ${productSlug}
        AND plan_slug = ${planSlug}
      ORDER BY income_share_percent DESC
    `,
  ]);

  return {
    summary: summaryRows[0] ? mapSummary(summaryRows[0]) : null,
    rows: detailRows.map(mapDetail),
  };
}
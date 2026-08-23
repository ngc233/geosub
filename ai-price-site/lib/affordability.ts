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
  big_mac_local_price: unknown;
  big_mac_currency: string | null;
  big_mac_price_usd: unknown;
  big_mac_observed_on: Date | string | null;
  big_mac_source_name: string | null;
};

type RawBigMacRow = {
  country_code: string;
  country_iso3: string;
  currency: string;
  local_price: unknown;
  price_usd: unknown;
  observed_on: Date | string;
  source_name: string;
};

type RawCoverageRow = {
  published_regions: number | bigint;
};

export type AffordabilityQualityReason =
  | "no_computed_rows"
  | "missing_summary"
  | "insufficient_coverage"
  | "missing_us_baseline"
  | "invalid_metrics"
  | "stale_income_data"
  | "mixed_income_years";

export type AffordabilityQuality = {
  publishable: boolean;
  reasons: AffordabilityQualityReason[];
  coveredRegions: number;
  publishedRegions: number;
  coverageRatio: number;
  minIncomeYear: number | null;
  maxIncomeYear: number | null;
};

export type BigMacBenchmark = {
  countryCode: string;
  countryIso3: string;
  currency: string;
  localPrice: number;
  priceUsd: number;
  observedOn: Date | string;
  usesRegionalReference: boolean;
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
  bigMacLocalPrice: number | null;
  bigMacCurrency: string | null;
  bigMacPriceUsd: number | null;
  bigMacObservedOn: Date | string | null;
  bigMacUsesRegionalReference: boolean;
  bigMacEquivalent: number | null;
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

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined) return null;
  const number = toNumber(value);
  return Number.isFinite(number) && number > 0 ? number : null;
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
  const bigMacPriceUsd = toNullableNumber(row.big_mac_price_usd);
  const priceUsd = toNumber(row.price_usd);
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
    priceUsd,
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
    bigMacLocalPrice: toNullableNumber(row.big_mac_local_price),
    bigMacCurrency: row.big_mac_currency,
    bigMacPriceUsd,
    bigMacObservedOn: row.big_mac_observed_on,
    bigMacUsesRegionalReference: row.big_mac_source_name?.includes("Euro area") || false,
    bigMacEquivalent: bigMacPriceUsd ? priceUsd / bigMacPriceUsd : null,
  };
}

export function assessAffordabilityQuality({
  rows,
  publishedRegions,
  hasSummary,
  currentYear = new Date().getUTCFullYear(),
}: {
  rows: PlanAffordabilityRow[];
  publishedRegions: number;
  hasSummary: boolean;
  currentYear?: number;
}): AffordabilityQuality {
  const reasons: AffordabilityQualityReason[] = [];
  const incomeYears = rows
    .map((row) => row.incomeDataYear)
    .filter((year): year is number => Number.isInteger(year));
  const minIncomeYear = incomeYears.length > 0 ? Math.min(...incomeYears) : null;
  const maxIncomeYear = incomeYears.length > 0 ? Math.max(...incomeYears) : null;
  const coverageRatio = publishedRegions > 0 ? rows.length / publishedRegions : 0;

  if (rows.length === 0) reasons.push("no_computed_rows");
  if (!hasSummary) reasons.push("missing_summary");
  if (rows.length < Math.min(5, publishedRegions) || coverageRatio < 0.8) {
    reasons.push("insufficient_coverage");
  }
  if (!rows.some((row) => row.countryCode.toUpperCase() === "US")) {
    reasons.push("missing_us_baseline");
  }
  if (rows.some((row) =>
    row.monthlyIncomeUsd <= 0 ||
    row.incomeSharePercent <= 0 ||
    row.usIncomeSharePercent <= 0 ||
    row.burdenVsUs <= 0 ||
    !Number.isFinite(row.burdenVsUs)
  )) {
    reasons.push("invalid_metrics");
  }
  if (maxIncomeYear === null || maxIncomeYear < currentYear - 3) {
    reasons.push("stale_income_data");
  }
  if (
    minIncomeYear !== null &&
    maxIncomeYear !== null &&
    maxIncomeYear - minIncomeYear > 2
  ) {
    reasons.push("mixed_income_years");
  }

  return {
    publishable: reasons.length === 0,
    reasons,
    coveredRegions: rows.length,
    publishedRegions,
    coverageRatio,
    minIncomeYear,
    maxIncomeYear,
  };
}

export async function getPlanAffordability(productSlug: string, planSlug: string) {
  const [summaryRows, detailRows, bigMacRows, coverageRows] = await Promise.all([
    prisma.$queryRaw<RawSummaryRow[]>`
      SELECT *
      FROM plan_affordability_summary_view
      WHERE product_slug = ${productSlug}
        AND plan_slug = ${planSlug}
      LIMIT 1
    `,
    prisma.$queryRaw<RawDetailRow[]>`
      SELECT
        affordability.*,
        big_mac.local_price AS big_mac_local_price,
        big_mac.currency AS big_mac_currency,
        big_mac.price_usd AS big_mac_price_usd,
        big_mac.observed_on AS big_mac_observed_on,
        big_mac.source_name AS big_mac_source_name
      FROM plan_affordability_detail_view affordability
      LEFT JOIN latest_big_mac_prices big_mac
        ON UPPER(big_mac.country_iso3) = UPPER(affordability.country_iso3)
      WHERE affordability.product_slug = ${productSlug}
        AND affordability.plan_slug = ${planSlug}
      ORDER BY affordability.income_share_percent DESC
    `,
    prisma.$queryRaw<RawBigMacRow[]>`
      SELECT
        country_code,
        country_iso3,
        currency,
        local_price,
        price_usd,
        observed_on,
        source_name
      FROM latest_big_mac_prices
      ORDER BY country_code
    `,
    prisma.$queryRaw<RawCoverageRow[]>`
      SELECT COUNT(DISTINCT country.id)::INTEGER AS published_regions
      FROM region_prices price
      JOIN products product ON product.id = price.product_id
      JOIN plans plan ON plan.id = price.plan_id
      JOIN countries country ON country.id = price.country_id
      WHERE product.slug = ${productSlug}
        AND plan.slug = ${planSlug}
        AND price.status = 'published'
        AND price.billing_platform = 'ios'
        AND price.price_usd IS NOT NULL
    `,
  ]);

  const summary = summaryRows[0] ? mapSummary(summaryRows[0]) : null;
  const mappedRows = detailRows.map(mapDetail);
  const quality = assessAffordabilityQuality({
    rows: mappedRows,
    publishedRegions: toNumber(coverageRows[0]?.published_regions || 0),
    hasSummary: Boolean(summary),
  });

  return {
    summary: quality.publishable ? summary : null,
    rows: quality.publishable ? mappedRows : [],
    quality,
    bigMacBenchmarks: bigMacRows.map((row) => ({
      countryCode: row.country_code,
      countryIso3: row.country_iso3,
      currency: row.currency,
      localPrice: toNumber(row.local_price),
      priceUsd: toNumber(row.price_usd),
      observedOn: row.observed_on,
      usesRegionalReference: row.source_name.includes("Euro area"),
    })),
  };
}

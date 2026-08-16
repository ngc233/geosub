#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import pg from "pg";
import {
  countryPagePilots,
  isCountryPagePilotIndexApproved,
} from "../lib/country-page-pilot.ts";
import {
  evaluateCountryPageReadiness,
  type CountryPageExchangeEvidence,
  type CountryPagePriceEvidence,
  type CountryPageSearchEvidence,
  type CountryPageTaxEvidence,
} from "../lib/country-page-readiness.ts";
import {
  getEffectiveSeoSearchPageObservations,
  parseSeoSearchPageImportState,
  SEO_SEARCH_PAGE_IMPORT_SETTING_KEY,
} from "../lib/seo-search-observation-import.ts";
import {
  canonicalizeObservedSearchPath,
  seoSearchPerformanceBaseline,
  type SeoSearchPageObservation,
} from "../lib/seo-search-performance-baseline.ts";

const { Client } = pg;
const DEFAULT_STATEMENT_TIMEOUT_MS = 15_000;

type ReportOptions = {
  json: boolean;
  strict: boolean;
  now: Date;
  statementTimeoutMs: number;
};

type EvidenceRow = {
  product_slug: string;
  country_code: string;
  plan_slug: string;
  plan_name: string;
  billing_cycle: string;
  local_price: string;
  currency: string;
  billing_platform: string;
  price_type: string;
  confidence_score: number;
  data_quality: string;
  last_checked_at: Date | string | null;
  source_url: string | null;
  observation_status: string | null;
  observation_confidence_score: number | null;
  anomaly_flag: boolean | null;
  tax_confidence: string | null;
  tax_review_status: string | null;
  tax_source_kind: string | null;
  fx_rate: string | null;
  fx_source: string | null;
  fx_rate_date: Date | string | null;
  fx_fetched_at: Date | string | null;
};

const PILOT_EVIDENCE_QUERY = `
SELECT
  product.slug AS product_slug,
  country.code AS country_code,
  plan.slug AS plan_slug,
  plan.name AS plan_name,
  plan.billing_cycle::text AS billing_cycle,
  price.local_price::text AS local_price,
  price.currency,
  price.billing_platform::text AS billing_platform,
  price.price_type::text AS price_type,
  price.confidence_score,
  price.data_quality::text AS data_quality,
  price.last_checked_at,
  latest_observation.source_url,
  latest_observation.status AS observation_status,
  latest_observation.confidence_score AS observation_confidence_score,
  latest_observation.anomaly_flag,
  tax.confidence AS tax_confidence,
  tax.review_status AS tax_review_status,
  tax.source_kind AS tax_source_kind,
  rate.rate::text AS fx_rate,
  rate.source AS fx_source,
  rate.rate_date AS fx_rate_date,
  rate.fetched_at AS fx_fetched_at
FROM region_prices price
JOIN products product ON product.id = price.product_id
JOIN plans plan ON plan.id = price.plan_id
JOIN countries country ON country.id = price.country_id
LEFT JOIN country_tax_profiles tax
  ON tax.country_id = country.id
  AND tax.status = 'active'
LEFT JOIN LATERAL (
  SELECT
    observation.source_url,
    observation.status::text AS status,
    observation.confidence_score,
    observation.anomaly_flag
  FROM price_observations observation
  WHERE observation.product_id = price.product_id
    AND observation.plan_id = price.plan_id
    AND observation.country_id = price.country_id
    AND observation.billing_platform = price.billing_platform
    AND observation.price_type = price.price_type
    AND (
      observation.status = 'approved'
      OR (
        observation.status = 'ignored'
        AND observation.raw_payload ->> 'auto_review_reason_code'
          = 'superseded_by_published_price'
      )
    )
  ORDER BY observation.observed_at DESC, observation.created_at DESC
  LIMIT 1
) latest_observation ON TRUE
LEFT JOIN LATERAL (
  SELECT exchange.rate, exchange.source, exchange.rate_date, exchange.fetched_at
  FROM exchange_rates exchange
  WHERE exchange.base_currency = 'USD'
    AND exchange.quote_currency = price.currency
    AND exchange.status = 'active'
  ORDER BY exchange.rate_date DESC, exchange.fetched_at DESC
  LIMIT 1
) rate ON TRUE
WHERE product.slug = ANY($1::text[])
  AND country.code = ANY($2::text[])
  AND product.status = 'published'::publish_status
  AND plan.status = 'published'::publish_status
  AND price.status = 'published'::publish_status
  AND plan.billing_cycle = 'monthly'::billing_cycle
  AND price.billing_platform = 'ios'::billing_platform
  AND price.price_type = 'list_price'::price_type
ORDER BY product.slug, country.code, plan.sort_order, plan.slug;
`;

function loadEnvironment(rootDir = process.cwd()) {
  for (const fileName of [".env.local", ".env"]) {
    const filePath = path.join(rootDir, fileName);
    if (fs.existsSync(filePath)) {
      dotenv.config({ path: filePath, override: false, quiet: true });
    }
  }
}

function parseInteger(value: string, label: string, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${label} must be an integer between ${min} and ${max}.`);
  }
  return parsed;
}

export function parseCountryPageReadinessArguments(argv: string[]): ReportOptions {
  const options: ReportOptions = {
    json: false,
    strict: false,
    now: new Date(),
    statementTimeoutMs: DEFAULT_STATEMENT_TIMEOUT_MS,
  };

  for (const argument of argv) {
    if (argument === "--json") options.json = true;
    else if (argument === "--strict") options.strict = true;
    else if (argument.startsWith("--now=")) {
      const parsed = new Date(argument.slice(6));
      if (Number.isNaN(parsed.getTime())) throw new Error("now must be an ISO date-time.");
      options.now = parsed;
    } else if (argument.startsWith("--timeout-ms=")) {
      options.statementTimeoutMs = parseInteger(
        argument.slice(13),
        "timeout-ms",
        1_000,
        120_000,
      );
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return options;
}

function pairKey(productSlug: string, countryCode: string) {
  return `${productSlug}:${countryCode}`;
}

function productSearchEvidence(
  observations: SeoSearchPageObservation[],
  productSlug: string,
  category: "ai" | "streaming",
): CountryPageSearchEvidence {
  const categoryPath = category === "streaming" ? "streaming-pricing" : "ai-pricing";
  const prefixes = ["zh", "en"].map(
    (locale) => `/${locale}/${categoryPath}/${productSlug}`,
  );
  const matches = observations.filter((observation) => {
    const observedPath = canonicalizeObservedSearchPath(observation.path);
    return prefixes.some(
      (prefix) => observedPath === prefix || observedPath.startsWith(`${prefix}/`),
    );
  });
  const latestPeriodEnd = matches
    .map((observation) => observation.periodEnd)
    .sort()
    .at(-1) || null;
  return {
    clicks: matches.reduce((sum, observation) => sum + observation.clicks, 0),
    impressions: matches.reduce(
      (sum, observation) => sum + observation.impressions,
      0,
    ),
    latestPeriodEnd,
    engines: [...new Set(matches.map((observation) => observation.engine))].sort(),
  };
}

function toPriceEvidence(row: EvidenceRow): CountryPagePriceEvidence {
  return {
    planSlug: row.plan_slug,
    planName: row.plan_name,
    localPrice: Number(row.local_price),
    currency: row.currency,
    billingCycle: row.billing_cycle,
    billingPlatform: row.billing_platform,
    priceType: row.price_type,
    confidenceScore: Number(row.confidence_score),
    dataQuality: row.data_quality,
    lastCheckedAt: row.last_checked_at,
    sourceUrl: row.source_url,
    observationStatus: row.observation_status,
    observationConfidenceScore: row.observation_confidence_score === null
      ? null
      : Number(row.observation_confidence_score),
    anomalyFlag: row.anomaly_flag,
  };
}

function toExchangeEvidence(row: EvidenceRow | undefined): CountryPageExchangeEvidence | null {
  if (!row?.fx_rate) return null;
  return {
    rate: Number(row.fx_rate),
    source: row.fx_source,
    rateDate: row.fx_rate_date,
    fetchedAt: row.fx_fetched_at,
  };
}

function toTaxEvidence(row: EvidenceRow | undefined): CountryPageTaxEvidence | null {
  if (!row?.tax_confidence) return null;
  return {
    confidence: row.tax_confidence,
    reviewStatus: row.tax_review_status,
    sourceKind: row.tax_source_kind,
  };
}

function maskDatabaseTarget(value: string) {
  try {
    const url = new URL(value);
    return `${url.hostname}:${url.port || "5432"}/${url.pathname.replace(/^\//, "") || "postgres"}`;
  } catch {
    return "invalid DATABASE_URL";
  }
}

function printReport(report: Awaited<ReturnType<typeof buildReport>>, database: string) {
  console.log("GeoSub country-page pilot release gate");
  console.log(`Database: ${database}`);
  console.log("Mode: read-only; sitemap and robots unchanged");
  console.log(`Generated: ${report.generatedAt}`);
  console.log(`Ready ${report.summary.ready}/${report.summary.total}; blocked ${report.summary.blocked}`);
  console.log(
    `Index approved ${report.summary.indexApproved}; approved ready ${report.summary.indexApprovedReady}; approved blocked ${report.summary.indexApprovedBlocked}`,
  );
  console.log("");

  for (const result of report.results) {
    const demand = result.searchEvidence.impressions > 0
      ? `${result.searchEvidence.impressions} impressions / ${result.searchEvidence.clicks} clicks (${result.searchEvidence.engines.join("+")})`
      : "no observed product search exposure";
    console.log(
      `[${result.status.toUpperCase()}${result.indexApproved ? "/INDEX APPROVED" : "/PREVIEW"}] ${result.key}; ${result.planCount} plans; ${demand}`,
    );
    console.log(
      `  evidence: prices since ${result.evidence.oldestPriceCheckedAt || "missing"}; exact sources ${result.evidence.exactSourceCount}/${result.planCount}; FX ${result.evidence.exchangeRateFetchedAt || "missing"}; tax ${result.evidence.taxConfidence || "missing"}/${result.evidence.taxReviewStatus || "missing"}`,
    );
    if (result.blockers.length > 0) {
      console.log(`  blockers: ${result.blockers.join(", ")}`);
    }
    if (result.warnings.length > 0) {
      console.log(`  warnings: ${result.warnings.join(", ")}`);
    }
  }
  console.log("");
  console.log("No data was written. Blocked preview pages remain noindex and outside sitemap.");
}

async function buildReport(client: InstanceType<typeof Client>, options: ReportOptions) {
  const productSlugs = [...new Set(countryPagePilots.map((pilot) => pilot.productSlug))];
  const countryCodes = [...new Set(countryPagePilots.map((pilot) => pilot.countryCode))];
  const [evidenceResult, settingResult] = await Promise.all([
    client.query<EvidenceRow>(PILOT_EVIDENCE_QUERY, [productSlugs, countryCodes]),
    client.query<{ value_text: string | null }>(
      "SELECT value_text FROM site_settings WHERE setting_key = $1 LIMIT 1",
      [SEO_SEARCH_PAGE_IMPORT_SETTING_KEY],
    ),
  ]);
  const importedState = parseSeoSearchPageImportState(
    settingResult.rows[0]?.value_text,
  );
  const observations = getEffectiveSeoSearchPageObservations({
    baseline: seoSearchPerformanceBaseline,
    state: importedState,
  });
  const rowsByPilot = new Map<string, EvidenceRow[]>();
  for (const row of evidenceResult.rows) {
    const key = pairKey(row.product_slug, row.country_code);
    rowsByPilot.set(key, [...(rowsByPilot.get(key) || []), row]);
  }

  const results = countryPagePilots.map((pilot) => {
    const rows = rowsByPilot.get(pairKey(pilot.productSlug, pilot.countryCode)) || [];
    return {
      ...evaluateCountryPageReadiness({
      pilot,
      prices: rows.map(toPriceEvidence),
      exchangeRate: toExchangeEvidence(rows[0]),
      taxProfile: toTaxEvidence(rows[0]),
      searchEvidence: productSearchEvidence(
        observations,
        pilot.productSlug,
        pilot.category,
      ),
      now: options.now,
      }),
      indexApproved: isCountryPagePilotIndexApproved(pilot),
    };
  });
  return {
    generatedAt: options.now.toISOString(),
    readOnly: true,
    summary: {
      total: results.length,
      ready: results.filter((result) => result.status === "ready").length,
      blocked: results.filter((result) => result.status === "blocked").length,
      indexApproved: results.filter((result) => result.indexApproved).length,
      indexApprovedReady: results.filter(
        (result) => result.indexApproved && result.status === "ready",
      ).length,
      indexApprovedBlocked: results.filter(
        (result) => result.indexApproved && result.status === "blocked",
      ).length,
    },
    results,
  };
}

async function main() {
  loadEnvironment();
  const options = parseCountryPageReadinessArguments(process.argv.slice(2));
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is missing.");
  const client = new Client({
    connectionString: databaseUrl,
    application_name: "geosub-country-page-pilot-readiness",
    connectionTimeoutMillis: 5_000,
  });
  let transactionStarted = false;
  try {
    await client.connect();
    await client.query("BEGIN TRANSACTION READ ONLY");
    transactionStarted = true;
    await client.query(`SET LOCAL statement_timeout = '${options.statementTimeoutMs}ms'`);
    const report = await buildReport(client, options);
    if (options.json) console.log(JSON.stringify(report, null, 2));
    else printReport(report, maskDatabaseTarget(databaseUrl));
    if (options.strict && report.summary.indexApprovedBlocked > 0) {
      process.exitCode = 2;
    }
  } finally {
    if (transactionStarted) await client.query("ROLLBACK").catch(() => undefined);
    await client.end().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(`Country-page release gate failed: ${error.message}`);
  process.exitCode = 1;
});

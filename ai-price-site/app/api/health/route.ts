import { NextResponse } from "next/server";
import { checkAppHealth } from "../../../lib/app-health";
import { prisma } from "../../../lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HEALTH_SNAPSHOT_TTL_MS = 5_000;

type BusinessDataSnapshot = {
  publishedProducts: number;
  publishedPrices: number;
  activeExchangeRates: number;
};

type FreshnessSnapshot = {
  lastSuccessfulCollectionAt: Date | null;
  pricesNotCheckedOver3Days: number | null;
};

let cachedBusinessData: { expiresAt: number; value: BusinessDataSnapshot } | null = null;
let inFlightBusinessData: Promise<BusinessDataSnapshot> | null = null;

let cachedFreshness: { expiresAt: number; value: FreshnessSnapshot } | null = null;
let inFlightFreshness: Promise<FreshnessSnapshot> | null = null;

async function getCachedBusinessData(): Promise<BusinessDataSnapshot> {
  const now = Date.now();
  if (cachedBusinessData && cachedBusinessData.expiresAt > now) {
    return cachedBusinessData.value;
  }
  if (inFlightBusinessData) {
    return inFlightBusinessData;
  }
  inFlightBusinessData = (async () => {
    const [row] = await prisma.$queryRaw<Array<{
      published_products: number;
      published_prices: number;
      active_exchange_rates: number;
    }>>`
      SELECT
        (SELECT COUNT(*)::int FROM products WHERE status = 'published'::publish_status) AS published_products,
        (SELECT COUNT(*)::int FROM region_prices WHERE status = 'published'::publish_status) AS published_prices,
        (SELECT COUNT(*)::int FROM exchange_rates WHERE status = 'active') AS active_exchange_rates
    `;
    const value: BusinessDataSnapshot = {
      publishedProducts: Number(row?.published_products || 0),
      publishedPrices: Number(row?.published_prices || 0),
      activeExchangeRates: Number(row?.active_exchange_rates || 0),
    };
    cachedBusinessData = { expiresAt: Date.now() + HEALTH_SNAPSHOT_TTL_MS, value };
    return value;
  })().finally(() => {
    inFlightBusinessData = null;
  });
  return inFlightBusinessData;
}

async function getCachedFreshness(): Promise<FreshnessSnapshot> {
  const now = Date.now();
  if (cachedFreshness && cachedFreshness.expiresAt > now) {
    return cachedFreshness.value;
  }
  if (inFlightFreshness) {
    return inFlightFreshness;
  }
  inFlightFreshness = (async () => {
    const [row] = await prisma.$queryRaw<Array<{
      last_successful_collection_at: Date | null;
      prices_not_checked_over_3_days: number;
    }>>`
      SELECT
        (SELECT MAX(finished_at) FROM collector_job_runs
         WHERE status = 'succeeded') AS last_successful_collection_at,
        (SELECT COUNT(*)::int FROM region_prices
         WHERE status = 'published'::publish_status
           AND (last_checked_at IS NULL OR last_checked_at < NOW() - INTERVAL '72 hours'))
          AS prices_not_checked_over_3_days
    `;
    const value: FreshnessSnapshot = {
      lastSuccessfulCollectionAt: row?.last_successful_collection_at ?? null,
      pricesNotCheckedOver3Days: row?.prices_not_checked_over_3_days ?? null,
    };
    cachedFreshness = { expiresAt: Date.now() + HEALTH_SNAPSHOT_TTL_MS, value };
    return value;
  })().finally(() => {
    inFlightFreshness = null;
  });
  return inFlightFreshness;
}

function response(payload: Awaited<ReturnType<typeof checkAppHealth>>["payload"], status: number) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}

export async function GET() {
  const startedAt = performance.now();
  const result = await checkAppHealth({
    build: {
      version: process.env.GEOSUB_HEALTH_BUILD_VERSION,
      commit: process.env.GEOSUB_HEALTH_BUILD_COMMIT,
    },
    pingDatabase: () => prisma.$queryRaw`SELECT 1 AS ok`,
    inspectBusinessData: getCachedBusinessData,
    inspectFreshness: getCachedFreshness,
    duration: () => performance.now() - startedAt,
  });

  return response(result.payload, result.httpStatus);
}

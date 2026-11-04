import { NextResponse } from "next/server";
import { checkAppHealth } from "../../../lib/app-health";
import { prisma } from "../../../lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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
    inspectBusinessData: async () => {
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

      return {
        publishedProducts: Number(row?.published_products || 0),
        publishedPrices: Number(row?.published_prices || 0),
        activeExchangeRates: Number(row?.active_exchange_rates || 0),
      };
    },
    inspectFreshness: async () => {
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
      return {
        lastSuccessfulCollectionAt: row?.last_successful_collection_at ?? null,
        pricesNotCheckedOver3Days: row?.prices_not_checked_over_3_days ?? null,
      };
    },
    duration: () => performance.now() - startedAt,
  });

  return response(result.payload, result.httpStatus);
}

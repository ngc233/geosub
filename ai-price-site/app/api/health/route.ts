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
    duration: () => performance.now() - startedAt,
  });

  return response(result.payload, result.httpStatus);
}

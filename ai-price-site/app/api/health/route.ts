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
    duration: () => performance.now() - startedAt,
  });

  return response(result.payload, result.httpStatus);
}

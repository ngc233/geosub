import type { NextRequest } from "next/server";

const PUBLIC_PRICING_SHARED_CACHE_SECONDS = 5 * 60;
const PUBLIC_PRICING_STALE_WHILE_REVALIDATE_SECONDS = 10 * 60;

const publicPricingPathPattern =
  /^\/(?:zh|zh-tw|en|ja|ko|es|tr|ar|fr|it|de|pt)\/(?:ai-pricing|streaming-pricing)(?:\/[^/]+(?:\/[^/]+)?)?\/?$/;

export const PUBLIC_PRICING_SHARED_CACHE_CONTROL = [
  "public",
  "max-age=0",
  `s-maxage=${PUBLIC_PRICING_SHARED_CACHE_SECONDS}`,
  `stale-while-revalidate=${PUBLIC_PRICING_STALE_WHILE_REVALIDATE_SECONDS}`,
].join(", ");

export function shouldCachePublicPricingResponse(request: NextRequest) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return false;
  }

  if (request.nextUrl.search) {
    return false;
  }

  return publicPricingPathPattern.test(request.nextUrl.pathname);
}

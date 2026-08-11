import { NextResponse, type NextRequest } from "next/server";
import { buildContentSecurityPolicy } from "./lib/content-security-policy";
import { getLegacyPricingPlanRedirectPath } from "./lib/pricing-routes";
import {
  PUBLIC_PRICING_SHARED_CACHE_CONTROL,
  shouldCachePublicPricingResponse,
} from "./lib/public-response-cache";
import { getSiteLocaleFromPath } from "./lib/site-locale";

export function proxy(request: NextRequest) {
  const legacyPlanRedirectPath = getLegacyPricingPlanRedirectPath(
    request.nextUrl.pathname,
    request.nextUrl.searchParams.get("plan"),
  );

  if (legacyPlanRedirectPath) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = legacyPlanRedirectPath;
    redirectUrl.searchParams.delete("plan");
    return NextResponse.redirect(redirectUrl, 308);
  }

  const requestHeaders = new Headers(request.headers);
  const nonce = crypto.randomUUID().replaceAll("-", "");
  const contentSecurityPolicy = buildContentSecurityPolicy(nonce, {
    isDevelopment: process.env.NODE_ENV !== "production",
  });

  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);
  requestHeaders.set(
    "x-geosub-locale",
    getSiteLocaleFromPath(request.nextUrl.pathname),
  );
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set(
    "Content-Security-Policy-Report-Only",
    contentSecurityPolicy,
  );

  if (shouldCachePublicPricingResponse(request)) {
    response.headers.set(
      "Cache-Control",
      PUBLIC_PRICING_SHARED_CACHE_CONTROL,
    );
    response.headers.set(
      "CDN-Cache-Control",
      PUBLIC_PRICING_SHARED_CACHE_CONTROL,
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api).*)",
  ],
};

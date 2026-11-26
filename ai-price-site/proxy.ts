import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_SESSION_COOKIE_NAME,
  applyAdminResponseHeaders,
  isAdminRoutePath,
  shouldRedirectUnauthenticatedAdminNavigation,
} from "./lib/admin-proxy-policy";
import { buildContentSecurityPolicy } from "./lib/content-security-policy";
import { getLegacyPricingPlanRedirectPath } from "./lib/pricing-routes";
import {
  PUBLIC_PRICING_SHARED_CACHE_CONTROL,
  shouldCachePublicPricingResponse,
} from "./lib/public-response-cache";
import { getSiteLocaleFromPath } from "./lib/site-locale";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (
    shouldRedirectUnauthenticatedAdminNavigation({
      pathname,
      method: request.method,
      accept: request.headers.get("accept"),
      hasSessionCookie: Boolean(
        request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value,
      ),
    })
  ) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin-login";
    loginUrl.search = "";
    const redirectResponse = NextResponse.redirect(loginUrl, 307);
    applyAdminResponseHeaders(redirectResponse.headers);
    return redirectResponse;
  }

  const legacyPlanRedirectPath = getLegacyPricingPlanRedirectPath(
    pathname,
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
    getSiteLocaleFromPath(pathname),
  );
  requestHeaders.set("x-pathname", pathname);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set(
    "Content-Security-Policy-Report-Only",
    contentSecurityPolicy,
  );

  if (isAdminRoutePath(pathname)) {
    applyAdminResponseHeaders(response.headers);
  } else if (shouldCachePublicPricingResponse(request)) {
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

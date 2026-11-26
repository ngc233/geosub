import { NextResponse, type NextRequest } from "next/server";
import {
  applyAdminResponseHeaders,
  evaluateAdminHostRouting,
  hasAnyAdminSessionCookie,
  isAdminRoutePath,
  normalizeRequestHost,
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
  const hostDecision = evaluateAdminHostRouting({
    host: normalizeRequestHost(request.headers, request.nextUrl.host),
    pathname,
    search: request.nextUrl.search,
  });

  if (hostDecision.action === "not_found") {
    const notFoundResponse = new NextResponse("Not Found", { status: 404 });
    applyAdminResponseHeaders(notFoundResponse.headers);
    return notFoundResponse;
  }

  if (hostDecision.action === "redirect") {
    const redirectTarget = hostDecision.location.startsWith("/")
      ? (() => {
          const nextUrl = request.nextUrl.clone();
          nextUrl.pathname = hostDecision.location;
          nextUrl.search = "";
          return nextUrl;
        })()
      : hostDecision.location;
    const redirectResponse = NextResponse.redirect(
      redirectTarget,
      hostDecision.status,
    );
    applyAdminResponseHeaders(redirectResponse.headers);
    return redirectResponse;
  }

  if (
    shouldRedirectUnauthenticatedAdminNavigation({
      pathname,
      method: request.method,
      accept: request.headers.get("accept"),
      hasSessionCookie: hasAnyAdminSessionCookie(request.cookies),
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

  if (isAdminRoutePath(pathname) || hostDecision.isDedicatedAdminHost) {
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

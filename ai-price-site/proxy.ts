import { NextResponse, type NextRequest } from "next/server";
import { getSiteLocaleFromPath } from "./lib/site-locale";

export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(
    "x-geosub-locale",
    getSiteLocaleFromPath(request.nextUrl.pathname),
  );
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|api).*)",
  ],
};

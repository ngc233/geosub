import { NextResponse, type NextRequest } from "next/server";

function detectLocale(pathname: string) {
  if (pathname === "/en" || pathname.startsWith("/en/")) {
    return "en";
  }

  return "zh";
}

export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-geosub-locale", detectLocale(request.nextUrl.pathname));

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
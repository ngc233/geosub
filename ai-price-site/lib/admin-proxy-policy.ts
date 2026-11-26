export const ADMIN_SESSION_COOKIE_NAME = "geosub_admin_session";
export const ADMIN_NO_STORE_CACHE_CONTROL = "private, no-store, max-age=0";
export const ADMIN_ROBOTS_TAG = "noindex, nofollow, noarchive";

const ADMIN_JSON_ENDPOINTS = new Set([
  "/admin/review/collection-runs",
]);

export function isAdminProtectedPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export function isAdminRoutePath(pathname: string): boolean {
  return (
    isAdminProtectedPath(pathname) ||
    pathname === "/admin-login" ||
    pathname.startsWith("/admin-login/")
  );
}

export function shouldRedirectUnauthenticatedAdminNavigation({
  pathname,
  method,
  accept,
  hasSessionCookie,
}: {
  pathname: string;
  method: string;
  accept: string | null;
  hasSessionCookie: boolean;
}): boolean {
  if (!isAdminProtectedPath(pathname) || hasSessionCookie) {
    return false;
  }

  const normalizedMethod = method.toUpperCase();
  if (normalizedMethod !== "GET" && normalizedMethod !== "HEAD") {
    return false;
  }

  if (ADMIN_JSON_ENDPOINTS.has(pathname)) {
    return false;
  }

  const normalizedAccept = (accept || "").toLowerCase();
  if (normalizedAccept.includes("application/json")) {
    return false;
  }

  return true;
}

export function applyAdminResponseHeaders(headers: Headers): void {
  headers.set("Cache-Control", ADMIN_NO_STORE_CACHE_CONTROL);
  headers.set("Pragma", "no-cache");
  headers.set("X-Robots-Tag", ADMIN_ROBOTS_TAG);

  const existingVary = headers.get("Vary");
  if (!existingVary) {
    headers.set("Vary", "Cookie");
    return;
  }

  const varyTokens = existingVary
    .split(",")
    .map((token) => token.trim())
    .filter(Boolean);

  if (!varyTokens.some((token) => token.toLowerCase() === "cookie")) {
    headers.set("Vary", [...varyTokens, "Cookie"].join(", "));
  }
}

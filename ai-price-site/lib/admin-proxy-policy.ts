export const ADMIN_SESSION_COOKIE_NAME = "geosub_admin_session";
export const ADMIN_HOST_SESSION_COOKIE_NAME = "__Host-geosub_admin_session";
export const ADMIN_TRUSTED_DEVICE_COOKIE_NAME = "geosub_admin_device";
export const ADMIN_HOST_TRUSTED_DEVICE_COOKIE_NAME = "__Host-geosub_admin_device";
export const ADMIN_NO_STORE_CACHE_CONTROL = "private, no-store, max-age=0";
export const ADMIN_ROBOTS_TAG = "noindex, nofollow, noarchive";

export type AdminPolicyEnv = Record<string, string | undefined>;
export type AdminLegacyHostAction = "not_found" | "redirect";

export type AdminHostPolicy = {
  adminHost: string;
  enforceDedicatedHost: boolean;
  legacyHostAction: AdminLegacyHostAction;
  useHostLockedCookies: boolean;
};

export type AdminCookieNames = {
  writeName: string;
  readNames: readonly [string, string];
  hostLocked: boolean;
};

export type AdminHostRoutingDecision =
  | { action: "allow"; isDedicatedAdminHost: boolean }
  | { action: "not_found"; isDedicatedAdminHost: boolean }
  | {
      action: "redirect";
      status: 307 | 308;
      location: string;
      isDedicatedAdminHost: boolean;
    };

const ADMIN_JSON_ENDPOINTS = new Set([
  "/admin/review/collection-runs",
]);

export function normalizeHostValue(raw: string | null | undefined): string {
  if (!raw) return "";
  let value = raw.trim().toLowerCase();
  if (!value) return "";

  value = value.replace(/^https?:\/\//, "");
  const slashIndex = value.indexOf("/");
  if (slashIndex >= 0) {
    value = value.slice(0, slashIndex);
  }
  value = value.replace(/:(?:80|443)$/, "");
  return value;
}

export function normalizeRequestHost(
  headers: Pick<Headers, "get">,
  fallbackHost?: string | null,
): string {
  const forwardedHost = headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const host = forwardedHost || headers.get("host")?.trim() || fallbackHost || "";
  return normalizeHostValue(host);
}

function getDefaultPolicyEnv(): AdminPolicyEnv {
  return typeof process !== "undefined" && process.env ? process.env : {};
}

export function getAdminHostPolicy(
  env: AdminPolicyEnv = getDefaultPolicyEnv(),
): AdminHostPolicy {
  const adminHost = normalizeHostValue(env.GEOSUB_ADMIN_HOST);
  const enforceDedicatedHost =
    Boolean(adminHost) && env.GEOSUB_ADMIN_ENFORCE_DEDICATED_HOST === "true";
  const legacyHostAction: AdminLegacyHostAction =
    env.GEOSUB_ADMIN_LEGACY_HOST_ACTION === "redirect"
      ? "redirect"
      : "not_found";
  const useHostLockedCookies = env.GEOSUB_ADMIN_HOST_COOKIES === "true";

  return {
    adminHost,
    enforceDedicatedHost,
    legacyHostAction,
    useHostLockedCookies,
  };
}

export function getAdminSessionCookieNames(
  env: AdminPolicyEnv = getDefaultPolicyEnv(),
): AdminCookieNames {
  const { useHostLockedCookies } = getAdminHostPolicy(env);
  if (useHostLockedCookies) {
    return {
      writeName: ADMIN_HOST_SESSION_COOKIE_NAME,
      readNames: [ADMIN_HOST_SESSION_COOKIE_NAME, ADMIN_SESSION_COOKIE_NAME],
      hostLocked: true,
    };
  }
  return {
    writeName: ADMIN_SESSION_COOKIE_NAME,
    readNames: [ADMIN_SESSION_COOKIE_NAME, ADMIN_HOST_SESSION_COOKIE_NAME],
    hostLocked: false,
  };
}

export function getAdminTrustedDeviceCookieNames(
  env: AdminPolicyEnv = getDefaultPolicyEnv(),
): AdminCookieNames {
  const { useHostLockedCookies } = getAdminHostPolicy(env);
  if (useHostLockedCookies) {
    return {
      writeName: ADMIN_HOST_TRUSTED_DEVICE_COOKIE_NAME,
      readNames: [
        ADMIN_HOST_TRUSTED_DEVICE_COOKIE_NAME,
        ADMIN_TRUSTED_DEVICE_COOKIE_NAME,
      ],
      hostLocked: true,
    };
  }
  return {
    writeName: ADMIN_TRUSTED_DEVICE_COOKIE_NAME,
    readNames: [
      ADMIN_TRUSTED_DEVICE_COOKIE_NAME,
      ADMIN_HOST_TRUSTED_DEVICE_COOKIE_NAME,
    ],
    hostLocked: false,
  };
}

export function hasAnyAdminSessionCookie(
  cookieStore: { get(name: string): { value?: string } | undefined },
  env: AdminPolicyEnv = getDefaultPolicyEnv(),
): boolean {
  const { readNames } = getAdminSessionCookieNames(env);
  return readNames.some((name) => Boolean(cookieStore.get(name)?.value));
}

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

export function evaluateAdminHostRouting({
  host,
  pathname,
  search = "",
  env = getDefaultPolicyEnv(),
}: {
  host: string;
  pathname: string;
  search?: string;
  env?: AdminPolicyEnv;
}): AdminHostRoutingDecision {
  const policy = getAdminHostPolicy(env);
  if (!policy.adminHost) {
    return { action: "allow", isDedicatedAdminHost: false };
  }

  const normalizedHost = normalizeHostValue(host);
  const isDedicatedAdminHost =
    Boolean(normalizedHost) && normalizedHost === policy.adminHost;

  if (isDedicatedAdminHost) {
    if (pathname === "/") {
      return {
        action: "redirect",
        status: 307,
        location: "/admin",
        isDedicatedAdminHost: true,
      };
    }

    if (isAdminRoutePath(pathname)) {
      return { action: "allow", isDedicatedAdminHost: true };
    }

    return { action: "not_found", isDedicatedAdminHost: true };
  }

  if (policy.enforceDedicatedHost && isAdminRoutePath(pathname)) {
    if (policy.legacyHostAction === "redirect") {
      return {
        action: "redirect",
        status: 308,
        location: `https://${policy.adminHost}${pathname}${search}`,
        isDedicatedAdminHost: false,
      };
    }

    return { action: "not_found", isDedicatedAdminHost: false };
  }

  return { action: "allow", isDedicatedAdminHost: false };
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

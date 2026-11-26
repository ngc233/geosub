import "server-only";

import { randomUUID } from "node:crypto";
import { getCurrentAdmin } from "./admin-auth";
import { canAdmin, type AdminCapability } from "./admin-permissions";
import {
  applyAdminResponseHeaders,
  getAdminHostPolicy,
  normalizeRequestHost,
  type AdminPolicyEnv,
} from "./admin-proxy-policy";

type AdminUserRecord = NonNullable<Awaited<ReturnType<typeof getCurrentAdmin>>>;

export type AdminRouteGuardResult =
  | { ok: true; admin: AdminUserRecord }
  | { ok: false; response: Response };

export type AdminOriginCheckResult =
  | { ok: true }
  | { ok: false; reason: string };

function createAdminNoStoreHeaders(extra?: Record<string, string>) {
  const headers = new Headers(extra);
  applyAdminResponseHeaders(headers);
  return headers;
}

export function adminRouteJson(
  body: unknown,
  init?: { status?: number; headers?: Record<string, string> },
) {
  return Response.json(body, {
    status: init?.status ?? 200,
    headers: createAdminNoStoreHeaders(init?.headers),
  });
}

export function adminRouteRedirect(location: string, status = 303) {
  return new Response(null, {
    status,
    headers: createAdminNoStoreHeaders({ Location: location }),
  });
}

export function requestWantsJson(request: Pick<Request, "headers">): boolean {
  const accept = request.headers?.get("accept")?.toLowerCase() ?? "";
  const requestedWith =
    request.headers?.get("x-requested-with")?.toLowerCase() ?? "";
  const secFetchMode =
    request.headers?.get("sec-fetch-mode")?.toLowerCase() ?? "";

  return (
    accept.includes("application/json") ||
    requestedWith === "xmlhttprequest" ||
    (secFetchMode === "cors" && !accept.includes("text/html"))
  );
}

function parseOrigin(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.toLowerCase() === "null") return null;

  try {
    return new URL(trimmed).origin.toLowerCase();
  } catch {
    return null;
  }
}

export function getExpectedAdminOrigin(
  request: Pick<Request, "headers" | "url">,
): string | null {
  const forwardedHost = request.headers
    ?.get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const host = forwardedHost || request.headers?.get("host")?.trim() || "";

  let fallbackProto = "https";
  let urlOrigin: string | null = null;

  if (request.url) {
    try {
      const parsed = new URL(request.url);
      urlOrigin = parsed.origin.toLowerCase();
      fallbackProto = parsed.protocol.replace(/:$/, "");
    } catch {
      urlOrigin = null;
    }
  }

  if (host) {
    const rawProto = request.headers
      ?.get("x-forwarded-proto")
      ?.split(",")[0]
      ?.trim()
      .toLowerCase();
    const proto =
      rawProto === "http" || rawProto === "https" ? rawProto : fallbackProto;

    return parseOrigin(`${proto}://${host}`);
  }

  return urlOrigin;
}

export function verifyAdminMutationOrigin(
  request: Pick<Request, "headers" | "url">,
  env?: AdminPolicyEnv,
): AdminOriginCheckResult {
  const hostPolicy = getAdminHostPolicy(env);
  if (hostPolicy.enforceDedicatedHost) {
    let urlHost = "";
    if (request.url) {
      try {
        urlHost = new URL(request.url).host;
      } catch {
        urlHost = "";
      }
    }
    const requestHost = normalizeRequestHost(request.headers, urlHost);
    if (!requestHost || requestHost !== hostPolicy.adminHost) {
      return { ok: false, reason: "non-admin-host" };
    }
  }

  const secFetchSite =
    request.headers?.get("sec-fetch-site")?.trim().toLowerCase() ?? "";
  if (secFetchSite === "cross-site") {
    return { ok: false, reason: "cross-site" };
  }

  const expectedOrigin = getExpectedAdminOrigin(request);
  if (!expectedOrigin) {
    return { ok: false, reason: "missing-expected-origin" };
  }

  const rawOrigin = request.headers?.get("origin");
  if (rawOrigin !== null && rawOrigin !== undefined) {
    const origin = parseOrigin(rawOrigin);
    if (!origin) {
      return { ok: false, reason: "invalid-origin" };
    }
    return origin === expectedOrigin
      ? { ok: true }
      : { ok: false, reason: "origin-mismatch" };
  }

  const rawReferer = request.headers?.get("referer");
  if (rawReferer !== null && rawReferer !== undefined) {
    const refererOrigin = parseOrigin(rawReferer);
    if (!refererOrigin) {
      return { ok: false, reason: "invalid-referer" };
    }
    return refererOrigin === expectedOrigin
      ? { ok: true }
      : { ok: false, reason: "referer-mismatch" };
  }

  if (secFetchSite === "same-origin") {
    return { ok: true };
  }

  return { ok: false, reason: "missing-origin" };
}

export function logAdminRouteError(
  route: string,
  error: unknown,
  context?: { actorId?: string | null; target?: string | null },
): string {
  const requestId = randomUUID();
  const isErrorLike =
    error instanceof Error ||
    (Boolean(error) &&
      typeof error === "object" &&
      "message" in (error as Record<string, unknown>));
  const errorName = isErrorLike
    ? String((error as { name?: unknown }).name || "Error")
    : typeof error;
  const rawMessage = isErrorLike
    ? String((error as { message?: unknown }).message ?? "")
    : String(error ?? "");
  const errorMessage = rawMessage
    .replace(/[\r\n\t]+/g, " ")
    .trim()
    .slice(0, 240);

  console.error(
    JSON.stringify({
      event: "admin_route_error",
      route,
      requestId,
      actorId: context?.actorId ?? null,
      target: context?.target ?? null,
      errorName,
      errorMessage,
    }),
  );

  return requestId;
}

export async function guardAdminRoute(
  request: Request,
  options: {
    capability?: AdminCapability;
    verifyOrigin?: boolean;
    forceJson?: boolean;
    forbiddenMessage?: string;
    routeName?: string;
  } = {},
): Promise<AdminRouteGuardResult> {
  const capability = options.capability ?? "read";
  const wantsJson = Boolean(options.forceJson) || requestWantsJson(request);

  if (options.verifyOrigin) {
    const originCheck = verifyAdminMutationOrigin(request);
    if (!originCheck.ok) {
      const requestId = randomUUID();
      console.warn(
        JSON.stringify({
          event: "admin_route_origin_rejected",
          route: options.routeName ?? "unknown",
          requestId,
          reason: originCheck.reason,
        }),
      );
      return {
        ok: false,
        response: adminRouteJson(
          {
            ok: false,
            code: "INVALID_ORIGIN",
            message: "请求来源校验未通过，请刷新后台页面后重试。",
            requestId,
          },
          { status: 403 },
        ),
      };
    }
  }

  const admin = await getCurrentAdmin();
  if (!admin) {
    if (wantsJson) {
      return {
        ok: false,
        response: adminRouteJson(
          {
            ok: false,
            code: "UNAUTHENTICATED",
            message: "登录状态已失效，请重新登录后台。",
          },
          { status: 401 },
        ),
      };
    }

    return {
      ok: false,
      response: adminRouteRedirect("/admin-login", 303),
    };
  }

  if (!canAdmin(admin.role, capability)) {
    return {
      ok: false,
      response: adminRouteJson(
        {
          ok: false,
          code: "FORBIDDEN",
          message:
            options.forbiddenMessage ??
            "当前账号没有此操作权限。请联系站点负责人。",
        },
        { status: 403 },
      ),
    };
  }

  return { ok: true, admin };
}

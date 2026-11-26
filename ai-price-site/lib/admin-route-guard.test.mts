import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import { canAdmin } from "./admin-permissions.ts";
import * as proxyPolicy from "./admin-proxy-policy.ts";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadGuardModule({
  admin = null as { id: string; role: string } | null,
  logs = [] as string[],
} = {}) {
  const code = ts.transpileModule(
    readFileSync(new URL("./admin-route-guard.ts", import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;

  const mod = {
    exports: {} as {
      verifyAdminMutationOrigin: (
        req: Pick<Request, "headers" | "url">,
        env?: Record<string, string | undefined>,
      ) => { ok: true } | { ok: false; reason: string };
      guardAdminRoute: (
        req: Request,
        options?: {
          capability?: "read" | "draft" | "manage" | "account";
          verifyOrigin?: boolean;
          forceJson?: boolean;
          forbiddenMessage?: string;
          routeName?: string;
        },
      ) => Promise<
        | { ok: true; admin: { id: string; role: string } }
        | { ok: false; response: Response }
      >;
      logAdminRouteError: (
        route: string,
        error: unknown,
        context?: { actorId?: string | null; target?: string | null },
      ) => string;
    },
  };

  const sandboxConsole = {
    warn: (message: string) => logs.push(message),
    error: (message: string) => logs.push(message),
  };

  new Function("require", "module", "exports", "console", code)(
    (name: string) => {
      if (name === "server-only") return {};
      if (name === "./admin-auth") return { getCurrentAdmin: async () => admin };
      if (name === "./admin-permissions") return { canAdmin };
      if (name === "./admin-proxy-policy") return proxyPolicy;
      return require(name);
    },
    mod,
    mod.exports,
    sandboxConsole,
  );

  return mod.exports;
}

test("verifyAdminMutationOrigin accepts same-origin and forwarded-host requests and blocks cross-site POST", () => {
  const { verifyAdminMutationOrigin } = loadGuardModule();

  assert.deepEqual(
    verifyAdminMutationOrigin(
      new Request("https://geosub.org/admin/review/collect", {
        method: "POST",
        headers: {
          host: "geosub.org",
          origin: "https://geosub.org",
          "sec-fetch-site": "same-origin",
        },
      }),
    ),
    { ok: true },
  );

  assert.deepEqual(
    verifyAdminMutationOrigin(
      new Request("http://127.0.0.1:3000/admin/logout", {
        method: "POST",
        headers: {
          "x-forwarded-host": "geosub.org",
          "x-forwarded-proto": "https",
          origin: "https://geosub.org",
        },
      }),
    ),
    { ok: true },
  );

  assert.deepEqual(
    verifyAdminMutationOrigin(
      new Request("https://geosub.org/admin/logout", {
        method: "POST",
        headers: {
          host: "geosub.org",
          referer: "https://geosub.org/admin/products",
        },
      }),
    ),
    { ok: true },
  );

  assert.deepEqual(
    verifyAdminMutationOrigin(
      new Request("https://geosub.org/admin/review/collect", {
        method: "POST",
        headers: {
          host: "geosub.org",
          origin: "https://evil.example",
        },
      }),
    ),
    { ok: false, reason: "origin-mismatch" },
  );

  assert.deepEqual(
    verifyAdminMutationOrigin(
      new Request("https://geosub.org/admin/review/collect", {
        method: "POST",
        headers: {
          host: "geosub.org",
          origin: "https://geosub.org",
          "sec-fetch-site": "cross-site",
        },
      }),
    ),
    { ok: false, reason: "cross-site" },
  );

  assert.deepEqual(
    verifyAdminMutationOrigin(
      new Request("https://geosub.org/admin/logout", {
        method: "POST",
        headers: {
          host: "geosub.org",
          origin: "null",
        },
      }),
    ),
    { ok: false, reason: "invalid-origin" },
  );

  assert.deepEqual(
    verifyAdminMutationOrigin(
      new Request("https://geosub.org/admin/logout", {
        method: "POST",
        headers: {
          host: "geosub.org",
        },
      }),
    ),
    { ok: false, reason: "missing-origin" },
  );
});

test("guardAdminRoute returns 401 JSON for unauthenticated JSON clients and 303 redirect for browser navigation", async () => {
  const { guardAdminRoute } = loadGuardModule({ admin: null });

  const jsonResult = await guardAdminRoute(
    new Request("https://geosub.org/admin/review/collect", {
      method: "POST",
      headers: {
        host: "geosub.org",
        origin: "https://geosub.org",
        accept: "application/json",
      },
    }),
    { capability: "manage", verifyOrigin: true },
  );

  assert.equal(jsonResult.ok, false);
  assert.equal(jsonResult.response.status, 401);
  assert.match(jsonResult.response.headers.get("cache-control") || "", /no-store/);
  assert.equal((await jsonResult.response.json()).code, "UNAUTHENTICATED");

  const browserResult = await guardAdminRoute(
    new Request("https://geosub.org/admin/events/export", {
      method: "GET",
      headers: { accept: "text/html" },
    }),
    { capability: "read" },
  );

  assert.equal(browserResult.ok, false);
  assert.equal(browserResult.response.status, 303);
  assert.equal(browserResult.response.headers.get("location"), "/admin-login");
});

test("guardAdminRoute blocks cross-origin POST before authentication and logs warning", async () => {
  const logs: string[] = [];
  const { guardAdminRoute } = loadGuardModule({
    admin: { id: "owner-1", role: "OWNER" },
    logs,
  });

  const result = await guardAdminRoute(
    new Request("https://geosub.org/admin/pipeline/collect", {
      method: "POST",
      headers: {
        host: "geosub.org",
        origin: "https://attacker.example",
        accept: "application/json",
      },
    }),
    { capability: "manage", verifyOrigin: true, routeName: "/admin/pipeline/collect" },
  );

  assert.equal(result.ok, false);
  assert.equal(result.response.status, 403);
  const body = (await result.response.json()) as { code: string; requestId: string };
  assert.equal(body.code, "INVALID_ORIGIN");
  assert.ok(body.requestId);
  assert.equal(logs.length, 1);
  assert.match(logs[0], /admin_route_origin_rejected/);
});

test("logAdminRouteError logs structured single-line JSON with requestId and sanitized message", () => {
  const logs: string[] = [];
  const { logAdminRouteError } = loadGuardModule({ logs });

  const requestId = logAdminRouteError(
    "/admin/review/collect",
    new Error("Queue failed\nwith extra line"),
    { actorId: "admin-1", target: "chatgpt" },
  );

  assert.match(requestId, /^[0-9a-f-]{36}$/i);
  assert.equal(logs.length, 1);
  const parsed = JSON.parse(logs[0]) as Record<string, unknown>;
  assert.equal(parsed.event, "admin_route_error");
  assert.equal(parsed.route, "/admin/review/collect");
  assert.equal(parsed.requestId, requestId);
  assert.equal(parsed.actorId, "admin-1");
  assert.equal(parsed.target, "chatgpt");
  assert.equal(parsed.errorMessage, "Queue failed with extra line");
});

test("logout route rejects cross-site POST before clearing session", async () => {
  let cleared = false;
  const guardExports = loadGuardModule();
  const logoutCode = ts.transpileModule(
    readFileSync(new URL("../app/admin/logout/route.ts", import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;

  const mod = { exports: {} as { POST: (req: Request) => Promise<Response> } };
  vm.runInNewContext("(function(require,module,exports){" + logoutCode + "\n})", {
    Response,
    Headers,
    URL,
  })(
    (name: string) => {
      if (name.endsWith("admin-auth")) {
        return {
          clearAdminSession: async () => {
            cleared = true;
          },
        };
      }
      if (name.endsWith("admin-route-guard")) return guardExports;
      return require(name);
    },
    mod,
    mod.exports,
  );

  const blocked = await mod.exports.POST(
    new Request("https://geosub.org/admin/logout", {
      method: "POST",
      headers: { host: "geosub.org", origin: "https://evil.example" },
    }),
  );
  assert.equal(blocked.status, 403);
  assert.equal(cleared, false);

  const allowed = await mod.exports.POST(
    new Request("https://geosub.org/admin/logout", {
      method: "POST",
      headers: { host: "geosub.org", origin: "https://geosub.org" },
    }),
  );
  assert.equal(allowed.status, 303);
  assert.equal(allowed.headers.get("location"), "/admin-login");
  assert.equal(cleared, true);
});

test("verifyAdminMutationOrigin enforces dedicated admin host when enabled", () => {
  const { verifyAdminMutationOrigin } = loadGuardModule();
  const enforcedEnv = {
    GEOSUB_ADMIN_HOST: "admin.geosub.org",
    GEOSUB_ADMIN_ENFORCE_DEDICATED_HOST: "true",
  };

  assert.deepEqual(
    verifyAdminMutationOrigin(
      new Request("https://geosub.org/admin/review/collect", {
        method: "POST",
        headers: {
          host: "geosub.org",
          origin: "https://geosub.org",
        },
      }),
      enforcedEnv,
    ),
    { ok: false, reason: "non-admin-host" },
  );

  assert.deepEqual(
    verifyAdminMutationOrigin(
      new Request("http://127.0.0.1:3000/admin/review/collect", {
        method: "POST",
        headers: {
          "x-forwarded-host": "admin.geosub.org",
          "x-forwarded-proto": "https",
          origin: "https://admin.geosub.org",
        },
      }),
      enforcedEnv,
    ),
    { ok: true },
  );
});

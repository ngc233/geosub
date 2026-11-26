import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import {
  ADMIN_NO_STORE_CACHE_CONTROL,
  ADMIN_ROBOTS_TAG,
  ADMIN_SESSION_COOKIE_NAME,
  applyAdminResponseHeaders,
  isAdminProtectedPath,
  isAdminRoutePath,
  shouldRedirectUnauthenticatedAdminNavigation,
} from "./admin-proxy-policy.ts";
import { canAdmin } from "./admin-permissions.ts";

const require = createRequire(import.meta.url);
const ts = require("typescript");

test("admin proxy policy identifies admin routes without matching public paths", () => {
  assert.equal(isAdminRoutePath("/admin"), true);
  assert.equal(isAdminRoutePath("/admin/products"), true);
  assert.equal(isAdminRoutePath("/admin-login"), true);
  assert.equal(isAdminRoutePath("/admin-login/reset"), true);
  assert.equal(isAdminRoutePath("/zh/ai-pricing"), false);
  assert.equal(isAdminRoutePath("/administrators"), false);

  assert.equal(isAdminProtectedPath("/admin"), true);
  assert.equal(isAdminProtectedPath("/admin/review"), true);
  assert.equal(isAdminProtectedPath("/admin-login"), false);
});

test("unauthenticated admin page navigations redirect early while JSON and POST routes pass through", () => {
  assert.equal(
    shouldRedirectUnauthenticatedAdminNavigation({
      pathname: "/admin",
      method: "GET",
      accept: "text/html,application/xhtml+xml",
      hasSessionCookie: false,
    }),
    true,
  );
  assert.equal(
    shouldRedirectUnauthenticatedAdminNavigation({
      pathname: "/admin/products",
      method: "HEAD",
      accept: null,
      hasSessionCookie: false,
    }),
    true,
  );
  assert.equal(
    shouldRedirectUnauthenticatedAdminNavigation({
      pathname: "/admin/products",
      method: "GET",
      accept: "text/html",
      hasSessionCookie: true,
    }),
    false,
  );
  assert.equal(
    shouldRedirectUnauthenticatedAdminNavigation({
      pathname: "/admin-login",
      method: "GET",
      accept: "text/html",
      hasSessionCookie: false,
    }),
    false,
  );
  assert.equal(
    shouldRedirectUnauthenticatedAdminNavigation({
      pathname: "/admin/review/collect",
      method: "POST",
      accept: "text/html",
      hasSessionCookie: false,
    }),
    false,
  );
  assert.equal(
    shouldRedirectUnauthenticatedAdminNavigation({
      pathname: "/admin/review/collection-runs",
      method: "GET",
      accept: "*/*",
      hasSessionCookie: false,
    }),
    false,
  );
  assert.equal(
    shouldRedirectUnauthenticatedAdminNavigation({
      pathname: "/admin/events/export",
      method: "GET",
      accept: "application/json",
      hasSessionCookie: false,
    }),
    false,
  );
});

test("admin response headers enforce private no-store, noindex, and Cookie vary without duplicates", () => {
  const headers = new Headers({ Vary: "Accept-Encoding" });
  applyAdminResponseHeaders(headers);

  assert.equal(headers.get("Cache-Control"), ADMIN_NO_STORE_CACHE_CONTROL);
  assert.equal(headers.get("Pragma"), "no-cache");
  assert.equal(headers.get("X-Robots-Tag"), ADMIN_ROBOTS_TAG);
  assert.equal(headers.get("Vary"), "Accept-Encoding, Cookie");

  applyAdminResponseHeaders(headers);
  assert.equal(headers.get("Vary"), "Accept-Encoding, Cookie");
});

test("admin proxy session cookie name matches admin-auth.ts", () => {
  const authSource = readFileSync(new URL("./admin-auth.ts", import.meta.url), "utf8");
  assert.match(authSource, new RegExp(`COOKIE_NAME = "${ADMIN_SESSION_COOKIE_NAME}"`));
});

test("getCurrentAdmin deduplicates database lookups via react.cache within a request", async () => {
  let findUniqueCalls = 0;
  let cachedPromise: Promise<unknown> | null = null;
  const authCode = ts.transpileModule(
    readFileSync(new URL("./admin-auth.ts", import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;

  const mod = {
    exports: {} as {
      getCurrentAdmin: () => Promise<{ id: string; role: string } | null>;
    },
  };
  const mocks: Record<string, unknown> = {
    "server-only": {},
    "@prisma/client": {},
    react: {
      cache: <T extends () => Promise<unknown>>(fn: T) => {
        return () => {
          if (!cachedPromise) {
            cachedPromise = fn();
          }
          return cachedPromise;
        };
      },
    },
    "./admin-permissions": { canAdmin },
    "./admin-proxy-policy": { ADMIN_SESSION_COOKIE_NAME },
    "next/headers": {
      cookies: async () => ({
        get: (name: string) =>
          name === ADMIN_SESSION_COOKIE_NAME
            ? { value: "valid-session-token" }
            : undefined,
      }),
    },
    "next/navigation": {
      redirect: (url: string) => {
        throw new Error(`redirect:${url}`);
      },
    },
    "./prisma": {
      prisma: {
        adminSession: {
          findUnique: async () => {
            findUniqueCalls += 1;
            return {
              id: "session-1",
              expiresAt: new Date(Date.now() + 60_000),
              user: { id: "admin-1", status: "ACTIVE", role: "OWNER" },
            };
          },
        },
      },
    },
  };

  vm.runInNewContext("(function(require,module,exports){" + authCode + "\n})")(
    (name: string) => (name in mocks ? mocks[name] : require(name)),
    mod,
    mod.exports,
  );

  const [first, second] = await Promise.all([
    mod.exports.getCurrentAdmin(),
    mod.exports.getCurrentAdmin(),
  ]);

  assert.equal(findUniqueCalls, 1);
  assert.deepEqual(first, { id: "admin-1", status: "ACTIVE", role: "OWNER" });
  assert.strictEqual(first, second);
});

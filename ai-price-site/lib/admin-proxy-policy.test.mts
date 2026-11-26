import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import {
  ADMIN_HOST_SESSION_COOKIE_NAME,
  ADMIN_HOST_TRUSTED_DEVICE_COOKIE_NAME,
  ADMIN_NO_STORE_CACHE_CONTROL,
  ADMIN_ROBOTS_TAG,
  ADMIN_SESSION_COOKIE_NAME,
  ADMIN_TRUSTED_DEVICE_COOKIE_NAME,
  applyAdminResponseHeaders,
  evaluateAdminHostRouting,
  getAdminHostPolicy,
  getAdminSessionCookieNames,
  getAdminTrustedDeviceCookieNames,
  hasAnyAdminSessionCookie,
  isAdminProtectedPath,
  isAdminRoutePath,
  normalizeRequestHost,
  shouldRedirectUnauthenticatedAdminNavigation,
} from "./admin-proxy-policy.ts";
import * as proxyPolicy from "./admin-proxy-policy.ts";
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
    "./admin-proxy-policy": proxyPolicy,
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

test("dedicated admin host routing is disabled by default for backwards compatibility", () => {
  const emptyEnv = {};
  assert.deepEqual(getAdminHostPolicy(emptyEnv), {
    adminHost: "",
    enforceDedicatedHost: false,
    legacyHostAction: "not_found",
    useHostLockedCookies: false,
  });

  assert.deepEqual(
    evaluateAdminHostRouting({
      host: "geosub.org",
      pathname: "/admin/products",
      env: emptyEnv,
    }),
    { action: "allow", isDedicatedAdminHost: false },
  );
  assert.deepEqual(
    evaluateAdminHostRouting({
      host: "geosub.org",
      pathname: "/zh/ai-pricing",
      env: emptyEnv,
    }),
    { action: "allow", isDedicatedAdminHost: false },
  );
});

test("dedicated admin host routes root to /admin, allows admin paths, and blocks public routes", () => {
  const env = {
    GEOSUB_ADMIN_HOST: "https://Admin.GeoSub.org:443/",
    GEOSUB_ADMIN_ENFORCE_DEDICATED_HOST: "false",
  };

  assert.deepEqual(
    evaluateAdminHostRouting({ host: "admin.geosub.org", pathname: "/", env }),
    {
      action: "redirect",
      status: 307,
      location: "/admin",
      isDedicatedAdminHost: true,
    },
  );
  assert.deepEqual(
    evaluateAdminHostRouting({
      host: "admin.geosub.org",
      pathname: "/admin/review",
      env,
    }),
    { action: "allow", isDedicatedAdminHost: true },
  );
  assert.deepEqual(
    evaluateAdminHostRouting({
      host: "admin.geosub.org",
      pathname: "/admin-login",
      env,
    }),
    { action: "allow", isDedicatedAdminHost: true },
  );
  assert.deepEqual(
    evaluateAdminHostRouting({
      host: "admin.geosub.org",
      pathname: "/zh/ai-pricing",
      env,
    }),
    { action: "not_found", isDedicatedAdminHost: true },
  );

  // Dual-host transition: public host still serves /admin until enforcement is enabled.
  assert.deepEqual(
    evaluateAdminHostRouting({
      host: "geosub.org",
      pathname: "/admin/review",
      env,
    }),
    { action: "allow", isDedicatedAdminHost: false },
  );
});

test("enforced dedicated admin host hides or redirects legacy /admin paths on the public host", () => {
  const hideEnv = {
    GEOSUB_ADMIN_HOST: "admin.geosub.org",
    GEOSUB_ADMIN_ENFORCE_DEDICATED_HOST: "true",
  };

  assert.deepEqual(
    evaluateAdminHostRouting({
      host: "geosub.org",
      pathname: "/admin/settings",
      env: hideEnv,
    }),
    { action: "not_found", isDedicatedAdminHost: false },
  );
  assert.deepEqual(
    evaluateAdminHostRouting({
      host: "geosub.org",
      pathname: "/admin-login",
      env: hideEnv,
    }),
    { action: "not_found", isDedicatedAdminHost: false },
  );
  assert.deepEqual(
    evaluateAdminHostRouting({
      host: "geosub.org",
      pathname: "/zh/ai-pricing",
      env: hideEnv,
    }),
    { action: "allow", isDedicatedAdminHost: false },
  );

  const redirectEnv = {
    GEOSUB_ADMIN_HOST: "admin.geosub.org",
    GEOSUB_ADMIN_ENFORCE_DEDICATED_HOST: "true",
    GEOSUB_ADMIN_LEGACY_HOST_ACTION: "redirect",
  };
  assert.deepEqual(
    evaluateAdminHostRouting({
      host: "geosub.org",
      pathname: "/admin/review",
      search: "?status=pending",
      env: redirectEnv,
    }),
    {
      action: "redirect",
      status: 308,
      location: "https://admin.geosub.org/admin/review?status=pending",
      isDedicatedAdminHost: false,
    },
  );
});

test("__Host- cookie isolation keeps dual-read cutover compatibility and normalizes forwarded hosts", () => {
  const defaultSession = getAdminSessionCookieNames({});
  assert.equal(defaultSession.writeName, ADMIN_SESSION_COOKIE_NAME);
  assert.equal(defaultSession.hostLocked, false);
  assert.deepEqual(defaultSession.readNames, [
    ADMIN_SESSION_COOKIE_NAME,
    ADMIN_HOST_SESSION_COOKIE_NAME,
  ]);

  const lockedEnv = { GEOSUB_ADMIN_HOST_COOKIES: "true" };
  const lockedSession = getAdminSessionCookieNames(lockedEnv);
  assert.equal(lockedSession.writeName, ADMIN_HOST_SESSION_COOKIE_NAME);
  assert.equal(lockedSession.hostLocked, true);
  assert.deepEqual(lockedSession.readNames, [
    ADMIN_HOST_SESSION_COOKIE_NAME,
    ADMIN_SESSION_COOKIE_NAME,
  ]);

  const lockedDevice = getAdminTrustedDeviceCookieNames(lockedEnv);
  assert.equal(lockedDevice.writeName, ADMIN_HOST_TRUSTED_DEVICE_COOKIE_NAME);
  assert.deepEqual(lockedDevice.readNames, [
    ADMIN_HOST_TRUSTED_DEVICE_COOKIE_NAME,
    ADMIN_TRUSTED_DEVICE_COOKIE_NAME,
  ]);

  assert.equal(
    hasAnyAdminSessionCookie(
      { get: (name) => (name === ADMIN_HOST_SESSION_COOKIE_NAME ? { value: "tok" } : undefined) },
      {},
    ),
    true,
  );
  assert.equal(
    hasAnyAdminSessionCookie(
      { get: (name) => (name === ADMIN_SESSION_COOKIE_NAME ? { value: "tok" } : undefined) },
      lockedEnv,
    ),
    true,
  );
  assert.equal(
    hasAnyAdminSessionCookie({ get: () => undefined }, lockedEnv),
    false,
  );

  assert.equal(
    normalizeRequestHost(
      new Headers({ "x-forwarded-host": "Admin.GeoSub.org:443, internal:3000" }),
    ),
    "admin.geosub.org",
  );
});

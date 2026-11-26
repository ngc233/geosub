import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { canAdmin } from "./admin-permissions.ts";
import * as proxyPolicy from "./admin-proxy-policy.ts";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

type StoredSession = {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
};

type StoredDevice = {
  id: string;
  userId: string;
  tokenHash: string;
  failureCount: number;
  expiresAt: Date;
};

function loadAdminAuthForSessions({
  sessions,
  devices = [],
  cookieMap = {},
}: {
  sessions: StoredSession[];
  devices?: StoredDevice[];
  cookieMap?: Record<string, string>;
}) {
  const authCode = ts.transpileModule(
    readFileSync(new URL("./admin-auth.ts", import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;

  const sessionRows = [...sessions];
  const deviceRows = [...devices];

  const prismaMock = {
    adminSession: {
      findMany: async ({
        where,
      }: {
        where: { userId?: string; expiresAt?: { gt?: Date } };
      }) =>
        sessionRows
          .filter((row) => {
            if (where.userId && row.userId !== where.userId) return false;
            if (where.expiresAt?.gt && row.expiresAt <= where.expiresAt.gt) {
              return false;
            }
            return true;
          })
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
      findFirst: async ({
        where,
      }: {
        where: {
          id?: string;
          userId?: string;
          tokenHash?: string;
          expiresAt?: { gt?: Date };
        };
      }) =>
        sessionRows.find((row) => {
          if (where.id && row.id !== where.id) return false;
          if (where.userId && row.userId !== where.userId) return false;
          if (where.tokenHash && row.tokenHash !== where.tokenHash) return false;
          if (where.expiresAt?.gt && row.expiresAt <= where.expiresAt.gt) {
            return false;
          }
          return true;
        }) ?? null,
      deleteMany: async ({
        where,
      }: {
        where: {
          id?: string | { not?: string };
          userId?: string;
        };
      }) => {
        let removed = 0;
        for (let i = sessionRows.length - 1; i >= 0; i -= 1) {
          const row = sessionRows[i];
          if (where.userId && row.userId !== where.userId) continue;
          if (typeof where.id === "string" && row.id !== where.id) continue;
          if (
            where.id &&
            typeof where.id === "object" &&
            where.id.not &&
            row.id === where.id.not
          ) {
            continue;
          }
          sessionRows.splice(i, 1);
          removed += 1;
        }
        return { count: removed };
      },
    },
    adminTrustedDevice: {
      count: async ({
        where,
      }: {
        where: {
          userId?: string;
          expiresAt?: { gt?: Date };
          failureCount?: { lt?: number };
        };
      }) =>
        deviceRows.filter((row) => {
          if (where.userId && row.userId !== where.userId) return false;
          if (where.expiresAt?.gt && row.expiresAt <= where.expiresAt.gt) {
            return false;
          }
          if (
            where.failureCount?.lt !== undefined &&
            row.failureCount >= where.failureCount.lt
          ) {
            return false;
          }
          return true;
        }).length,
      deleteMany: async ({
        where,
      }: {
        where: {
          userId?: string;
          tokenHash?: { not?: string };
        };
      }) => {
        let removed = 0;
        for (let i = deviceRows.length - 1; i >= 0; i -= 1) {
          const row = deviceRows[i];
          if (where.userId && row.userId !== where.userId) continue;
          if (where.tokenHash?.not && row.tokenHash === where.tokenHash.not) {
            continue;
          }
          deviceRows.splice(i, 1);
          removed += 1;
        }
        return { count: removed };
      },
    },
  };

  const mod = {
    exports: {} as {
      getCurrentAdminSessions: (userId: string) => Promise<{
        sessions: Array<Record<string, unknown>>;
        trustedDeviceCount: number;
        maxActiveSessions: number;
      }>;
      revokeAdminSessionById: (args: {
        userId: string;
        sessionId: string;
      }) => Promise<
        | { ok: true; revokedSessionId: string }
        | { ok: false; reason: "not_found" | "current_session" }
      >;
      revokeOtherAdminSessions: (args: { userId: string }) => Promise<
        | { ok: true; revokedSessions: number; revokedTrustedDevices: number }
        | { ok: false; reason: "missing_current_session" }
      >;
    },
  };

  const mocks: Record<string, unknown> = {
    "server-only": {},
    "@prisma/client": {},
    "./admin-permissions": { canAdmin },
    "./admin-proxy-policy": proxyPolicy,
    "next/headers": {
      cookies: async () => ({
        get: (name: string) =>
          name in cookieMap ? { value: cookieMap[name] } : undefined,
      }),
    },
    "next/navigation": {
      redirect: (url: string) => {
        throw new Error(`redirect:${url}`);
      },
    },
    "./prisma": { prisma: prismaMock },
  };

  new Function("require", "module", "exports", authCode)(
    (name: string) => (name in mocks ? mocks[name] : require(name)),
    mod,
    mod.exports,
  );

  return { exports: mod.exports, sessionRows, deviceRows };
}

test("getCurrentAdminSessions tags the current device and never exposes token hashes", async () => {
  const future = new Date(Date.now() + 60 * 60 * 1000);
  const expired = new Date(Date.now() - 60 * 1000);
  const { exports } = loadAdminAuthForSessions({
    sessions: [
      {
        id: "11111111-1111-1111-1111-111111111111",
        userId: "admin-1",
        tokenHash: sha256("current-token"),
        createdAt: new Date(Date.now() - 10_000),
        expiresAt: future,
      },
      {
        id: "22222222-2222-2222-2222-222222222222",
        userId: "admin-1",
        tokenHash: sha256("other-token"),
        createdAt: new Date(Date.now() - 20_000),
        expiresAt: future,
      },
      {
        id: "33333333-3333-3333-3333-333333333333",
        userId: "admin-1",
        tokenHash: sha256("expired-token"),
        createdAt: new Date(Date.now() - 30_000),
        expiresAt: expired,
      },
      {
        id: "44444444-4444-4444-4444-444444444444",
        userId: "admin-2",
        tokenHash: sha256("someone-else"),
        createdAt: new Date(Date.now() - 5_000),
        expiresAt: future,
      },
    ],
    devices: [
      {
        id: "dev-1",
        userId: "admin-1",
        tokenHash: sha256("dev-current"),
        failureCount: 0,
        expiresAt: future,
      },
      {
        id: "dev-2",
        userId: "admin-1",
        tokenHash: sha256("dev-blocked"),
        failureCount: 5,
        expiresAt: future,
      },
    ],
    cookieMap: { geosub_admin_session: "current-token" },
  });

  const snapshot = await exports.getCurrentAdminSessions("admin-1");
  assert.equal(snapshot.sessions.length, 2);
  assert.equal(snapshot.trustedDeviceCount, 1);
  assert.equal(snapshot.maxActiveSessions, 5);
  assert.equal(snapshot.sessions[0].id, "11111111-1111-1111-1111-111111111111");
  assert.equal(snapshot.sessions[0].isCurrent, true);
  assert.equal(snapshot.sessions[1].id, "22222222-2222-2222-2222-222222222222");
  assert.equal(snapshot.sessions[1].isCurrent, false);
  for (const session of snapshot.sessions) {
    assert.equal("tokenHash" in session, false);
  }
});

test("revokeAdminSessionById blocks revoking current session and other users' sessions", async () => {
  const future = new Date(Date.now() + 60 * 60 * 1000);
  const { exports, sessionRows } = loadAdminAuthForSessions({
    sessions: [
      {
        id: "11111111-1111-1111-1111-111111111111",
        userId: "admin-1",
        tokenHash: sha256("current-token"),
        createdAt: new Date(Date.now() - 10_000),
        expiresAt: future,
      },
      {
        id: "22222222-2222-2222-2222-222222222222",
        userId: "admin-1",
        tokenHash: sha256("other-token"),
        createdAt: new Date(Date.now() - 20_000),
        expiresAt: future,
      },
      {
        id: "44444444-4444-4444-4444-444444444444",
        userId: "admin-2",
        tokenHash: sha256("other-admin-token"),
        createdAt: new Date(Date.now() - 5_000),
        expiresAt: future,
      },
    ],
    cookieMap: { geosub_admin_session: "current-token" },
  });

  assert.deepEqual(
    await exports.revokeAdminSessionById({
      userId: "admin-1",
      sessionId: "11111111-1111-1111-1111-111111111111",
    }),
    { ok: false, reason: "current_session" },
  );

  assert.deepEqual(
    await exports.revokeAdminSessionById({
      userId: "admin-1",
      sessionId: "44444444-4444-4444-4444-444444444444",
    }),
    { ok: false, reason: "not_found" },
  );

  assert.deepEqual(
    await exports.revokeAdminSessionById({
      userId: "admin-1",
      sessionId: "22222222-2222-2222-2222-222222222222",
    }),
    { ok: true, revokedSessionId: "22222222-2222-2222-2222-222222222222" },
  );

  assert.deepEqual(
    sessionRows.map((row) => row.id),
    [
      "11111111-1111-1111-1111-111111111111",
      "44444444-4444-4444-4444-444444444444",
    ],
  );
});

test("revokeOtherAdminSessions preserves current session and current trusted device while revoking all others", async () => {
  const future = new Date(Date.now() + 60 * 60 * 1000);
  const { exports, sessionRows, deviceRows } = loadAdminAuthForSessions({
    sessions: [
      {
        id: "11111111-1111-1111-1111-111111111111",
        userId: "admin-1",
        tokenHash: sha256("current-token"),
        createdAt: new Date(Date.now() - 10_000),
        expiresAt: future,
      },
      {
        id: "22222222-2222-2222-2222-222222222222",
        userId: "admin-1",
        tokenHash: sha256("other-1"),
        createdAt: new Date(Date.now() - 20_000),
        expiresAt: future,
      },
      {
        id: "33333333-3333-3333-3333-333333333333",
        userId: "admin-1",
        tokenHash: sha256("other-2"),
        createdAt: new Date(Date.now() - 30_000),
        expiresAt: future,
      },
      {
        id: "44444444-4444-4444-4444-444444444444",
        userId: "admin-2",
        tokenHash: sha256("admin-2-token"),
        createdAt: new Date(Date.now() - 5_000),
        expiresAt: future,
      },
    ],
    devices: [
      {
        id: "dev-current",
        userId: "admin-1",
        tokenHash: sha256("current-device"),
        failureCount: 0,
        expiresAt: future,
      },
      {
        id: "dev-other",
        userId: "admin-1",
        tokenHash: sha256("other-device"),
        failureCount: 0,
        expiresAt: future,
      },
    ],
    cookieMap: {
      geosub_admin_session: "current-token",
      geosub_admin_device: "current-device",
    },
  });

  const result = await exports.revokeOtherAdminSessions({ userId: "admin-1" });
  assert.deepEqual(result, {
    ok: true,
    revokedSessions: 2,
    revokedTrustedDevices: 1,
  });
  assert.deepEqual(
    sessionRows.map((row) => row.id),
    [
      "11111111-1111-1111-1111-111111111111",
      "44444444-4444-4444-4444-444444444444",
    ],
  );
  assert.deepEqual(
    deviceRows.map((row) => row.id),
    ["dev-current"],
  );
});

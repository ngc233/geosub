import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { AdminSaveConflict } from "./admin-save.ts";

const require = createRequire(import.meta.url);
const ts = require("typescript");

function loadCommandModule({
  admin = { id: "admin-1", role: "OWNER" },
  logs = [] as string[],
} = {}) {
  const code = ts.transpileModule(
    readFileSync(new URL("./admin-command.ts", import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;

  const invalidated: string[] = [];
  const revalidated: string[] = [];
  const audits: Array<Record<string, unknown>> = [];
  let txCount = 0;

  const prismaStub = {
    auditLog: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        audits.push({ ...data, inTx: false });
      },
    },
    $transaction: async <T,>(
      callback: (tx: {
        auditLog: {
          create: (args: { data: Record<string, unknown> }) => Promise<void>;
        };
      }) => Promise<T>,
    ) => {
      txCount += 1;
      const txAudits: Array<Record<string, unknown>> = [];
      const result = await callback({
        auditLog: {
          create: async ({ data }) => {
            txAudits.push({ ...data, inTx: true });
          },
        },
      });
      audits.push(...txAudits);
      return result;
    },
  };

  const mod = {
    exports: {} as {
      AdminCommandInputError: new (message: string) => Error;
      executeAdminCommand: (spec: Record<string, unknown>) => Promise<{
        ok: boolean;
        data?: unknown;
        code?: string;
        message?: string;
        requestId: string;
      }>;
    },
  };

  const sandboxConsole = {
    error: (msg: string) => logs.push(msg),
  };

  new Function("require", "module", "exports", "console", code)(
    (name: string) => {
      if (name === "server-only") return {};
      if (name === "next/cache") {
        return {
          revalidatePath: (target: string) => revalidated.push(target),
        };
      }
      if (name === "./admin-auth") {
        return { requireAdmin: async () => admin };
      }
      if (name === "./admin-read-model-cache") {
        return {
          invalidateAdminPricingReadModels: () => invalidated.push("pricing"),
          invalidateAdminCatalogReadModels: () => invalidated.push("catalog"),
          invalidateAdminSeoReadModels: () => invalidated.push("seo"),
          invalidateAdminSystemReadModels: () => invalidated.push("system"),
        };
      }
      if (name === "./admin-save") return { AdminSaveConflict };
      if (name === "./prisma") return { adminPrisma: prismaStub };
      return require(name);
    },
    mod,
    mod.exports,
    sandboxConsole,
  );

  return {
    ...mod.exports,
    invalidated,
    revalidated,
    audits,
    getTxCount: () => txCount,
  };
}

test("executeAdminCommand runs auth, validation, transactional audit, cache invalidation, and revalidation in order", async () => {
  const ctx = loadCommandModule();

  const result = await ctx.executeAdminCommand({
    name: "settings.analytics.update",
    capability: "manage",
    input: { ga4: "G-123456" },
    parseInput: (raw: { ga4: string }) => ({ ga4: raw.ga4.trim() }),
    execute: async ({ input }: { input: { ga4: string } }) => ({
      saved: input.ga4,
    }),
    audit: ({ data }: { data: { saved: string } }) => ({
      action: "settings_analytics_update",
      targetType: "site_settings",
      newValue: data,
    }),
    invalidate: ["system"],
    revalidatePaths: ["/admin/settings"],
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.data, { saved: "G-123456" });
  assert.match(result.requestId, /^[0-9a-f-]{36}$/i);
  assert.equal(ctx.getTxCount(), 1);
  assert.equal(ctx.audits.length, 1);
  assert.equal(ctx.audits[0].inTx, true);
  assert.equal(ctx.audits[0].actorId, "admin-1");
  assert.deepEqual(ctx.invalidated, ["system"]);
  assert.deepEqual(ctx.revalidated, ["/admin/settings"]);
});

test("executeAdminCommand rejects invalid input before opening a transaction or invalidating cache", async () => {
  const ctx = loadCommandModule();

  const result = await ctx.executeAdminCommand({
    name: "settings.analytics.update",
    capability: "manage",
    input: { ga4: "bad" },
    parseInput: () => {
      throw new ctx.AdminCommandInputError("统计 ID 格式无效");
    },
    execute: async () => {
      throw new Error("should not execute");
    },
    invalidate: ["system"],
    revalidatePaths: ["/admin/settings"],
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, "INVALID_INPUT");
  assert.equal(result.message, "统计 ID 格式无效");
  assert.equal(ctx.getTxCount(), 0);
  assert.equal(ctx.audits.length, 0);
  assert.deepEqual(ctx.invalidated, []);
  assert.deepEqual(ctx.revalidated, []);
});

test("executeAdminCommand maps conflicts and Prisma errors cleanly and rolls back without audit or invalidation", async () => {
  const logs: string[] = [];
  const ctx = loadCommandModule({ logs });

  const conflict = await ctx.executeAdminCommand({
    name: "settings.update",
    capability: "manage",
    input: {},
    execute: async () => {
      throw new AdminSaveConflict("版本冲突");
    },
    audit: () => ({ action: "noop", targetType: "site_settings" }),
    invalidate: ["system"],
  });
  assert.equal(conflict.ok, false);
  assert.equal(conflict.code, "CONFLICT");
  assert.equal(conflict.message, "版本冲突");
  assert.equal(ctx.audits.length, 0);
  assert.deepEqual(ctx.invalidated, []);

  const unique = await ctx.executeAdminCommand({
    name: "product.create",
    capability: "manage",
    input: {},
    execute: async () => {
      throw Object.assign(new Error("unique"), { code: "P2002" });
    },
  });
  assert.equal(unique.ok, false);
  assert.equal(unique.code, "UNIQUE_CONSTRAINT");

  const unexpected = await ctx.executeAdminCommand({
    name: "product.crash",
    capability: "manage",
    input: {},
    execute: async () => {
      throw new TypeError("unexpected boom");
    },
  });
  assert.equal(unexpected.ok, false);
  assert.equal(unexpected.code, "INTERNAL_ERROR");
  assert.equal(logs.length, 1);
  assert.match(logs[0], /admin_command_error/);
  assert.match(logs[0], /product\.crash/);
});

test("executeAdminCommand rethrows Next.js redirect control-flow errors", async () => {
  const ctx = loadCommandModule();

  await assert.rejects(
    ctx.executeAdminCommand({
      name: "redirect.test",
      capability: "manage",
      input: {},
      execute: async () => {
        throw Object.assign(new Error("NEXT_REDIRECT"), {
          digest: "NEXT_REDIRECT;replace;/admin-login;307;",
        });
      },
    }),
    /NEXT_REDIRECT/,
  );
});

test("executeAdminCommand runs preflight before opening a transaction and blocks cleanly on input error", async () => {
  const ctx = loadCommandModule();

  const result = await ctx.executeAdminCommand({
    name: "collector_jobs.run_now",
    capability: "manage",
    input: { id: "job-1" },
    preflight: async () => {
      throw new ctx.AdminCommandInputError("需要先检查启用条件");
    },
    execute: async () => {
      throw new Error("should not execute");
    },
    audit: () => ({ action: "run_now", targetType: "collector_job" }),
    invalidate: ["pricing"],
  });

  assert.equal(result.ok, false);
  assert.equal(result.code, "INVALID_INPUT");
  assert.equal(result.message, "需要先检查启用条件");
  assert.equal(ctx.getTxCount(), 0);
  assert.equal(ctx.audits.length, 0);
  assert.deepEqual(ctx.invalidated, []);
});

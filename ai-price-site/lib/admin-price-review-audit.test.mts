import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const ts = require("typescript");

type AuditRecord = {
  actorId: string;
  action: string;
  targetType: string;
  targetId?: string;
  newValue?: Record<string, unknown>;
  note?: string;
};

function loadReviewModule({ failSql = false } = {}) {
  const code = ts.transpileModule(
    readFileSync(new URL("./admin-price-review.ts", import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;

  const queries: Array<{ sql: string; inTx: boolean }> = [];
  const audits: Array<{ record: AuditRecord; inTx: boolean }> = [];
  let txCount = 0;

  const runRaw = async (parts: TemplateStringsArray, inTx: boolean) => {
    const sql = parts.join("?");
    queries.push({ sql, inTx });
    if (failSql) throw new Error("sql review failed");
    if (sql.includes("approve_price_observation")) {
      return [{ region_price_id: "22222222-2222-4222-8222-222222222222" }];
    }
    if (sql.includes("refresh_matching_app_store_prices")) {
      return [{ revalidated_prices: 4 }];
    }
    if (sql.includes("run_app_store_stability_auto_review")) {
      return [{ approved: 2 }];
    }
    if (sql.includes("quarantine_published_app_store_price_outliers")) {
      return [{ quarantined_rows: 1 }];
    }
    return [];
  };

  const prismaStub = {
    $queryRaw: (parts: TemplateStringsArray) => runRaw(parts, false),
    auditLog: {
      create: async ({ data }: { data: AuditRecord }) => {
        audits.push({ record: data, inTx: false });
      },
    },
    $transaction: async <T,>(
      callback: (tx: {
        $queryRaw: (parts: TemplateStringsArray) => Promise<unknown>;
        auditLog: { create: (args: { data: AuditRecord }) => Promise<void> };
      }) => Promise<T>,
    ) => {
      txCount += 1;
      return callback({
        $queryRaw: (parts: TemplateStringsArray) => runRaw(parts, true),
        auditLog: {
          create: async ({ data }: { data: AuditRecord }) => {
            audits.push({ record: data, inTx: true });
          },
        },
      });
    },
  };

  const mod = {
    exports: {} as {
      approvePriceObservation: (
        id: string,
        opts: { actorId: string; taxProfiles?: boolean; note?: string },
      ) => Promise<void>;
      ignorePriceObservation: (
        id: string,
        note: string,
        actorId: string,
      ) => Promise<void>;
      rejectPriceObservation: (
        id: string,
        note: string,
        actorId: string,
      ) => Promise<void>;
      runAppStoreStabilityAutoReview: (actorId: string) => Promise<void>;
    },
  };

  new Function("require", "module", "exports", code)(
    (name: string) => {
      if (name === "server-only") return {};
      if (name === "./prisma") return { prisma: prismaStub };
      return require(name);
    },
    mod,
    mod.exports,
  );

  return { mod: mod.exports, queries, audits, getTxCount: () => txCount };
}

test("approvePriceObservation records actorId and promoted price id atomically before derivative refresh", async () => {
  const ctx = loadReviewModule();
  const obsId = "11111111-1111-4111-8111-111111111111";
  const actorId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

  await ctx.mod.approvePriceObservation(obsId, {
    actorId,
    taxProfiles: true,
    note: "Approved from review center",
  });

  assert.equal(ctx.getTxCount(), 1);
  assert.equal(ctx.audits.length, 1);
  assert.equal(ctx.audits[0].inTx, true);
  assert.equal(ctx.audits[0].record.actorId, actorId);
  assert.equal(ctx.audits[0].record.action, "approve_price_observation");
  assert.equal(ctx.audits[0].record.targetId, obsId);
  assert.equal(
    ctx.audits[0].record.newValue?.promotedRegionPriceId,
    "22222222-2222-4222-8222-222222222222",
  );
  assert.equal(
    ctx.queries.some((q) => q.inTx && q.sql.includes("approve_price_observation")),
    true,
  );
  assert.equal(
    ctx.queries.some(
      (q) => !q.inTx && q.sql.includes("refresh_plan_affordability_metrics"),
    ),
    true,
  );
});

test("reject and ignore observation write transactional audit logs and skip audit on SQL error", async () => {
  const obsId = "11111111-1111-4111-8111-111111111111";
  const actorId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

  const okCtx = loadReviewModule();
  await okCtx.mod.rejectPriceObservation(obsId, "outlier", actorId);
  await okCtx.mod.ignorePriceObservation(obsId, "duplicate", actorId);

  assert.equal(okCtx.getTxCount(), 2);
  assert.equal(okCtx.audits.length, 2);
  assert.equal(okCtx.audits[0].inTx, true);
  assert.equal(okCtx.audits[0].record.action, "reject_price_observation");
  assert.equal(okCtx.audits[0].record.actorId, actorId);
  assert.equal(okCtx.audits[1].inTx, true);
  assert.equal(okCtx.audits[1].record.action, "ignore_price_observation");
  assert.equal(okCtx.audits[1].record.actorId, actorId);

  const failCtx = loadReviewModule({ failSql: true });
  await assert.rejects(
    failCtx.mod.approvePriceObservation(obsId, { actorId }),
    /sql review failed/,
  );
  assert.equal(failCtx.audits.length, 0);
});

test("runAppStoreStabilityAutoReview records actorId and outcome counts", async () => {
  const ctx = loadReviewModule();
  const actorId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

  await ctx.mod.runAppStoreStabilityAutoReview(actorId);

  assert.equal(ctx.audits.length, 1);
  assert.equal(ctx.audits[0].record.actorId, actorId);
  assert.equal(ctx.audits[0].record.action, "run_app_store_auto_review");
  assert.deepEqual(ctx.audits[0].record.newValue, {
    revalidatedPrices: 4,
    autoReviewResultCount: 1,
    quarantinedRows: 1,
  });
});

test("review action entrypoints never discard requireAdmin actor for mutations", () => {
  const reviewActions = readFileSync(
    new URL("../app/admin/review/actions.ts", import.meta.url),
    "utf8",
  );
  const obsActions = readFileSync(
    new URL("../app/admin/price-observations/actions.ts", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(reviewActions, /^\s*await requireAdmin\("manage"\);$/m);
  assert.doesNotMatch(obsActions, /^\s*await requireAdmin\("manage"\);$/m);
});

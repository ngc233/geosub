import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import {
  formatAuditActionLabel,
  getAuditActionTone,
  parseAuditLogFilters,
  redactAuditValue,
  summarizeAuditPayload,
} from "./model.ts";

const require = createRequire(import.meta.url);
const ts = require("typescript");

test("parseAuditLogFilters enforces whitelists, UUID validation, and safe defaults", () => {
  const defaults = parseAuditLogFilters({});
  assert.equal(defaults.page, 1);
  assert.equal(defaults.pageSize, 50);
  assert.equal(defaults.sort, "createdAt");
  assert.equal(defaults.direction, "desc");
  assert.equal(defaults.range, "30");
  assert.equal(defaults.actor, "");
  assert.equal(defaults.action, "");
  assert.equal(defaults.targetType, "");

  const valid = parseAuditLogFilters({
    q: "  chatgpt  ",
    actor: "11111111-1111-4111-8111-111111111111",
    action: "approve_price_observation",
    targetType: "price_observation",
    range: "7",
    sort: "action",
    dir: "asc",
    page: "3",
  });
  assert.equal(valid.q, "chatgpt");
  assert.equal(valid.actor, "11111111-1111-4111-8111-111111111111");
  assert.equal(valid.action, "approve_price_observation");
  assert.equal(valid.targetType, "price_observation");
  assert.equal(valid.range, "7");
  assert.equal(valid.sort, "action");
  assert.equal(valid.direction, "asc");
  assert.equal(valid.page, 3);

  const systemActor = parseAuditLogFilters({ actor: "system", range: "all" });
  assert.equal(systemActor.actor, "system");
  assert.equal(systemActor.range, "all");

  const hostile = parseAuditLogFilters({
    actor: "not-a-uuid",
    action: "drop table;",
    targetType: "../secret",
    range: "9999",
    sort: "passwordHash",
    dir: "sideways",
    page: "-4",
  });
  assert.equal(hostile.actor, "");
  assert.equal(hostile.action, "");
  assert.equal(hostile.targetType, "");
  assert.equal(hostile.range, "30");
  assert.equal(hostile.sort, "createdAt");
  assert.equal(hostile.direction, "desc");
  assert.equal(hostile.page, 1);
});

test("redactAuditValue and summarizeAuditPayload mask secrets and compute safe diffs", () => {
  const redacted = redactAuditValue({
    status: "approved",
    passwordHash: "scrypt:secret",
    sessionToken: "abc123",
    nested: { apiKey: "sk-live-123", count: 4 },
  }) as Record<string, unknown>;

  assert.equal(redacted.status, "approved");
  assert.equal(redacted.passwordHash, "[REDACTED]");
  assert.equal(redacted.sessionToken, "[REDACTED]");
  assert.deepEqual(redacted.nested, { apiKey: "[REDACTED]", count: 4 });

  const summary = summarizeAuditPayload(
    { status: "pending", note: "old" },
    { status: "approved", promotedRegionPriceId: "rp-1", token: "secret-value" },
  );

  assert.deepEqual(summary, [
    { key: "status", preview: "pending → approved" },
    { key: "promotedRegionPriceId", preview: "rp-1" },
    { key: "token", preview: "[REDACTED]" },
  ]);

  assert.equal(formatAuditActionLabel("approve_price_observation"), "审核通过价格");
  assert.equal(getAuditActionTone("approve_price_observation"), "published");
  assert.equal(getAuditActionTone("reject_price_observation"), "danger");
  assert.equal(getAuditActionTone("export_events_csv"), "review");
});

test("buildAuditLogWhere filters by date range, actor, system null actor, and UUID search", () => {
  const queriesCode = ts.transpileModule(
    readFileSync(new URL("./queries.ts", import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;

  const modelMod = {
    formatAuditActionLabel,
    formatAuditTargetTypeLabel: (v: string) => v,
    getAuditLogRangeStart: (range: string, now: Date) =>
      range === "all" ? null : new Date(now.getTime() - Number(range) * 86_400_000),
    isUuidValue: (v: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v),
  };

  const mod = {
    exports: {} as {
      buildAuditLogWhere: (
        filters: Record<string, unknown>,
        now?: Date,
      ) => { AND?: Array<Record<string, unknown>> };
    },
  };

  new Function("require", "module", "exports", queriesCode)(
    (name: string) => {
      if (name === "server-only") return {};
      if (name === "./model") return modelMod;
      if (name.endsWith("admin-list-params")) return { clampAdminPage: () => ({ page: 1, totalPages: 1 }) };
      if (name.endsWith("admin-performance")) return { measureAdminWorkload: (_n: string, fn: () => unknown) => fn() };
      if (name.endsWith("prisma")) return { prisma: {} };
      return require(name);
    },
    mod,
    mod.exports,
  );

  const now = new Date("2026-11-26T12:00:00.000Z");
  const uuid = "22222222-2222-4222-8222-222222222222";
  const where = mod.exports.buildAuditLogWhere(
    {
      q: uuid,
      actor: "system",
      action: "export_events_csv",
      targetType: "event_log",
      range: "7",
    },
    now,
  );

  assert.equal(where.AND?.length, 5);
  assert.deepEqual(where.AND?.[1], { actorId: null });
  assert.deepEqual(where.AND?.[2], { action: "export_events_csv" });
  assert.deepEqual(where.AND?.[3], { targetType: "event_log" });
  const searchOr = where.AND?.[4]?.OR as Array<Record<string, unknown>>;
  assert.ok(searchOr.some((clause) => clause.targetId === uuid));
});

test("audit logs page stays read-only, uses SQL pagination, semantic tokens, and never selects passwordHash", () => {
  const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
  const queries = readFileSync(new URL("./queries.ts", import.meta.url), "utf8");

  assert.match(page, /await requireAdmin\("read"\)/);
  assert.match(page, /<AdminPageHeader/);
  assert.match(page, /<AdminFilterBar/);
  assert.match(page, /<AdminDataTable/);
  assert.doesNotMatch(page, /from ["']next\/link["']/);
  assert.doesNotMatch(page, /rounded-(?:2xl|3xl)/);
  assert.doesNotMatch(
    page,
    /(?<![:\w-])(?:(?:bg|border|divide)-white|(?:bg|text|border|divide)-(?:slate|gray|zinc)-\d{2,3})\b/,
  );

  assert.match(queries, /measureAdminWorkload\("audit-logs\.page-data"/);
  assert.match(queries, /skip,\s*take: filters\.pageSize/);
  assert.doesNotMatch(queries, /passwordHash/);
});

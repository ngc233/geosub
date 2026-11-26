import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import {
  classifyCollectorRunFailurePhase,
  formatActivationPreflightError,
  requiresCollectorActivationPreflight,
  resolveProductBillingPlatformScope,
} from "./admin-product-scope-policy.ts";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const { Prisma } = require("@prisma/client");

function loadSqlScopeModule() {
  const code = ts.transpileModule(
    readFileSync(new URL("./admin-product-scope.ts", import.meta.url), "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;

  const mod = {
    exports: {} as {
      officialWebEligibleJobSql: (
        p: "product" | "p",
        j: "job" | "jobs",
      ) => { strings: string[]; values: unknown[]; sql: string };
      webPricingScopeJoinSql: (opts: {
        statsAlias: "job_stats" | "supported";
        officialWebCountColumn: "official_web_job_count" | "official_web_count";
        appStoreCountColumn: "app_store_job_count" | "app_store_count";
        scopeAlias: "pricing_scope" | "scope";
      }) => { strings: string[]; values: unknown[]; sql: string };
      activationPreflightConditionSql: (
        p: "product" | "p",
        j: "job" | "jobs",
      ) => { strings: string[]; values: unknown[]; sql: string };
      isAutoReviewFailureSql: (
        run: "latest" | "run",
      ) => { strings: string[]; values: unknown[]; sql: string };
    },
  };

  new Function("require", "module", "exports", code)(
    (name: string) => {
      if (name === "server-only") return {};
      if (name === "@prisma/client") return { Prisma };
      if (name === "./admin-product-scope-policy") {
        return {
          LEGACY_OFFICIAL_WEB_PRODUCT_SLUGS: ["spotify", "apple-music"],
          LEGACY_ACTIVATION_PREFLIGHT_RULES: [
            {
              productSlug: "claude",
              collectorKind: "pricing_page",
              message: "请从 Claude 采集配置检查启用条件，再确认加入周期调度。",
            },
          ],
          LEGACY_AUTO_REVIEW_ERROR_PREFIX:
            "Automatic review failed after collection:",
        };
      }
      return require(name);
    },
    mod,
    mod.exports,
  );

  return mod.exports;
}

test("new official web products resolve to web via source profiles or job config without code edits", () => {
  assert.equal(
    resolveProductBillingPlatformScope({
      productSlug: "netflix",
      appStoreJobCount: 0,
      officialWebJobCount: 1,
      hasActiveWebSourceProfile: true,
    }),
    "web",
  );
  assert.equal(
    resolveProductBillingPlatformScope({
      productSlug: "youtube-premium",
      appStoreJobCount: 0,
      officialWebJobCount: 1,
      explicitBillingPlatformScope: "web",
    }),
    "web",
  );
  // Existing App Store products always preserve ios scope.
  assert.equal(
    resolveProductBillingPlatformScope({
      productSlug: "spotify",
      appStoreJobCount: 1,
      officialWebJobCount: 1,
      hasActiveWebSourceProfile: true,
    }),
    "ios",
  );
  // Legacy pilot slugs remain backwards-compatible before profile backfill.
  assert.equal(
    resolveProductBillingPlatformScope({
      productSlug: "spotify",
      appStoreJobCount: 0,
      officialWebJobCount: 1,
    }),
    "web",
  );
  assert.equal(
    resolveProductBillingPlatformScope({
      productSlug: "apple-music",
      appStoreJobCount: 0,
      officialWebJobCount: 1,
    }),
    "web",
  );
});

test("activation preflight supports config-driven products and custom messages while keeping Claude fallback", () => {
  assert.equal(
    requiresCollectorActivationPreflight({
      productSlug: "new-web-ai",
      collectorKind: "pricing_page",
      jobRequiresPreflight: true,
    }),
    true,
  );
  assert.equal(
    requiresCollectorActivationPreflight({
      productSlug: "new-web-ai",
      collectorKind: "pricing_page",
      profileRequiresPreflight: true,
    }),
    true,
  );
  assert.equal(
    requiresCollectorActivationPreflight({
      productSlug: "claude",
      collectorKind: "pricing_page",
    }),
    true,
  );
  assert.equal(
    requiresCollectorActivationPreflight({
      productSlug: "claude",
      collectorKind: "app_store",
    }),
    false,
  );

  assert.equal(
    formatActivationPreflightError({
      productSlug: "new-web-ai",
      preflightMessage: "请先验证新官网来源样本。",
    }),
    "请先验证新官网来源样本。",
  );
  assert.match(
    formatActivationPreflightError({ productSlug: "claude" }),
    /Claude 采集配置/,
  );
  assert.match(
    formatActivationPreflightError({ productSlug: "other-product" }),
    /产品采集配置/,
  );
});

test("failure phase classification prioritizes structured failure_phase over legacy error prefixes", () => {
  assert.equal(
    classifyCollectorRunFailurePhase({
      failure_phase: "collector",
      error_message: "Automatic review failed after collection: misleading text",
    }),
    "collector",
  );
  assert.equal(
    classifyCollectorRunFailurePhase({ failure_phase: "auto_review" }),
    "auto_review",
  );
  assert.equal(
    classifyCollectorRunFailurePhase({ failure_phase: "spawn" }),
    "spawn",
  );
  assert.equal(
    classifyCollectorRunFailurePhase({ failure_stage: "review" }),
    "auto_review",
  );
  assert.equal(
    classifyCollectorRunFailurePhase({
      collector_status: "succeeded",
      auto_review_status: "failed",
    }),
    "auto_review",
  );
  assert.equal(
    classifyCollectorRunFailurePhase({
      error_message: "Automatic review failed after collection: legacy row",
    }),
    "auto_review",
  );
  assert.equal(
    classifyCollectorRunFailurePhase({ error_message: "HTTP 503" }),
    null,
  );
});

test("SQL scope builders read product_source_profiles, job_config, and structured failure_phase", () => {
  const scope = loadSqlScopeModule();

  const webJobSql = scope.officialWebEligibleJobSql("product", "job");
  assert.match(webJobSql.sql, /billing_platform_scope/);
  assert.match(webJobSql.sql, /FROM product_source_profiles profile/);
  assert.deepEqual(webJobSql.values, ["spotify", "apple-music"]);

  const joinSql = scope.webPricingScopeJoinSql({
    statsAlias: "job_stats",
    officialWebCountColumn: "official_web_job_count",
    appStoreCountColumn: "app_store_job_count",
    scopeAlias: "pricing_scope",
  });
  assert.match(joinSql.sql, /COALESCE\(job_stats\.official_web_job_count, 0\) > 0/);
  assert.match(joinSql.sql, /COALESCE\(job_stats\.app_store_job_count, 0\) = 0/);
  assert.match(joinSql.sql, /END AS billing_platform/);

  const preflightSql = scope.activationPreflightConditionSql("product", "job");
  assert.match(preflightSql.sql, /requires_activation_preflight/);
  assert.match(preflightSql.sql, /FROM product_source_profiles profile/);
  assert.deepEqual(preflightSql.values, ["claude", "pricing_page"]);

  const reviewFailSql = scope.isAutoReviewFailureSql("latest");
  assert.match(reviewFailSql.sql, /failure_phase/);
  assert.match(reviewFailSql.sql, /failure_stage/);
  assert.match(reviewFailSql.sql, /auto_review_status/);
  assert.deepEqual(reviewFailSql.values, [
    "Automatic review failed after collection:%",
  ]);
});

test("workspace, pipeline, and collector-jobs actions have no hardcoded product slugs or review error strings", () => {
  const workspace = readFileSync(
    new URL("./admin-workspace.ts", import.meta.url),
    "utf8",
  );
  const pipeline = readFileSync(
    new URL("../app/admin/pipeline/page.tsx", import.meta.url),
    "utf8",
  );
  const collectorActions = readFileSync(
    new URL("../app/admin/collector-jobs/actions.ts", import.meta.url),
    "utf8",
  );

  for (const [label, source] of [
    ["lib/admin-workspace.ts", workspace],
    ["app/admin/pipeline/page.tsx", pipeline],
    ["app/admin/collector-jobs/actions.ts", collectorActions],
  ]) {
    assert.doesNotMatch(source, /'spotify'/, `${label} must not hardcode spotify`);
    assert.doesNotMatch(
      source,
      /'apple-music'/,
      `${label} must not hardcode apple-music`,
    );
    assert.doesNotMatch(
      source,
      /Automatic review failed after collection:/,
      `${label} must not hardcode legacy review error prefix`,
    );
  }

  assert.doesNotMatch(
    collectorActions,
    /product\.slug\s*=\s*'claude'/,
    "collector-jobs/actions.ts must not hardcode claude slug",
  );
});

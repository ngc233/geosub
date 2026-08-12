import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const appDir = dirname(fileURLToPath(import.meta.url));
const frontendDir = resolve(appDir, "..");
const repoDir = resolve(frontendDir, "..");
const require = createRequire(import.meta.url);
const manifest = require(resolve(
  repoDir,
  "geosub-backend",
  "scripts",
  "migration-manifest.cjs",
));
const productionRunner = readFileSync(
  resolve(repoDir, "geosub-backend", "deploy", "linux-arm64", "db-apply-sql.sh"),
  "utf8",
);
const postDeployCheck = readFileSync(
  resolve(repoDir, "geosub-backend", "deploy", "linux-arm64", "post-deploy-check.sh"),
  "utf8",
);
const shadowVerifier = readFileSync(
  resolve(
    repoDir,
    "geosub-backend",
    "deploy",
    "linux-arm64",
    "db-migration-shadow-verify.sh",
  ),
  "utf8",
);
const emptySchemaVerifier = readFileSync(
  resolve(
    repoDir,
    "geosub-backend",
    "deploy",
    "linux-arm64",
    "db-empty-schema-verify.sh",
  ),
  "utf8",
);
const localRunner = readFileSync(
  resolve(frontendDir, "scripts", "migrate-database.cjs"),
  "utf8",
);
const localSqlRunner = readFileSync(
  resolve(frontendDir, "scripts", "apply-local-sql.cjs"),
  "utf8",
);
const prismaBaseline = readFileSync(
  resolve(frontendDir, "scripts", "prepare-prisma-baseline.cjs"),
  "utf8",
);
const migrationAudit = readFileSync(
  resolve(frontendDir, "scripts", "check-migrations.cjs"),
  "utf8",
);
const packageJson = JSON.parse(
  readFileSync(resolve(frontendDir, "package.json"), "utf8"),
) as { scripts: Record<string, string> };

test("one migration layout classifies every schema, backfill and Prisma migration", () => {
  const summary = manifest.validateManifest({ frontendDir });
  assert.equal(summary.schema, manifest.schemaEntries.length);
  assert.equal(summary.backfill, manifest.backfillEntries.length);
  assert.equal(summary.retired, manifest.retiredFiles.size);
  assert.equal(summary.legacy, 90);
  assert.equal(summary.prisma, manifest.prismaMigrations.length);
  assert.equal(summary.schema, 53);
  assert.equal(summary.backfill, 47);
  assert.equal(manifest.baselineCutoverFile, "sql/063_system_task_runs.sql");
  assert.ok(manifest.legacyBaselineFiles.includes("sql/062_app_store_coverage_gap_rechecks.sql"));
  assert.ok(!manifest.legacyBaselineFiles.includes(manifest.baselineCutoverFile));
  assert.equal(summary.prisma, 14);
  assert.deepEqual(manifest.prismaBaselineMigrations, manifest.prismaMigrations.slice(0, 2));
  assert.ok(
    manifest.schemaEntries.some(
      (entry: { file: string }) => entry.file === "sql/schema/053_product_source_profiles.sql",
    ),
  );
  assert.ok(
    !manifest.schemaEntries.some((entry: { file: string }) =>
      entry.file.includes("directus_cn"),
    ),
  );
  const articleTrash = manifest.schemaEntries.find(
    (entry: { file: string }) => entry.file === "sql/schema/052_article_soft_delete_trash.sql",
  );
  assert.match(manifest.compatibilitySqlForEntry(articleTrash), /articles.*deleted_at/);
  const eventRateLimits = manifest.schemaEntries.find(
    (entry: { file: string }) => entry.file === "sql/schema/049_event_rate_limits.sql",
  );
  assert.equal(manifest.compatibilitySqlForEntry(eventRateLimits), null);
});

test("local and production SQL runners consume the canonical manifest", () => {
  assert.match(productionRunner, /migration-manifest\.cjs/);
  assert.match(productionRunner, /entries "\$MODE"/);
  assert.doesNotMatch(productionRunner, /entries all/);
  assert.match(productionRunner, /check_legacy_baseline/);
  assert.match(productionRunner, /Legacy baseline-compatible/);
  assert.match(productionRunner, /compatibility-sql/);
  assert.match(productionRunner, /Structure-compatible/);
  assert.doesNotMatch(productionRunner, /Registered compatibility alias/);
  assert.match(productionRunner, /queue_app_store_coverage_gap_rechecks/);
  assert.doesNotMatch(productionRunner, /core_files=\(/);
  assert.match(localRunner, /apply-local-sql\.cjs/);
  assert.match(localRunner, /"--mode",\s*"schema"/);
  assert.match(localRunner, /prisma\/build\/index\.js/);
  assert.match(localRunner, /prismaCli, "migrate", "deploy"/);
  assert.match(localRunner, /prepare-prisma-baseline\.cjs/);
  assert.match(localSqlRunner, /hasLegacyBaseline/);
  assert.match(localSqlRunner, /Legacy baseline-compatible/);
  assert.match(localSqlRunner, /hasStructuralCompatibility/);
  assert.match(localSqlRunner, /Structure-compatible/);
  assert.doesNotMatch(localSqlRunner, /Registered compatibility alias/);
  assert.match(localSqlRunner, /ensureBackfillRegistry/);
  assert.ok(
    localRunner.indexOf("Applying schema-only SQL migrations") <
      localRunner.indexOf("Preparing the Prisma baseline") &&
      localRunner.indexOf("Preparing the Prisma baseline") <
        localRunner.indexOf("Applying Prisma migrations"),
    "schema SQL must precede the guarded Prisma baseline and remaining migrations",
  );
  assert.match(prismaBaseline, /migrate", "resolve", "--applied"/);
  assert.match(prismaBaseline, /Refusing to baseline/);
  assert.equal(packageJson.scripts["db:migrate"], "node scripts/migrate-database.cjs");
  assert.equal(
    packageJson.scripts["db:backfill"],
    "node scripts/apply-local-sql.cjs --mode backfill",
  );
});

test("migration audits cover both registries and run during release checks", () => {
  assert.match(migrationAudit, /geosub_schema_migrations/);
  assert.match(migrationAudit, /geosub_backfill_migrations/);
  assert.match(migrationAudit, /_prisma_migrations/);
  assert.match(migrationAudit, /legacyChecksums/);
  assert.match(postDeployCheck, /list schema/);
  assert.match(postDeployCheck, /list prisma/);
  assert.match(postDeployCheck, /check_prisma_migration/);
  assert.match(packageJson.scripts["preflight:full"], /check:migration-manifest/);
});

test("B1 shadow verification refuses production and proves a zero-change run", () => {
  assert.match(shadowVerifier, /geosub_b1_shadow_/);
  assert.match(shadowVerifier, /Refusing to run against the production database/);
  assert.match(shadowVerifier, /VERIFY_B1_SHADOW/);
  assert.match(shadowVerifier, /frontend_dir_override/);
  assert.match(shadowVerifier, /evidence_dir_override/);
  assert.match(shadowVerifier, /--schema-only/);
  assert.match(shadowVerifier, /--data-only/);
  assert.match(shadowVerifier, /0 applied/);
  assert.match(shadowVerifier, /compatible/);
  assert.match(shadowVerifier, /No pending migrations to apply/);
  assert.match(shadowVerifier, /before_schema_hash/);
  assert.match(shadowVerifier, /before_data_hash/);
});

test("B1 empty database verification rebuilds once and proves idempotency", () => {
  assert.match(emptySchemaVerifier, /geosub_b1_empty_/);
  assert.match(emptySchemaVerifier, /Refusing to run against the production database/);
  assert.match(emptySchemaVerifier, /VERIFY_B1_EMPTY/);
  assert.match(emptySchemaVerifier, /frontend_dir_override/);
  assert.match(emptySchemaVerifier, /evidence_dir_override/);
  assert.match(emptySchemaVerifier, /Verification database is not empty/);
  assert.match(emptySchemaVerifier, /first-pass\.log/);
  assert.match(emptySchemaVerifier, /second-pass\.log/);
  assert.match(emptySchemaVerifier, /0 applied/);
  assert.match(emptySchemaVerifier, /No pending migrations to apply/);
  assert.match(emptySchemaVerifier, /empty-final\.sql/);
});

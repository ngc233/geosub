#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const backendDir = path.resolve(__dirname, "..");
const layoutPath = path.join(backendDir, "sql", "migration-layout.json");
const layout = JSON.parse(fs.readFileSync(layoutPath, "utf8"));

const schemaEntries = Object.freeze(layout.schema.map((entry) => Object.freeze(entry)));
const backfillEntries = Object.freeze(layout.backfill.map((entry) => Object.freeze(entry)));
const retiredEntries = Object.freeze(layout.retired.map((entry) => Object.freeze(entry)));
const registryAliases = Object.freeze(
  (layout.registryAliases || []).map((entry) => Object.freeze(entry)),
);
const activeSchemaEntries = Object.freeze(
  schemaEntries.filter((entry) => entry.releasePhase !== "post-cutover"),
);
const postCutoverSchemaEntries = Object.freeze(
  schemaEntries.filter((entry) => entry.releasePhase === "post-cutover"),
);

const schemaFiles = Object.freeze(schemaEntries.map((entry) => entry.file));
const backfillFiles = Object.freeze(backfillEntries.map((entry) => entry.file));
const retiredFiles = new Map(retiredEntries.map((entry) => [entry.file, entry.reason]));

// Compatibility exports for code that still refers to the pre-B1 vocabulary.
// "core" is now schema-only; "content" is an explicit backfill alias.
const coreFiles = schemaFiles;
const contentFiles = backfillFiles;

const baselineCutoverFile = "sql/063_system_task_runs.sql";
const legacyBaselineEntries = Object.freeze(
  [...schemaEntries, ...backfillEntries].filter((entry) => entry.legacyBaseline),
);
const legacyBaselineFiles = Object.freeze(
  [...new Set(legacyBaselineEntries.map((entry) => entry.legacyFile))],
);

const prismaMigrations = Object.freeze([
  "20260625094628_init_geosub_admin",
  "20260626022722_add_event_logs_and_daily_stats",
  "20260706093000_admin_review_performance",
  "20260706103000_review_history_indexes",
  "20260707120000_admin_asset_performance",
  "20260708080000_admin_collection_performance",
  "20260717160000_event_session_analytics_indexes",
  "20260718090000_admin_login_throttle",
  "20260730113000_search_opportunity_lifecycle",
  "20260730143000_search_opportunity_effect_window",
  "20260730170000_controlled_search_aliases",
  "20260801093000_search_conversion_repairs",
  "20260801143000_authority_coverage_tasks",
  "20260801183000_operations_notification_deliveries",
  "20260822100000_contact_tickets",
  "20260823100000_big_mac_benchmarks",
]);
const prismaBaselineMigrations = Object.freeze(prismaMigrations.slice(0, 2));

function normalizePath(value) {
  return value.split(path.sep).join("/");
}

function entriesForMode(mode) {
  if (mode === "schema" || mode === "core") return [...activeSchemaEntries];
  if (mode === "complete-schema") return [...schemaEntries];
  if (mode === "post-cutover") return [...postCutoverSchemaEntries];
  if (mode === "backfill" || mode === "content") return [...backfillEntries];
  if (mode === "all") return [...activeSchemaEntries, ...backfillEntries];
  if (mode === "baseline-schema") {
    return schemaEntries.filter((entry) => entry.legacyBaseline);
  }
  if (mode === "baseline-backfill") {
    return backfillEntries.filter((entry) => entry.legacyBaseline);
  }
  throw new Error(
    "Migration mode must be schema, complete-schema, post-cutover, backfill, all, baseline-schema or baseline-backfill.",
  );
}

function filesForMode(mode) {
  if (mode === "prisma") return [...prismaMigrations];
  return entriesForMode(mode).map((entry) => entry.file);
}

function entryForLegacyFile(legacyFile, mode = "schema") {
  const entries = mode === "schema" ? schemaEntries : entriesForMode(mode);
  return entries.find((entry) => entry.legacyFile === legacyFile) || null;
}

function assertSimpleIdentifier(value, context) {
  if (!/^[a-z][a-z0-9_]*$/.test(value)) {
    throw new Error(`Invalid ${context} compatibility identifier: ${value}`);
  }
}

function splitQualifiedIdentifier(value, context) {
  const parts = value.split(".");
  if (parts.length !== 2) {
    throw new Error(`Invalid ${context} compatibility identifier: ${value}`);
  }
  parts.forEach((part) => assertSimpleIdentifier(part, context));
  return parts;
}

function validateCompatibility(entry) {
  if (!entry.compatibility) return;
  const allowedKinds = new Set(["relations", "columns", "indexes", "constraints", "triggers"]);
  for (const [kind, values] of Object.entries(entry.compatibility)) {
    if (!allowedKinds.has(kind) || !Array.isArray(values) || values.length === 0) {
      throw new Error(`Invalid compatibility guard on ${entry.file}: ${kind}`);
    }
    for (const value of values) {
      if (kind === "relations" || kind === "indexes") {
        assertSimpleIdentifier(value, kind);
      } else {
        splitQualifiedIdentifier(value, kind);
      }
    }
  }
}

function sqlText(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

function compatibilitySqlForEntry(entry) {
  if (!entry.compatibility) return null;
  validateCompatibility(entry);
  const checks = [];

  for (const relation of entry.compatibility.relations || []) {
    checks.push(`to_regclass(${sqlText(`public.${relation}`)}) IS NOT NULL`);
  }
  for (const index of entry.compatibility.indexes || []) {
    checks.push(`to_regclass(${sqlText(`public.${index}`)}) IS NOT NULL`);
  }
  for (const value of entry.compatibility.columns || []) {
    const [table, column] = value.split(".");
    checks.push(
      `EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = ${sqlText(table)} AND column_name = ${sqlText(column)})`,
    );
  }
  for (const value of entry.compatibility.constraints || []) {
    const [table, constraint] = value.split(".");
    checks.push(
      `EXISTS (SELECT 1 FROM pg_constraint c JOIN pg_class r ON r.oid = c.conrelid JOIN pg_namespace n ON n.oid = r.relnamespace WHERE n.nspname = 'public' AND r.relname = ${sqlText(table)} AND c.conname = ${sqlText(constraint)})`,
    );
  }
  for (const value of entry.compatibility.triggers || []) {
    const [table, trigger] = value.split(".");
    checks.push(
      `EXISTS (SELECT 1 FROM pg_trigger t JOIN pg_class r ON r.oid = t.tgrelid JOIN pg_namespace n ON n.oid = r.relnamespace WHERE n.nspname = 'public' AND r.relname = ${sqlText(table)} AND t.tgname = ${sqlText(trigger)} AND NOT t.tgisinternal)`,
    );
  }

  return `SELECT (${checks.join(" AND ")}) AS compatible;`;
}

function sqlInventory() {
  const roots = [
    path.join(backendDir, "sql", "schema"),
    path.join(backendDir, "sql", "backfill"),
  ];
  const files = [];

  for (const root of roots) {
    const pending = [root];
    while (pending.length > 0) {
      const current = pending.pop();
      for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
        const absolute = path.join(current, entry.name);
        if (entry.isDirectory()) pending.push(absolute);
        if (entry.isFile() && entry.name.endsWith(".sql")) {
          files.push(normalizePath(path.relative(backendDir, absolute)));
        }
      }
    }
  }

  return files.sort();
}

function prismaInventory(frontendDir) {
  const migrationsDir = path.join(frontendDir, "prisma", "migrations");
  return fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function validateEntryGroup(entries, { kind, directory, automatic }) {
  entries.forEach((entry, index) => {
    const sequence = String(index + 1).padStart(3, "0");
    const expectedId = `${kind}:${sequence}`;
    const expectedPrefix = `${directory}/${sequence}_`;

    if (entry.id !== expectedId) {
      throw new Error(`${kind} migration sequence is not contiguous at ${entry.id}.`);
    }
    if (!entry.file.startsWith(expectedPrefix) || !entry.file.endsWith(".sql")) {
      throw new Error(`${kind} migration has a non-canonical path: ${entry.file}`);
    }
    if (!entry.legacyFile || path.isAbsolute(entry.legacyFile)) {
      throw new Error(`${kind} migration has an invalid legacy path: ${entry.file}`);
    }
    if (
      !Array.isArray(entry.legacyChecksums) ||
      entry.legacyChecksums.length === 0 ||
      entry.legacyChecksums.some((checksum) => !/^[a-f0-9]{64}$/.test(checksum))
    ) {
      throw new Error(`${kind} migration has invalid legacy checksums: ${entry.file}`);
    }
    if (automatic === false && entry.automatic !== false) {
      throw new Error(`Retired migration must declare automatic=false: ${entry.file}`);
    }
    if (
      kind === "schema" &&
      entry.releasePhase !== undefined &&
      entry.releasePhase !== "post-cutover"
    ) {
      throw new Error(`Invalid schema release phase on ${entry.file}: ${entry.releasePhase}`);
    }
    if (kind !== "schema" && entry.releasePhase !== undefined) {
      throw new Error(`Only schema migrations may declare releasePhase: ${entry.file}`);
    }
    validateCompatibility(entry);
  });
}

function validateRegistryAliases() {
  const filenames = new Set();
  for (const alias of registryAliases) {
    if (
      typeof alias.file !== "string" ||
      !alias.file.startsWith("sql/schema/") ||
      !alias.file.endsWith(".sql") ||
      filenames.has(alias.file)
    ) {
      throw new Error(`Invalid historical registry alias: ${alias.file}`);
    }
    if (
      !Array.isArray(alias.checksums) ||
      alias.checksums.length === 0 ||
      alias.checksums.some((checksum) => !/^[a-f0-9]{64}$/.test(checksum))
    ) {
      throw new Error(`Invalid historical registry alias checksum: ${alias.file}`);
    }
    filenames.add(alias.file);
  }
}

function validateManifest({ frontendDir } = {}) {
  if (layout.version !== 1) {
    throw new Error(`Unsupported migration layout version: ${layout.version}`);
  }

  validateEntryGroup(schemaEntries, {
    kind: "schema",
    directory: "sql/schema",
    automatic: true,
  });
  validateEntryGroup(backfillEntries, {
    kind: "backfill",
    directory: "sql/backfill",
    automatic: true,
  });
  validateEntryGroup(retiredEntries, {
    kind: "retired",
    directory: "sql/backfill/retired",
    automatic: false,
  });
  validateRegistryAliases();

  const allEntries = [...schemaEntries, ...backfillEntries, ...retiredEntries];
  const ids = allEntries.map((entry) => entry.id);
  const paths = allEntries.map((entry) => entry.file);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  const duplicatePaths = paths.filter((file, index) => paths.indexOf(file) !== index);
  if (duplicateIds.length > 0 || duplicatePaths.length > 0) {
    throw new Error(
      `Migration layout contains duplicates: ${[
        ...new Set([...duplicateIds, ...duplicatePaths]),
      ].join(", ")}`,
    );
  }

  for (const entry of allEntries) {
    if (path.isAbsolute(entry.file) || normalizePath(entry.file).startsWith("../")) {
      throw new Error(`Migration layout contains an unsafe path: ${entry.file}`);
    }
    if (!fs.existsSync(path.join(backendDir, ...entry.file.split("/")))) {
      throw new Error(`Migration layout references a missing file: ${entry.file}`);
    }
  }

  const inventory = sqlInventory();
  const unclassified = inventory.filter((file) => !paths.includes(file));
  const missingFromDisk = paths.filter((file) => !inventory.includes(file));
  if (unclassified.length > 0 || missingFromDisk.length > 0) {
    throw new Error(
      [
        unclassified.length > 0
          ? `Unclassified SQL migrations: ${unclassified.join(", ")}`
          : null,
        missingFromDisk.length > 0
          ? `Manifest SQL files missing from inventory: ${missingFromDisk.join(", ")}`
          : null,
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  const oldRootSql = fs
    .readdirSync(backendDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"));
  const oldFlatSql = fs
    .readdirSync(path.join(backendDir, "sql"), { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"));
  if (oldRootSql.length > 0 || oldFlatSql.length > 0) {
    throw new Error("SQL files must live under sql/schema or sql/backfill after B1.");
  }

  const legacyInventory = new Set(allEntries.map((entry) => entry.legacyFile));
  if (legacyInventory.size !== 98) {
    throw new Error(`Expected 98 classified legacy SQL files, found ${legacyInventory.size}.`);
  }
  if (!legacyInventory.has(baselineCutoverFile)) {
    throw new Error("The legacy baseline boundary is absent from the compatibility map.");
  }

  if (frontendDir) {
    const actualPrismaMigrations = prismaInventory(frontendDir);
    const unregisteredPrisma = actualPrismaMigrations.filter(
      (migration) => !prismaMigrations.includes(migration),
    );
    const missingPrisma = prismaMigrations.filter(
      (migration) => !actualPrismaMigrations.includes(migration),
    );
    if (unregisteredPrisma.length > 0 || missingPrisma.length > 0) {
      throw new Error(
        [
          unregisteredPrisma.length > 0
            ? `Unregistered Prisma migrations: ${unregisteredPrisma.join(", ")}`
            : null,
          missingPrisma.length > 0
            ? `Manifest Prisma migrations missing from disk: ${missingPrisma.join(", ")}`
            : null,
        ]
          .filter(Boolean)
          .join("\n"),
      );
    }
  }

  if (
    prismaBaselineMigrations.length !== 2 ||
    prismaBaselineMigrations.some(
      (migration, index) => migration !== prismaMigrations[index],
    )
  ) {
    throw new Error("Prisma baseline migrations must remain the first two migrations.");
  }

  return {
    schema: schemaEntries.length,
    activeSchema: activeSchemaEntries.length,
    postCutoverSchema: postCutoverSchemaEntries.length,
    backfill: backfillEntries.length,
    retired: retiredEntries.length,
    legacy: legacyInventory.size,
    prisma: prismaMigrations.length,
  };
}

function printEntries(mode) {
  for (const entry of entriesForMode(mode)) {
    process.stdout.write(
      `${entry.file}\t${entry.legacyFile}\t${entry.legacyChecksums.join(",")}\t${
        entry.legacyBaseline ? "1" : "0"
      }\n`,
    );
  }
}

function runCli() {
  const command = process.argv[2] || "validate";
  const value = process.argv[3];
  const frontendDirArg = process.argv.find((argument) => argument.startsWith("--frontend-dir="));
  const frontendDir = frontendDirArg
    ? path.resolve(frontendDirArg.slice("--frontend-dir=".length))
    : undefined;

  if (command === "list") {
    validateManifest({ frontendDir });
    process.stdout.write(`${filesForMode(value || "schema").join("\n")}\n`);
    return;
  }

  if (command === "entries") {
    validateManifest({ frontendDir });
    printEntries(value || "schema");
    return;
  }

  if (command === "resolve") {
    validateManifest({ frontendDir });
    const kind = process.argv[4] || "schema";
    const entry = entryForLegacyFile(value, kind);
    if (!entry) throw new Error(`No ${kind} migration maps legacy file: ${value}`);
    process.stdout.write(`${entry.file}\n`);
    return;
  }

  if (command === "compatibility-sql") {
    validateManifest({ frontendDir });
    const entry = [...schemaEntries, ...backfillEntries].find(
      (candidate) => candidate.file === value,
    );
    if (!entry) throw new Error(`No active migration maps canonical file: ${value}`);
    process.stdout.write(compatibilitySqlForEntry(entry) || "");
    return;
  }

  if (command === "validate") {
    const summary = validateManifest({ frontendDir });
    console.log(
      `Migration manifest valid: schema=${summary.schema} active=${summary.activeSchema} post-cutover=${summary.postCutoverSchema} backfill=${summary.backfill} retired=${summary.retired} legacy=${summary.legacy} prisma=${summary.prisma}`,
    );
    return;
  }

  throw new Error(
    "Usage: migration-manifest.cjs [validate|list MODE|entries MODE|resolve LEGACY_FILE MODE|compatibility-sql FILE] [--frontend-dir=PATH]",
  );
}

if (require.main === module) {
  try {
    runCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

module.exports = {
  activeSchemaEntries,
  backendDir,
  backfillEntries,
  backfillFiles,
  baselineCutoverFile,
  contentFiles,
  compatibilitySqlForEntry,
  coreFiles,
  entriesForMode,
  entryForLegacyFile,
  filesForMode,
  layoutPath,
  legacyBaselineEntries,
  legacyBaselineFiles,
  prismaMigrations,
  prismaBaselineMigrations,
  postCutoverSchemaEntries,
  registryAliases,
  retiredEntries,
  retiredFiles,
  schemaEntries,
  schemaFiles,
  validateManifest,
};

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

type MigrationEntry = {
  file: string;
  legacyFile: string;
  legacyChecksums: string[];
};

type MigrationLayout = {
  schema: MigrationEntry[];
  backfill: MigrationEntry[];
  retired: MigrationEntry[];
};

const helperDir = dirname(fileURLToPath(import.meta.url));
export const frontendDir = resolve(helperDir, "..");
export const repoDir = resolve(frontendDir, "..");
export const migrationLayout = JSON.parse(
  readFileSync(
    resolve(repoDir, "geosub-backend", "sql", "migration-layout.json"),
    "utf8",
  ),
) as MigrationLayout;

export function migrationEntriesForLegacyFile(legacyFile: string) {
  return [
    ...migrationLayout.schema,
    ...migrationLayout.backfill,
    ...migrationLayout.retired,
  ].filter((entry) => entry.legacyFile === legacyFile);
}

export function readSqlMigration(legacyFile: string) {
  const entries = migrationEntriesForLegacyFile(legacyFile);
  if (entries.length === 0) {
    throw new Error(`No canonical SQL migration maps legacy file: ${legacyFile}`);
  }
  return entries
    .map((entry) =>
      readFileSync(resolve(repoDir, "geosub-backend", ...entry.file.split("/")), "utf8"),
    )
    .join("\n");
}

import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { createRequire } from "node:module";
import { assertGrowthLocalDatabase } from "../lib/growth-search-evidence.ts";
import { canonicalGrowthHash } from "../lib/growth-intelligence.ts";
import { SEO_SEARCH_PAGE_IMPORT_SETTING_KEY } from "../lib/seo-search-observation-import.ts";

const { values } = parseArgs({ options: { backup: { type: "string" }, "apply-local": { type: "boolean" } } });
if (!values.backup || !values["apply-local"]) throw new Error("Use --backup private-backup.json --apply-local. Roll back in reverse import order.");
const url = assertGrowthLocalDatabase(process.env.DATABASE_URL);
const backup = JSON.parse(await readFile(values.backup, "utf8"));
if (backup.schemaVersion !== "growth-local-import-backup.v1" || backup.settingKey !== SEO_SEARCH_PAGE_IMPORT_SETTING_KEY
  || backup.database !== url.pathname.slice(1) || typeof backup.existed !== "boolean" || !(backup.before === null || typeof backup.before === "string")
  || canonicalGrowthHash(backup.before) !== backup.beforeHash || !/^sha256:[a-f0-9]{64}$/.test(backup.afterHash)) {
  throw new Error("Invalid rollback backup or target database.");
}
const { Client } = createRequire(import.meta.url)("pg");
const db = new Client({ connectionString: process.env.DATABASE_URL, application_name: "geosub-local-growth-rollback", connectionTimeoutMillis: 5000 });
await db.connect();
try {
  await db.query("BEGIN");
  await db.query("SELECT pg_advisory_xact_lock(hashtext($1))", [SEO_SEARCH_PAGE_IMPORT_SETTING_KEY]);
  const result = await db.query("SELECT value_text FROM site_settings WHERE setting_key=$1 FOR UPDATE", [SEO_SEARCH_PAGE_IMPORT_SETTING_KEY]);
  if (!result.rows.length || canonicalGrowthHash(JSON.parse(result.rows[0].value_text)) !== backup.afterHash) {
    throw new Error("Current state differs from this import; refusing to overwrite subsequent edits.");
  }
  if (!backup.existed) await db.query("DELETE FROM site_settings WHERE setting_key=$1", [SEO_SEARCH_PAGE_IMPORT_SETTING_KEY]);
  else await db.query("UPDATE site_settings SET value_text=$1, updated_at=NOW() WHERE setting_key=$2", [backup.before, SEO_SEARCH_PAGE_IMPORT_SETTING_KEY]);
  await db.query("COMMIT");
  console.log(JSON.stringify({ mode: "rolled_back_local" }));
} catch (error) { await db.query("ROLLBACK"); throw error; }
finally { await db.end(); }

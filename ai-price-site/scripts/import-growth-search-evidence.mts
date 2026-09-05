import { readFile, writeFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { createRequire } from "node:module";
import { randomUUID } from "node:crypto";
import { assertGrowthLocalDatabase, growthSearchImportBatch, validateGrowthSearchEvidence } from "../lib/growth-search-evidence.ts";
import { canonicalGrowthHash } from "../lib/growth-intelligence.ts";
import { appendSeoSearchPageImportBatch, parseSeoSearchPageImportState, SEO_SEARCH_PAGE_IMPORT_SETTING_KEY } from "../lib/seo-search-observation-import.ts";

const { values } = parseArgs({ options: { input: { type: "string" }, "apply-local": { type: "boolean" }, "rollback-out": { type: "string" } } });
if (!values.input) throw new Error("Use --input evidence.json [--apply-local --rollback-out private-backup.json]. Default: validate only.");
const raw = await readFile(values.input, "utf8");
if (Buffer.byteLength(raw) > 1024 * 1024) throw new Error("Evidence file is too large.");
const evidence = validateGrowthSearchEvidence(JSON.parse(raw));
const batch = growthSearchImportBatch(evidence);
if (!values["apply-local"]) {
  console.log(JSON.stringify({ mode: "validated_only", engine: evidence.engine, evidenceHash: canonicalGrowthHash(evidence), exactPageRows: batch.observations.length, evidence: batch.evidence }));
} else {
  assertGrowthLocalDatabase(process.env.DATABASE_URL);
  if (!values["rollback-out"]) throw new Error("--rollback-out is required before a local import.");
  const { Client } = createRequire(import.meta.url)("pg");
  const db = new Client({ connectionString: process.env.DATABASE_URL, application_name: "geosub-local-growth-import", connectionTimeoutMillis: 5000 });
  await db.connect();
  try {
    await db.query("BEGIN");
    await db.query("SELECT pg_advisory_xact_lock(hashtext($1))", [SEO_SEARCH_PAGE_IMPORT_SETTING_KEY]);
    const result = await db.query("SELECT value_text FROM site_settings WHERE setting_key=$1 FOR UPDATE", [SEO_SEARCH_PAGE_IMPORT_SETTING_KEY]);
    const before = result.rows[0]?.value_text ?? null;
    const state = parseSeoSearchPageImportState(before);
    // Refuse silently repairing a corrupt or unrecognized saved state.
    if (before !== null && canonicalGrowthHash(JSON.parse(before)) !== canonicalGrowthHash(state)) throw new Error("Existing import state needs review; nothing was changed.");
    const next = appendSeoSearchPageImportBatch(state, batch);
    if (canonicalGrowthHash(next) === canonicalGrowthHash(state)) {
      await db.query("ROLLBACK");
      console.log(JSON.stringify({ mode: "unchanged", batchId: batch.id }));
    } else {
      await writeFile(values["rollback-out"], JSON.stringify({ schemaVersion: "growth-local-import-backup.v1", settingKey: SEO_SEARCH_PAGE_IMPORT_SETTING_KEY,
        database: assertGrowthLocalDatabase(process.env.DATABASE_URL).pathname.slice(1), createdAt: new Date().toISOString(),
        existed: result.rows.length > 0, before, beforeHash: canonicalGrowthHash(before), afterHash: canonicalGrowthHash(next) }, null, 2) + "\n", { flag: "wx", mode: 0o600 });
      await db.query(`INSERT INTO site_settings (id, setting_key, group_name, label, value_text, is_public, created_at, updated_at)
        VALUES ($1,$2,'seo','Search page observations',$3,false,NOW(),NOW())
        ON CONFLICT (setting_key) DO UPDATE SET value_text=EXCLUDED.value_text, updated_at=NOW()`,
      [randomUUID(), SEO_SEARCH_PAGE_IMPORT_SETTING_KEY, JSON.stringify(next)]);
      await db.query("COMMIT");
      console.log(JSON.stringify({ mode: "imported_local", batchId: batch.id, exactPageRows: batch.observations.length }));
    }
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally { await db.end(); }
}

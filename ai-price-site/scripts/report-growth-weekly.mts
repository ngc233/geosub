import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createRequire } from "node:module";
import { parseArgs } from "node:util";
import { assertGrowthLocalDatabase, growthDateOffset, growthIsoDate } from "../lib/growth-search-evidence.ts";
import { buildGrowthWeeklyReadout, renderGrowthWeeklyMarkdown, type GrowthFirstPartyEvidence } from "../lib/growth-weekly-readout.ts";
import { bingShadowSnapshotToGrowthEvidence } from "../lib/growth-bing-shadow-evidence.ts";
import { googleShadowSnapshotToGrowthEvidence } from "../lib/growth-google-shadow-evidence.ts";
import { activeSeoExperimentLocks } from "../lib/seo-experiment-locks.ts";

const { values } = parseArgs({ options: { evidence: { type: "string", multiple: true }, end: { type: "string" }, out: { type: "string" },
  "bing-shadow": { type: "string" }, "google-shadow": { type: "string" }, "snapshot-at": { type: "string" }, "first-party": { type: "string" }, "generated-at": { type: "string" } } });
const evidencePaths = values.evidence || [];
if ((!evidencePaths.length && !values["bing-shadow"] && !values["google-shadow"]) || !values.end || !values.out) throw new Error("Use --evidence google.json [--evidence bing.json] [--bing-shadow snapshot.json] [--google-shadow snapshot.json] --end YYYY-MM-DD --out NEW_DIRECTORY (--snapshot-at UTC_TIMESTAMP | --first-party saved.json).");
const endDate = growthIsoDate(values.end);
const generatedAt = values["generated-at"] || new Date().toISOString();
const evidence = await Promise.all(evidencePaths.map(async (path) => JSON.parse(await readFile(path, "utf8"))));
if (values["bing-shadow"]) evidence.push(bingShadowSnapshotToGrowthEvidence(JSON.parse(await readFile(values["bing-shadow"], "utf8"))));
if (values["google-shadow"]) evidence.push(googleShadowSnapshotToGrowthEvidence(JSON.parse(await readFile(values["google-shadow"], "utf8"))));
let firstParty: GrowthFirstPartyEvidence;
if (values["first-party"]) {
  firstParty = JSON.parse(await readFile(values["first-party"], "utf8"));
} else {
  assertGrowthLocalDatabase(process.env.DATABASE_URL);
  if (!values["snapshot-at"] || !Number.isFinite(Date.parse(values["snapshot-at"]))) throw new Error("Restored databases require their real --snapshot-at cutoff.");
  const { Client } = createRequire(import.meta.url)("pg");
  const db = new Client({ connectionString: process.env.DATABASE_URL, application_name: "geosub-growth-weekly-readonly", connectionTimeoutMillis: 5000 });
  await db.connect();
  try {
    await db.query("BEGIN READ ONLY");
    const result = await db.query(`SELECT stat_date::text AS date, metric_value AS value FROM daily_stats
      WHERE metric_key='cookieless_page_views' AND dimension_type='global' AND dimension_key='global'
      AND stat_date BETWEEN $1::date AND $2::date ORDER BY stat_date`, [growthDateOffset(endDate, -13), endDate]);
    firstParty = { metric: "cookieless_page_views", sourceTimezone: "UTC", databaseSnapshotAt: values["snapshot-at"],
      collectedAt: generatedAt, days: result.rows };
    await db.query("COMMIT");
  } finally { await db.end(); }
}
const report = buildGrowthWeeklyReadout({ evidence, firstParty, endDate, generatedAt,
  experimentLocks: activeSeoExperimentLocks.map((lock) => ({ experimentId: lock.experimentId, active: true,
    target: { canonicalPath: lock.canonicalPath }, lockedFields: [...lock.lockedFields], earliestDecisionDate: lock.earliestSettledThrough })) });
// New directory only: keep earlier reports and their evidence immutable.
await mkdir(values.out, { mode: 0o700 });
await writeFile(join(values.out, "first-party-evidence.json"), JSON.stringify(firstParty, null, 2) + "\n", { mode: 0o600 });
await writeFile(join(values.out, "weekly.json"), JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
await writeFile(join(values.out, "weekly.md"), renderGrowthWeeklyMarkdown(report));
console.log(JSON.stringify({ reportHash: report.reportHash, status: report.status, comparisonReady: report.comparisonReady,
  actionable: report.actionable, metrics: report.metrics }));

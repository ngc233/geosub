#!/usr/bin/env node
/**
 * Read-only audit of plan name drift (product-plan-specs.json vs DB plans.name),
 * review-status plans, and recurring unmatched App Store IAP candidates recorded
 * in collector_job_runs.raw_payload.
 *
 * Pass --sync-names to generate (or with --apply, execute) SQL updating drifted plans.name.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, "..");
export const defaultPlanSpecsPath = path.join(backendDir, "data", "product-plan-specs.json");

export function findPlanNameDrift(planSpecs, dbPlans) {
  const drifts = [];
  for (const row of dbPlans) {
    const spec = planSpecs?.[row.product_slug];
    if (!spec || !Array.isArray(spec.plans)) continue;
    const specPlan = spec.plans.find((p) => p.slug === row.plan_slug);
    if (!specPlan || !specPlan.name) continue;
    if (String(row.plan_name || "").trim() !== String(specPlan.name).trim()) {
      drifts.push({
        product_slug: row.product_slug,
        plan_slug: row.plan_slug,
        db_name: row.plan_name,
        spec_name: specPlan.name,
        status: row.status,
      });
    }
  }
  return drifts.sort((a, b) => a.product_slug.localeCompare(b.product_slug) || a.plan_slug.localeCompare(b.plan_slug));
}

export function aggregateUnmatchedCandidates(runRows, minCountries = 2) {
  const byProductItem = new Map();
  for (const row of runRows) {
    const candidates = row.unmatched_plan_candidates;
    if (!Array.isArray(candidates)) continue;
    for (const item of candidates) {
      const name = String(item?.name || "").trim();
      if (!name) continue;
      const key = `${row.product_slug}::${name.toLowerCase()}`;
      let entry = byProductItem.get(key);
      if (!entry) {
        entry = {
          product_slug: row.product_slug,
          name,
          countries: new Set(),
          sample_price: String(item.sample_price || ""),
          seen_runs: 0,
        };
        byProductItem.set(key, entry);
      }
      entry.seen_runs += 1;
      for (const c of item.countries || []) entry.countries.add(String(c).toUpperCase());
    }
  }
  return [...byProductItem.values()]
    .filter((e) => e.countries.size >= minCountries)
    .sort((a, b) => b.countries.size - a.countries.size || a.product_slug.localeCompare(b.product_slug) || a.name.localeCompare(b.name))
    .map((e) => ({
      product_slug: e.product_slug,
      name: e.name,
      country_count: e.countries.size,
      countries: [...e.countries].sort(),
      sample_price: e.sample_price,
      seen_runs: e.seen_runs,
    }));
}

async function main() {
  const args = process.argv.slice(2);
  const days = args.includes("--days") ? Math.max(1, Number(args[args.indexOf("--days") + 1]) || 14) : 14;
  const minCountries = args.includes("--min-countries") ? Math.max(1, Number(args[args.indexOf("--min-countries") + 1]) || 2) : 2;
  const planSpecs = JSON.parse(fs.readFileSync(defaultPlanSpecsPath, "utf8"));
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error("DATABASE_URL is required to run audit-plan-drift.mjs.");
  }

  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: dbUrl });
  await client.connect();
  try {
    const plansRes = await client.query(`
      SELECT p.slug AS product_slug, pl.slug AS plan_slug, pl.name AS plan_name, pl.status::text AS status
      FROM products p
      JOIN plans pl ON pl.product_id = p.id
      WHERE p.status = 'published' AND pl.status <> 'archived'
      ORDER BY p.slug, pl.sort_order, pl.slug
    `);
    const runsRes = await client.query(
      `SELECT p.slug AS product_slug,
              COALESCE(r.raw_payload -> 'collector_payload' -> 'unmatched_plan_candidates', r.raw_payload -> 'unmatched_plan_candidates') AS unmatched_plan_candidates
       FROM collector_job_runs r
       JOIN products p ON p.id = r.product_id
       WHERE r.started_at > NOW() - ($1::int || ' days')::interval
         AND r.collector_kind = 'app_store'
         AND (
           r.raw_payload -> 'collector_payload' ? 'unmatched_plan_candidates'
           OR r.raw_payload ? 'unmatched_plan_candidates'
         )`,
      [days],
    );

    const report = {
      audited_at: new Date().toISOString(),
      window_days: days,
      name_drifts: findPlanNameDrift(planSpecs, plansRes.rows),
      review_plans: plansRes.rows.filter((r) => r.status === "review"),
      unmatched_candidates: aggregateUnmatchedCandidates(runsRes.rows, minCountries),
    };
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await client.end().catch(() => {});
  }
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  });
}

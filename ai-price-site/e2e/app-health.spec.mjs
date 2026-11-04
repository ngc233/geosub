import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { Client } = require("pg");
const { assertSafeE2eDatabase } = require("../scripts/e2e-environment.cjs");
const fixture = require("../scripts/e2e-fixture.cjs");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

async function readHealth(request) {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(response.headers()["x-robots-tag"]).toBe("noindex, nofollow");
  const body = await response.json();
  expect(Object.keys(body).sort()).toEqual(["status", "version", "commit", "checks", "data", "checkedAt", "durationMs"].sort());
  expect(Object.keys(body.checks).sort()).toEqual(["process", "database", "catalog", "exchangeRates"].sort());
  expect(Object.keys(body.data).sort()).toEqual(["lastSuccessfulCollectionAt", "pricesNotCheckedOver3Days"].sort());
  expect(JSON.stringify(body)).not.toMatch(/publishedProducts|publishedPrices|activeExchangeRates|DATABASE_URL|postgres(?:ql)?:|localhost|127\.0\.0\.1|stack|password|token|secret/i);
  return body;
}

test("built health endpoint reports exact public build identity and the response allowlist", async ({ request }) => {
  const body = await readHealth(request);
  expect(body.version).toBe(readFileSync(resolve(root, "VERSION"), "utf8").trim());
  expect(body.commit).toBe(execFileSync("git", ["-C", root, "rev-parse", "HEAD"], { encoding: "utf8" }).trim());
  expect(body.commit).toMatch(/^[a-f0-9]{40}$/);
  expect(body.checks.database).toBe("ok");
  expect(Number.isSafeInteger(body.data.pricesNotCheckedOver3Days)).toBe(true);
  console.log("T07 built health response:", JSON.stringify(body));
});

test("SQL observations count unchecked published prices and only successful completion times without changing health", async ({ request }) => {
  // This guard rejects production/non-local targets before opening a connection.
  assertSafeE2eDatabase(process.env.DATABASE_URL);
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  const jobId = randomUUID();
  let original;
  try {
    original = (await db.query("SELECT last_checked_at FROM region_prices WHERE id=$1", [fixture.regionPriceId])).rows[0];
    expect(original).toBeDefined();
    const baseline = await readHealth(request);
    await db.query("INSERT INTO collector_jobs(id,job_type,status) VALUES($1,'other','paused')", [jobId]);
    await db.query(`INSERT INTO collector_job_runs(job_id,status,started_at,finished_at,error_message,output_excerpt)
      VALUES ($1,'succeeded',NOW()-INTERVAL '73 hours',NOW()-INTERVAL '72 hours',NULL,'private-success-output'),
             ($1,'failed',NOW()-INTERVAL '1 hour',NOW(),'private-error-stack','private-failed-output')`, [jobId]);
    for (const age of [null, "4 days", "71 hours"]) {
      await db.query("UPDATE region_prices SET last_checked_at=CASE WHEN $2::text IS NULL THEN NULL ELSE NOW()-$2::interval END WHERE id=$1", [fixture.regionPriceId, age]);
      const expected = (await db.query(`SELECT
        (SELECT MAX(finished_at) FROM collector_job_runs WHERE status='succeeded') AS latest,
        (SELECT COUNT(*)::int FROM region_prices WHERE status='published'
          AND (last_checked_at IS NULL OR last_checked_at<NOW()-INTERVAL '72 hours')) AS stale`)).rows[0];
      const body = await readHealth(request);
      expect(body.data).toEqual({ lastSuccessfulCollectionAt: expected.latest?.toISOString() ?? null, pricesNotCheckedOver3Days: expected.stale });
      expect(body.status).toBe(baseline.status);
      expect(body.checks).toEqual(baseline.checks);
      expect(JSON.stringify(body)).not.toContain("private-");
    }
  } finally {
    try {
      if (original) await db.query("UPDATE region_prices SET last_checked_at=$2 WHERE id=$1", [fixture.regionPriceId, original.last_checked_at]);
      await db.query("DELETE FROM collector_jobs WHERE id=$1", [jobId]);
    } finally { await db.end(); }
  }
});

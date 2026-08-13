import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  compareExchangeRateShadow,
  createRecordedProviderFetch,
  summarizeExchangeRateShadowEvidence,
} from "./exchange-rate-shadow-core.mjs";
import { verifyExchangeRateShadow } from "./verify-exchange-rate-shadow.mjs";
import { checkExchangeRateShadowEvidence } from "./check-exchange-rate-shadow-evidence.mjs";

function expectedRun(overrides = {}) {
  return { status: "succeeded", rowCount: 2, ...overrides };
}

function expectedRows() {
  return [
    {
      quote_currency: "CNY",
      rate: "7.15",
      rate_date: "2026-08-11",
      source: "frankfurter",
      provider_payload: { date: "2026-08-11", rates: { CNY: 7.15 } },
    },
    {
      quote_currency: "JPY",
      rate: "148",
      rate_date: "2026-08-12",
      source: "open-er-api",
      provider_payload: {
        time_last_update_utc: "Wed, 12 Aug 2026 00:00:01 +0000",
        rates: { JPY: 148 },
      },
    },
  ];
}

function shadowPlan(rows = null) {
  return {
    status: "succeeded",
    rows:
      rows ||
      [
        {
          quote: "CNY",
          rate: 7.15,
          rateDate: "2026-08-11",
          source: "frankfurter",
        },
        {
          quote: "JPY",
          rate: 148,
          rateDate: "2026-08-12",
          source: "open-er-api",
        },
      ],
  };
}

test("matching legacy rows produce passing shadow evidence", () => {
  const result = compareExchangeRateShadow({
    expectedRun: expectedRun(),
    expectedRows: expectedRows(),
    shadowPlan: shadowPlan(),
  });

  assert.equal(result.passed, true);
  assert.deepEqual(result.mismatches, []);
});

test("rate drift is explicit and fails the shadow gate", () => {
  const plan = shadowPlan();
  plan.rows[0].rate = 7.25;
  const result = compareExchangeRateShadow({
    expectedRun: expectedRun(),
    expectedRows: expectedRows(),
    shadowPlan: plan,
  });

  assert.equal(result.passed, false);
  assert.deepEqual(result.mismatches[0], {
    kind: "rate",
    quote: "CNY",
    expected: 7.15,
    actual: 7.25,
  });
});

test("source and rate-date changes cannot silently pass", () => {
  const plan = shadowPlan();
  plan.rows[1].source = "frankfurter";
  plan.rows[1].rateDate = "2026-08-11";
  const result = compareExchangeRateShadow({
    expectedRun: expectedRun(),
    expectedRows: expectedRows(),
    shadowPlan: plan,
  });

  assert.equal(result.passed, false);
  assert.deepEqual(
    result.mismatches.map((mismatch) => mismatch.kind),
    ["rate-date", "source"],
  );
});

test("PostgreSQL DATE objects compare as canonical calendar dates", () => {
  const rows = expectedRows();
  rows[0].rate_date = new Date("2026-08-11T00:00:00.000Z");
  const result = compareExchangeRateShadow({
    expectedRun: expectedRun(),
    expectedRows: rows,
    shadowPlan: shadowPlan(),
  });

  assert.equal(result.passed, true);
  assert.deepEqual(result.mismatches, []);
});

test("missing and unexpected quotes are both reported", () => {
  const result = compareExchangeRateShadow({
    expectedRun: expectedRun(),
    expectedRows: expectedRows(),
    shadowPlan: shadowPlan([
      {
        quote: "CNY",
        rate: 7.15,
        rateDate: "2026-08-11",
        source: "frankfurter",
      },
      {
        quote: "EUR",
        rate: 0.86,
        rateDate: "2026-08-11",
        source: "frankfurter",
      },
    ]),
  });

  assert.equal(result.passed, false);
  assert.deepEqual(
    result.mismatches.map((mismatch) => [mismatch.kind, mismatch.quote]),
    [
      ["missing-in-shadow", "JPY"],
      ["unexpected-in-shadow", "EUR"],
    ],
  );
});

test("recorded provider payloads replay without external requests", async () => {
  const fetchJson = createRecordedProviderFetch(expectedRows());
  assert.deepEqual(await fetchJson("unused", "frankfurter"), {
    date: "2026-08-11",
    rates: { CNY: 7.15 },
  });
  assert.deepEqual(await fetchJson("unused", "open-er-api"), {
    time_last_update_utc: "Wed, 12 Aug 2026 00:00:01 +0000",
    rates: { JPY: 148 },
  });
  await assert.rejects(fetchJson("unused", "unknown"), /no unknown provider payload/);
});

test("server shadow verification is database read-only", async () => {
  const queries = [];
  const client = {
    async query(sql) {
      queries.push(sql);
      if (/FROM exchange_rate_sync_runs/.test(sql)) {
        return {
          rows: [
            {
              id: "11111111-1111-1111-1111-111111111111",
              provider: "frankfurter",
              base_currency: "USD",
              quote_currencies: ["CNY", "JPY"],
              status: "succeeded",
              row_count: 2,
              started_at: "2026-08-12T00:00:00.000Z",
              completed_at: "2026-08-12T00:00:05.000Z",
            },
          ],
        };
      }
      if (/FROM exchange_rates/.test(sql)) return { rows: expectedRows() };
      throw new Error(`Unexpected SQL: ${sql}`);
    },
  };

  const result = await verifyExchangeRateShadow({
    client,
    writeEvidence: false,
    evidenceDir: "unused",
    now: new Date("2026-08-12T00:01:00.000Z"),
  });

  assert.equal(result.evidence.comparison.passed, true);
  assert.equal(queries.length, 2);
  assert.ok(queries.every((sql) => /^\s*SELECT\b/i.test(sql)));
  assert.ok(queries.every((sql) => !/\b(?:INSERT|UPDATE|DELETE)\b/i.test(sql)));
  assert.match(queries[1], /rate_date::text AS rate_date/);
});

function evidence(runId, checkedAt, passed = true) {
  return {
    version: 1,
    legacyRunId: runId,
    checkedAt,
    comparison: { passed },
  };
}

test("three distinct successful legacy cycles open the shadow gate", () => {
  const summary = summarizeExchangeRateShadowEvidence({
    entries: [
      evidence("run-1", "2026-08-12T00:00:00.000Z"),
      evidence("run-2", "2026-08-12T12:00:00.000Z"),
      evidence("run-3", "2026-08-13T00:00:00.000Z"),
    ],
  });

  assert.equal(summary.ready, true);
  assert.equal(summary.consecutivePassed, 3);
  assert.equal(summary.remainingCycles, 0);
});

test("rechecking one legacy run does not manufacture extra cycles", () => {
  const summary = summarizeExchangeRateShadowEvidence({
    entries: [
      evidence("run-1", "2026-08-12T00:00:00.000Z"),
      evidence("run-1", "2026-08-12T00:05:00.000Z"),
      evidence("run-2", "2026-08-12T12:00:00.000Z"),
    ],
  });

  assert.equal(summary.ready, false);
  assert.equal(summary.attemptCount, 3);
  assert.equal(summary.distinctRunCount, 2);
  assert.equal(summary.consecutivePassed, 2);
  assert.equal(summary.remainingCycles, 1);
});

test("the latest failed cycle resets consecutive shadow progress", () => {
  const summary = summarizeExchangeRateShadowEvidence({
    entries: [
      evidence("run-1", "2026-08-12T00:00:00.000Z"),
      evidence("run-2", "2026-08-12T12:00:00.000Z"),
      evidence("run-3", "2026-08-13T00:00:00.000Z", false),
    ],
  });

  assert.equal(summary.ready, false);
  assert.equal(summary.consecutivePassed, 0);
  assert.equal(summary.remainingCycles, 3);
  assert.equal(summary.latestPassed, false);
});

test("evidence reader accepts a UTF-8 BOM without losing the first cycle", async () => {
  const evidenceDir = await mkdtemp(path.join(os.tmpdir(), "geosub-shadow-evidence-"));
  await writeFile(
    path.join(evidenceDir, "2026-08-13.jsonl"),
    `\uFEFF${JSON.stringify(evidence("run-1", "2026-08-12T00:00:00.000Z"))}\n` +
      `${JSON.stringify(evidence("run-2", "2026-08-12T12:00:00.000Z"))}\n` +
      `${JSON.stringify(evidence("run-3", "2026-08-13T00:00:00.000Z"))}\n`,
    "utf8",
  );

  const summary = await checkExchangeRateShadowEvidence({ evidenceDir });
  assert.equal(summary.ready, true);
  assert.equal(summary.distinctRunCount, 3);
  assert.equal(summary.invalidLineCount, 0);
});

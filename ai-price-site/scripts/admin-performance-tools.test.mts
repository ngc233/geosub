import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const {
  parsePerformanceRecords,
  summarizePerformanceRecords,
} = require("./summarize-admin-performance.cjs");
const {
  flattenPlanNodes,
  summarizeExplainResult,
  validateReadOnlySql,
} = require("./explain-read-only-query.cjs");

test("performance log parser ignores unrelated and malformed journal lines", () => {
  const records = parsePerformanceRecords(`
systemd noise
[admin-performance] {"operation":"dashboard.analytics","durationMs":120,"status":"ok"}
prefix [admin-performance] {"operation":"dashboard.analytics","durationMs":980,"status":"error"}
[admin-performance] invalid json
[admin-performance] {"operation":"","durationMs":10,"status":"ok"}
`);

  assert.deepEqual(records, [
    { operation: "dashboard.analytics", durationMs: 120, status: "ok" },
    { operation: "dashboard.analytics", durationMs: 980, status: "error" },
  ]);
});

test("performance summary reports latency percentiles and errors", () => {
  const summaries = summarizePerformanceRecords(
    [
      { operation: "review.page-data", durationMs: 100, status: "ok" },
      { operation: "review.page-data", durationMs: 200, status: "ok" },
      { operation: "review.page-data", durationMs: 900, status: "error" },
      { operation: "admin.auth", durationMs: 20, status: "ok" },
    ],
    750,
  );

  assert.equal(summaries[0].operation, "review.page-data");
  assert.equal(summaries[0].count, 3);
  assert.equal(summaries[0].errorCount, 1);
  assert.equal(summaries[0].slowCount, 1);
  assert.equal(summaries[0].p50Ms, 200);
  assert.equal(summaries[0].p95Ms, 900);
});

test("read-only plan validator rejects writes and multiple statements", () => {
  assert.equal(
    validateReadOnlySql("-- dashboard\nSELECT * FROM products;"),
    "SELECT * FROM products",
  );
  assert.match(validateReadOnlySql("WITH rows AS (SELECT 1) SELECT * FROM rows"), /^WITH/);
  assert.throws(() => validateReadOnlySql("UPDATE products SET name = 'x'"));
  assert.throws(() =>
    validateReadOnlySql("WITH changed AS (DELETE FROM products RETURNING *) SELECT * FROM changed"),
  );
  assert.throws(() => validateReadOnlySql("SELECT 1; SELECT 2"));
  assert.throws(() => validateReadOnlySql("SELECT * FROM products FOR UPDATE"));
});

test("query plan summary flattens nested nodes without including SQL text", () => {
  const document = {
    "Planning Time": 1.2,
    "Execution Time": 4.5,
    Plan: {
      "Node Type": "Nested Loop",
      "Plan Rows": 10,
      Plans: [
        {
          "Node Type": "Index Scan",
          "Relation Name": "products",
          "Index Name": "products_slug_key",
          "Plan Rows": 1,
        },
      ],
    },
  };

  const nodes = flattenPlanNodes(document.Plan);
  assert.equal(nodes.length, 2);
  assert.equal(nodes[1].depth, 1);
  assert.equal(nodes[1].index, "products_slug_key");
  assert.deepEqual(summarizeExplainResult(document), {
    planningTimeMs: 1.2,
    executionTimeMs: 4.5,
    nodes,
  });
});

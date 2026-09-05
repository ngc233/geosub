import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as aggregate from "../lib/aggregate-page-views.ts";
import * as measurement from "../lib/page-view-measurement.ts";

const require = createRequire(import.meta.url);
const { NextRequest, NextResponse } = require("next/server") as typeof import("next/server");
type Write = { create: { metricKey: string; dimensionType: string; dimensionKey: string; metadata: Record<string, unknown> }; update: { metricValue: { increment: number } } };

function handler() {
  const transactions: Write[][] = [];
  const loadedModule = { exports: {} as { POST: (request: InstanceType<typeof NextRequest>) => Promise<Response> } };
  const code = ts.transpileModule(readFileSync(new URL("./api/page-views/route.ts", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(code, { module: loadedModule, exports: loadedModule.exports, URL, Date, TextEncoder,
    require: (name: string) => {
      if (name === "next/server") return { NextRequest, NextResponse };
      if (name.endsWith("/aggregate-page-views")) return aggregate;
      if (name.endsWith("/page-view-measurement")) return measurement;
      if (name.endsWith("/prisma")) return { prisma: {
        dailyStat: { upsert: (write: Write) => write },
        $transaction: async (writes: Write[]) => { transactions.push(writes); },
      } };
      throw new Error(`Unexpected import ${name}`);
    },
  });
  return { POST: loadedModule.exports.POST, transactions };
}
function request(payload: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("https://geosub.org/api/page-views", { method: "POST", headers: {
    origin: "https://geosub.org", host: "geosub.org", "sec-fetch-site": "same-origin",
    referer: "https://geosub.org/en/ai-pricing/claude/pro", "content-type": "application/json", ...headers,
  }, body: JSON.stringify(payload) });
}
const path = "/en/ai-pricing/claude/pro";
for (const population of ["eligible", "internal", "automation", "unclassified"] as const) {
  test(`real POST keeps legacy PV and atomically writes only ${population} v2 counters`, async () => {
    const h = handler(); const response = await h.POST(request({ pagePath: path, measurementVersion: measurement.PAGE_VIEW_MEASUREMENT_VERSION, population, account: "must-not-be-stored" }));
    assert.equal(response.status, 204); assert.equal(h.transactions.length, 1);
    const writes = h.transactions[0]; assert.equal(writes.length, 4);
    assert.deepEqual(Array.from(writes, (x) => x.create.metricKey), [aggregate.AGGREGATE_PAGE_VIEW_METRIC, aggregate.AGGREGATE_PAGE_VIEW_METRIC, measurement.PAGE_VIEW_POPULATION_METRICS[population], measurement.PAGE_VIEW_POPULATION_METRICS[population]]);
    for (let i = 0; i < writes.length; i += 2) {
      assert.equal(writes[i].create.dimensionKey, "global"); assert.equal(writes[i + 1].create.dimensionKey, path);
    }
    assert.ok(writes.every(x => x.update.metricValue.increment === 1));
    assert.doesNotMatch(JSON.stringify(writes), /must-not-be-stored|"account"|"cookie"|sessionId|ipAddress/);
  });
}
test("old cached clients are classified separately; explicit automation header overrides eligible", async () => {
  for (const [payload, headers, expected] of [
    [{ pagePath: path }, {}, "unclassified"],
    [{ pagePath: path, measurementVersion: measurement.PAGE_VIEW_MEASUREMENT_VERSION, population: "eligible" }, { "x-geosub-measurement-traffic": "automation" }, "automation"],
  ] as const) {
    const h = handler(); assert.equal((await h.POST(request(payload, headers))).status, 204);
    assert.equal(h.transactions[0][2].create.metricKey, measurement.PAGE_VIEW_POPULATION_METRICS[expected]);
  }
});
test("cross-origin, wrong referer and invalid public paths never write even with an acceptance marker", async () => {
  for (const [pagePath, headers] of [
    [path, { origin: "https://other.example", "sec-fetch-site": "cross-site" }],
    [path, { referer: "https://geosub.org/en/other" }],
    ["/admin", {}],
    ["/zh/tracking-test", {}],
  ] as const) {
    const h = handler(); assert.equal((await h.POST(request({ pagePath }, { ...headers, "x-geosub-measurement-traffic": "automation" }))).status, 400);
    assert.equal(h.transactions.length, 0);
  }
});
test("oversized requests write neither legacy nor population counters", async () => {
  const h = handler(); assert.equal((await h.POST(request({ pagePath: path, extra: "x".repeat(1100) }))).status, 413);
  assert.equal(h.transactions.length, 0);
});

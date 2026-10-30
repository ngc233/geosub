import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);

function loadRunner(spawnFailure = false, existing = false) {
  const queries: string[] = [];
  const invalidated: unknown[] = [];
  let spawns = 0;
  const compiledModule = { exports: {} as { queueAndRunAppStoreCollection: (slug: string) => Promise<unknown> } };
  const source = readFileSync(new URL("./collection-runner.ts", import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, {
    module: compiledModule, exports: compiledModule.exports, process,
    require(name: string) {
      if (name === "server-only") return {};
      if (name === "node:fs") return { existsSync: () => true };
      if (name === "node:child_process") return {
        spawn() {
          spawns++;
          if (spawnFailure) throw new Error("fixture spawn failed");
          return { pid: 123, once() {}, unref() {} };
        },
      };
      if (name === "@prisma/client") return { Prisma: { join: (values: string[]) => values.join(",") } };
      if (name === "next/cache") return { revalidatePath() {} };
      if (name.endsWith("/prisma")) return { prisma: {
        async $queryRaw(strings: TemplateStringsArray) {
          const sql = strings.join("?");
          queries.push(sql);
          if (sql.includes("app_store_job_count")) return [{ product_id: "product", app_store_job_count: 1 }];
          if (sql.includes("ranked_jobs")) return [{ job_id: "job" }];
          if (sql.includes("should_start")) return [{ run_id: "run", should_start: !existing }];
          return [];
        },
      } };
      if (name.endsWith("/public-pricing-cache-actions")) return {
        invalidatePublicPricing() { throw new Error("updateTag is only allowed in Server Actions"); },
        invalidatePublicPricingFromRoute: (slug: string) => invalidated.push(slug),
      };
      if (name.endsWith("/internal-collector-revalidation")) return { requestSuccessfulCollectorRevalidation() {} };
      if (name === "./collection-revalidation") return { getCollectionRevalidationPaths: () => ["/admin/review"] };
      return require(name);
    },
  });
  return { run: compiledModule.exports.queueAndRunAppStoreCollection, queries, invalidated, spawns: () => spawns };
}

test("POST collection remains acknowledged after starting a run outside a Server Action", async () => {
  const fixture = loadRunner();
  const result = await fixture.run("local-fixture");
  assert.equal(JSON.stringify(result), JSON.stringify({ queuedCount: 1, runStatus: "queued", runIds: ["run"] }));
  assert.deepEqual(fixture.invalidated, ["local-fixture"]);
  assert.equal(fixture.spawns(), 1);
  const metadata = fixture.queries.find(sql => sql.includes("'backend_root'"));
  assert.ok(metadata);
  assert.match(metadata, /'pid', \?::integer/);
  for (const field of ["backend_root", "runner_path", "command"]) {
    assert.match(metadata, new RegExp(`'${field}', \\?::text`));
  }
});

test("spawn failure records a typed terminal state instead of silently leaving a running row", async () => {
  const fixture = loadRunner(true);
  const result = await fixture.run("local-fixture");
  assert.equal(JSON.stringify(result), JSON.stringify({ queuedCount: 0, runStatus: "failed", runIds: [] }));
  assert.ok(fixture.queries.some(sql => /jsonb_build_object\('state', \?::text\)/.test(sql)));
  assert.deepEqual(fixture.invalidated, []);
});

test("an existing running record is reused without spawning another process", async () => {
  const fixture = loadRunner(false, true);
  await fixture.run("local-fixture");
  assert.equal(fixture.spawns(), 0);
});

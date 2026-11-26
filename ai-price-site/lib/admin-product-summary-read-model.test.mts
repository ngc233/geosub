import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import {
  parseRequestedSqlPage,
  resolveSqlPagination,
} from "./admin-product-summary-model.ts";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const { Prisma } = require("@prisma/client");

function loadReadModel() {
  const code = ts.transpileModule(
    readFileSync(
      new URL("./admin-product-summary-read-model.ts", import.meta.url),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;

  const queries: Array<{ sql: string; values: unknown[] }> = [];
  const adminPrismaStub = {
    $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const sql = strings.join("?");
      queries.push({ sql, values });
      if (sql.includes("AS total_all")) {
        return [
          {
            total_all: 250,
            exception_count: 15,
            pending_count: 85,
            not_started_count: 40,
            published_count: 110,
          },
        ];
      }
      if (sql.includes("WHERE operational_status <> 'published'")) {
        return [{ product_id: "closest-1", product_slug: "cursor", product_name: "Cursor" }];
      }
      return [
        {
          product_id: "p-141",
          product_slug: "product-141",
          product_name: "Product 141",
        },
      ];
    },
  };

  const mod = {
    exports: {} as {
      queryPipelineProductsPage: (params: {
        q: string;
        category: string;
        product: string;
        stage: "all" | "exception" | "pending" | "not_started" | "published";
        rawPage?: string | number;
        pageSize?: number;
      }) => Promise<{
        items: Array<{ product_id: string }>;
        totalAll: number;
        stageCounts: Record<string, number>;
        closestToPublish: { product_id: string } | null;
        pagination: { page: number; pageSize: number; total: number; totalPages: number; offset: number };
      }>;
    },
  };

  new Function("require", "module", "exports", code)(
    (name: string) => {
      if (name === "server-only") return {};
      if (name === "@prisma/client") return { Prisma };
      if (name === "./admin-product-scope") {
        return {
          officialWebEligibleJobSql: () => Prisma.sql`TRUE`,
          webPricingScopeJoinSql: () =>
            Prisma.sql`LEFT JOIN LATERAL (SELECT 'ios' AS billing_platform) pricing_scope ON TRUE`,
        };
      }
      if (name === "./prisma") return { adminPrisma: adminPrismaStub };
      if (name === "./admin-product-summary-model") {
        return { parseRequestedSqlPage, resolveSqlPagination };
      }
      return require(name);
    },
    mod,
    mod.exports,
  );

  return { mod: mod.exports, queries };
}

test("resolveSqlPagination supports catalogs well beyond 120 items without silent truncation", () => {
  assert.deepEqual(
    resolveSqlPagination({ rawPage: "15", total: 250, pageSize: 10 }),
    { page: 15, pageSize: 10, total: 250, totalPages: 25, offset: 140 },
  );
  assert.deepEqual(
    resolveSqlPagination({ rawPage: "999", total: 250, pageSize: 10 }),
    { page: 25, pageSize: 10, total: 250, totalPages: 25, offset: 240 },
  );
  assert.deepEqual(
    resolveSqlPagination({ rawPage: "-3", total: 250, pageSize: 10 }),
    { page: 1, pageSize: 10, total: 250, totalPages: 25, offset: 0 },
  );
  assert.deepEqual(
    resolveSqlPagination({ rawPage: "4", total: 0, pageSize: 10 }),
    { page: 1, pageSize: 10, total: 0, totalPages: 1, offset: 0 },
  );
});

test("queryPipelineProductsPage pushes LIMIT/OFFSET to SQL on adminPrisma with no LIMIT 120 cap", async () => {
  const { mod, queries } = loadReadModel();
  const result = await mod.queryPipelineProductsPage({
    q: "",
    category: "all",
    product: "",
    stage: "all",
    rawPage: "15",
    pageSize: 10,
  });

  assert.equal(result.totalAll, 250);
  assert.equal(result.stageCounts.published, 110);
  assert.equal(result.closestToPublish?.product_id, "closest-1");
  assert.deepEqual(result.pagination, {
    page: 15,
    pageSize: 10,
    total: 250,
    totalPages: 25,
    offset: 140,
  });
  assert.equal(result.items.length, 1);

  const pageQuery = queries[2];
  assert.ok(pageQuery);
  assert.match(pageQuery.sql, /LIMIT \?\s+OFFSET \?/);
  assert.equal(pageQuery.values.at(-2), 10);
  assert.equal(pageQuery.values.at(-1), 140);
  assert.doesNotMatch(pageQuery.sql, /LIMIT 120/);
});

test("pipeline read model uses adminPrisma exclusively and removes hardcoded LIMIT 120", () => {
  const readModel = readFileSync(
    new URL("./admin-product-summary-read-model.ts", import.meta.url),
    "utf8",
  );
  const pipelinePage = readFileSync(
    new URL("../app/admin/pipeline/page.tsx", import.meta.url),
    "utf8",
  );

  assert.match(readModel, /adminPrisma\.\$queryRaw/);
  assert.doesNotMatch(readModel, /\bprisma\.\$queryRaw/);
  assert.doesNotMatch(readModel, /LIMIT 120/);
  assert.doesNotMatch(pipelinePage, /LIMIT 120/);
  assert.doesNotMatch(pipelinePage, /paginateAdminItems/);
});

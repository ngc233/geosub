import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const libDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(libDir, "..");

function readProjectFile(fileName: string) {
  return readFileSync(resolve(projectRoot, fileName), "utf8");
}

test("canonical product status read model uses adminPrisma, platform scope, and SQL LIMIT/OFFSET pagination", () => {
  const source = readProjectFile("lib/admin-product-status-read-model.ts");

  assert.match(source, /import \{ adminPrisma as prisma \} from "\.\/prisma"/);
  assert.match(source, /officialWebEligibleJobSql\("product", "job"\)/);
  assert.match(source, /webPricingScopeJoinSql\(/);
  assert.match(source, /LIMIT \$\{pagination\.pageSize\}\s+OFFSET \$\{pagination\.offset\}/);
  assert.match(source, /export function normalizeSqlPagination/);
  assert.match(source, /export function resolveCatalogOrderSql/);
  assert.match(source, /export async function queryCanonicalProductsPage/);
  assert.match(source, /export async function queryCanonicalPipelinePage/);
});

test("admin read-model cache invalidates canonical productStatus prefix on catalog and pricing mutations", () => {
  const cacheSource = readProjectFile("lib/admin-read-model-cache.ts");

  assert.match(cacheSource, /productStatus: "product-status:"/);
  assert.match(
    cacheSource,
    /invalidateAdminPricingReadModels[\s\S]*?ADMIN_READ_MODEL_PREFIXES\.productStatus/,
  );
  assert.match(
    cacheSource,
    /invalidateAdminCatalogReadModels[\s\S]*?ADMIN_READ_MODEL_PREFIXES\.productStatus/,
  );
});

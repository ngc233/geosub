import assert from "node:assert/strict";
import test from "node:test";
import { getCollectionRevalidationPaths } from "./collection-revalidation.ts";

test("collection revalidation covers both public pricing sections and locales", () => {
  const paths = getCollectionRevalidationPaths("netflix");

  for (const path of [
    "/zh/ai-pricing/netflix",
    "/en/ai-pricing/netflix",
    "/zh/streaming-pricing/netflix",
    "/en/streaming-pricing/netflix",
  ]) {
    assert.ok(paths.includes(path), `${path} should be revalidated`);
  }

  assert.ok(paths.includes("/admin/pipeline"));
  assert.equal(new Set(paths).size, paths.length);
});

test("collection revalidation omits detail routes without a product slug", () => {
  const paths = getCollectionRevalidationPaths();

  assert.equal(paths.some((path) => path.endsWith("/undefined")), false);
  assert.equal(paths.some((path) => path.endsWith("/null")), false);
});

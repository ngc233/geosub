import assert from "node:assert/strict";
import test from "node:test";
import { getCollectionRevalidationPaths } from "./collection-revalidation.ts";

test("collection revalidation covers sitemap, product and plan paths", () => {
  const paths = getCollectionRevalidationPaths("netflix", ["premium"]);

  for (const path of [
    "/zh/ai-pricing/netflix",
    "/en/ai-pricing/netflix",
    "/zh/streaming-pricing/netflix",
    "/en/streaming-pricing/netflix",
    "/zh/ai-pricing/netflix/premium",
    "/en/ai-pricing/netflix/premium",
    "/zh/streaming-pricing/netflix/premium",
    "/en/streaming-pricing/netflix/premium",
  ]) {
    assert.ok(paths.includes(path), `${path} should be revalidated`);
  }

  assert.ok(paths.includes("/admin/pipeline"));
  assert.ok(paths.includes("/sitemap.xml"));
  assert.equal(new Set(paths).size, paths.length);
});

test("collection revalidation omits detail routes without a product slug", () => {
  const paths = getCollectionRevalidationPaths(null, ["premium"]);

  assert.equal(paths.some((path) => path.endsWith("/undefined")), false);
  assert.equal(paths.some((path) => path.endsWith("/null")), false);
  assert.equal(paths.some((path) => path.endsWith("/premium")), false);
});

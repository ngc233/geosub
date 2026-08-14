import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_BATCH_COLLECTION_PRODUCTS,
  normalizeBatchProductSlugs,
} from "./batch-collection.ts";

test("batch collection slugs are normalized, deduplicated and bounded", () => {
  const values = [
    " ChatGPT ",
    "chatgpt",
    "NETFLIX",
    "",
    null,
    ...Array.from({ length: 20 }, (_, index) => `product-${index}`),
  ];

  const result = normalizeBatchProductSlugs(values);

  assert.deepEqual(result.slice(0, 2), ["chatgpt", "netflix"]);
  assert.equal(result.length, MAX_BATCH_COLLECTION_PRODUCTS);
  assert.equal(new Set(result).size, result.length);
});

test("batch collection supports a smaller explicit limit", () => {
  assert.deepEqual(normalizeBatchProductSlugs(["a", "b", "c"], 2), ["a", "b"]);
});

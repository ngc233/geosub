import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(currentDir, "collection-runner.ts"), "utf8");

test("manual collection selects one canonical App Store job per product", () => {
  assert.match(source, /ROW_NUMBER\(\) OVER \(\s*PARTITION BY job\.product_id/);
  assert.match(source, /job\.priority DESC/);
  assert.match(source, /job_config ->> 'app_store_id'/);
  assert.match(source, /ranked\.product_rank = 1/g);
});

test("product collection revalidates localized AI and streaming routes", () => {
  assert.doesNotMatch(source, /revalidatePath\("\/zh\/ai-pricing\/chatgpt"\)/);

  for (const route of [
    "/zh/ai-pricing/${productSlug}",
    "/en/ai-pricing/${productSlug}",
    "/zh/streaming-pricing/${productSlug}",
    "/en/streaming-pricing/${productSlug}",
  ]) {
    assert.ok(source.includes(`revalidatePath(\`${route}\`)`));
  }
});

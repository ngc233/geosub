import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const appDir = dirname(fileURLToPath(import.meta.url));
const siteDir = resolve(appDir, "..");
const route = readFileSync(
  resolve(
    appDir,
    "api",
    "internal",
    "revalidate",
    "collector-success",
    "route.ts",
  ),
  "utf8",
);
const requester = readFileSync(
  resolve(siteDir, "lib", "internal-collector-revalidation.ts"),
  "utf8",
);
const cacheActions = readFileSync(
  resolve(siteDir, "lib", "public-pricing-cache-actions.ts"),
  "utf8",
);

test("collector completion revalidates inside a protected Route Handler context", () => {
  assert.match(requester, /http:\/\/127\.0\.0\.1:/);
  assert.match(requester, /x-geosub-internal-revalidation/);
  assert.match(requester, /AbortSignal\.timeout\(10_000\)/);
  assert.match(route, /isValidInternalRevalidationToken/);
  assert.match(route, /return new Response\(null, \{ status: 404 \}\)/);
  assert.match(route, /invalidatePublicPricingFromRoute\(productSlug\)/);
  assert.match(route, /getCollectionRevalidationPaths\(\s*productSlug,\s*planSlugs/);
  assert.match(cacheActions, /revalidateTag\([^,]+, \{ expire: 0 \}\)/);
  assert.match(cacheActions, /export function invalidatePublicPricing\(/);
  assert.match(cacheActions, /updateTag\(/);
});

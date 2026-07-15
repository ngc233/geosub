import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { buildDiscoveryReviewRedirectPath } from "./discovery-redirect.ts";

const discoveryDir = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(discoveryDir, "../..");

function readAppFile(fileName: string) {
  return readFileSync(resolve(appRoot, fileName), "utf8");
}

test("discovery promotion redirects into the product-level collection workspace", () => {
  const path = buildDiscoveryReviewRedirectPath({
    productSlug: "grok",
    productName: "Grok",
    appStoreJobCount: 2,
  });

  assert.equal(
    path,
    "/admin/review?q=grok&discoveryPromoted=1&discoveryProduct=Grok&discoveryJobs=2",
  );
  assert.equal(path.startsWith("http"), false);
  assert.equal(path.includes("localhost"), false);
});

test("discovery promotion normalizes missing job count and missing product", () => {
  assert.equal(
    buildDiscoveryReviewRedirectPath({
      productSlug: " netflix ",
      productName: "",
      appStoreJobCount: -1,
    }),
    "/admin/review?q=netflix&discoveryPromoted=1&discoveryProduct=netflix&discoveryJobs=0",
  );

  assert.equal(
    buildDiscoveryReviewRedirectPath({
      productSlug: "",
      productName: "Missing",
      appStoreJobCount: 1,
    }),
    "/admin/discovery?promotionError=1",
  );
});

test("discovery UI and action keep the clue to collection handoff explicit", () => {
  const actionSource = readAppFile("admin/discovery/actions.ts");
  const pageSource = readAppFile("admin/discovery/page.tsx");
  const formSource = readAppFile("admin/discovery/DiscoveryIntakeForms.tsx");

  assert.match(actionSource, /buildDiscoveryReviewRedirectPath/);
  assert.match(actionSource, /findAppStoreApp\(candidate\.name\)/);
  assert.match(actionSource, /app_store_job_count/);
  assert.match(actionSource, /系统会先匹配 App Store，再跳到这个产品的采集工作台/);

  assert.match(pageSource, /buildDiscoveryReviewRedirectPath/);
  assert.match(pageSource, /加入并进入采集/);
  assert.match(pageSource, /去这个产品的采集工作台/);
  assert.match(pageSource, /只采这个产品/);
  assert.doesNotMatch(pageSource, /加入服务库并准备采集/);

  assert.match(formSource, /下一步会进入产品级采集/);
});

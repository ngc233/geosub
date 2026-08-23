import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const route = readFileSync(new URL("./reports/[locale]/[filename]/route.ts", import.meta.url), "utf8");
const dataset = readFileSync(new URL("../lib/pricing-report.ts", import.meta.url), "utf8");
const renderer = readFileSync(new URL("../lib/pricing-report-pdf.ts", import.meta.url), "utf8");
const detailPage = readFileSync(new URL("../components/PricingDetailPage.tsx", import.meta.url), "utf8");

test("pricing reports use a stable product URL and canonical server data", () => {
  assert.match(route, /-global-pricing\.pdf/);
  assert.match(route, /getPricingDetailProduct\(productSlug, locale\)/);
  assert.match(route, /Content-Language/);
  assert.match(route, /rel=\"canonical\"/);
  assert.match(route, /X-GeoSub-Snapshot-Id/);
  assert.doesNotMatch(route, /screenshot|querySelector|document\./);
});

test("pricing report schema separates source provenance from citation", () => {
  assert.match(dataset, /sourceStatus: PricingReportSourceStatus/);
  assert.match(dataset, /sourceUrl: string \| null/);
  assert.match(dataset, /snapshotId: string/);
  assert.match(dataset, /citation: string/);
  assert.match(renderer, /Data provenance/);
  assert.match(renderer, /Suggested citation/);
  assert.match(renderer, /Exchange rates/);
});

test("product detail pages expose the localized report download", () => {
  assert.match(detailPage, /下载价格报告/);
  assert.match(detailPage, /\/reports\/\$\{locale\}\/\$\{product\.slug\}-global-pricing\.pdf/);
  assert.match(detailPage, /eventKey="download_price_report"/);
});

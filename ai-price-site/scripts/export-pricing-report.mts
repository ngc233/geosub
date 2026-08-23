import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const productSlug = process.argv[2] || "chatgpt";
const locale = process.argv[3] || "zh";
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(productSlug)) {
  throw new Error("Product slug must use lowercase letters, numbers and hyphens only.");
}

const origin = (process.env.GEOSUB_REPORT_ORIGIN || "http://127.0.0.1:3000").replace(/\/$/, "");
const response = await fetch(`${origin}/reports/${locale}/${productSlug}-global-pricing.pdf`);
if (!response.ok) throw new Error(`Report request failed with HTTP ${response.status}.`);
const pdf = new Uint8Array(await response.arrayBuffer());
const outputDirectory = path.resolve("output", "pdf");
const outputPath = path.join(outputDirectory, `geosub-${productSlug}-global-pricing-report-${locale}.pdf`);

await mkdir(outputDirectory, { recursive: true });
await writeFile(outputPath, pdf);
console.log(JSON.stringify({
  outputPath,
  snapshotId: response.headers.get("x-geosub-snapshot-id"),
  datasetVersion: response.headers.get("x-geosub-dataset-version"),
  bytes: pdf.byteLength,
}));

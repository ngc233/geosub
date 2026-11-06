import "dotenv/config";
import { performance } from "node:perf_hooks";
import { getComparablePriceRows, getVerifiedPriceRows } from "../lib/country-hubs.ts";
import { getRepresentativePlanCandidates } from "../lib/comparable-price-candidates.ts";

// Deliberately local-only. DATA-1 measurements must never read production or a
// restored production backup. The caller must use existing repository fixtures.
const database = new URL(process.env.DATABASE_URL || "postgresql://invalid");
if (!["localhost", "127.0.0.1", "[::1]"].includes(database.hostname)
  || !/^\/geosub_(?:ui_b7cec32_e2e|gift_guide_links_e2e|release_20261106|data1_[a-z0-9_]+)$/.test(database.pathname)) {
  throw new Error("DATA-1 report requires an explicitly named local fixture database");
}
database.searchParams.set("options", "-c default_transaction_read_only=on");
process.env.DATABASE_URL = database.href;
const { readVerifiedPriceSource } = await import("../lib/verified-price-source.ts");
const { prisma } = await import("../lib/prisma.ts");
try {
  const timings: number[] = [];
  let snapshot: Awaited<ReturnType<typeof readVerifiedPriceSource>> | undefined;
  for (let i = 0; i < 6; i++) {
    const start = performance.now();
    snapshot = await readVerifiedPriceSource();
    timings.push(Number((performance.now() - start).toFixed(3)));
  }
  const { prices, rates } = snapshot!;
  const now = new Date();
  const verified = getVerifiedPriceRows(prices, rates, now);
  const comparable = getComparablePriceRows(prices, rates, now);
  const catalogue = await prisma.$queryRaw<Array<{ slug: string; name: string; publishedIosRows: number; publishedOtherRows: number }>>`
    SELECT p.slug, p.name,
      COUNT(rp.id) FILTER (WHERE rp.billing_platform = 'ios')::int AS "publishedIosRows",
      COUNT(rp.id) FILTER (WHERE rp.billing_platform <> 'ios')::int AS "publishedOtherRows"
    FROM products p LEFT JOIN region_prices rp ON rp.product_id = p.id AND rp.status = 'published'
    WHERE p.status = 'published' GROUP BY p.id ORDER BY p.slug
  `;
  const included = new Set(comparable.map(row => row.productSlug));
  const warm = timings.slice(1).sort((a, b) => a - b);
  console.log(JSON.stringify({
    at: now.toISOString(), database: database.pathname.slice(1), source: "repository local test fixtures only",
    timing: { scope: "uncached reader including pool/adapter overhead; first sample includes connection setup", samplesMs: timings, firstMs: timings[0], warmP50Ms: warm[2], warmP95Ms: warm[4] },
    rawRows: prices.length, verifiedRows: verified.length, comparableRows: comparable.length,
    unavailableFxRows: verified.length - comparable.length, productCount: included.size,
    regionCount: new Set(comparable.map(row => row.countryCode)).size,
    candidates: getRepresentativePlanCandidates(comparable),
    recommendationRule: "owner-confirmed homepage-representative-plans.ts only; no automatic replacement",
    absentPublishedProducts: catalogue.filter(product => !included.has(product.slug)).map(product => ({ ...product,
      reason: product.publishedIosRows ? "No iOS row meets the full evidence/freshness/FX conditions" : "No published iOS price in this fixture; App Store sales availability is not established",
    })),
    confirmedNotSoldViaAppStore: [],
    limitation: "Fixture absence is not evidence that a product is not sold via App Store. No production data or external sales claims are inferred.",
  }, null, 2));
} finally { await prisma.$disconnect(); }

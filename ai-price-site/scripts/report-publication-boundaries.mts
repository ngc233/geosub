/** Read a bounded operator-supplied evidence summary; never writes or connects to a database. */
import { readFileSync, statSync } from "node:fs";
import { assessPublicationBoundaries, type PublicationBoundaryInput } from "../lib/publication-boundaries.ts";
import { contentTargets, contentTargetReadiness } from "../lib/content-target-registry.ts";

const file = process.argv[2];
if (!file || process.argv.length !== 3) throw new Error("Usage: node --experimental-strip-types scripts/report-publication-boundaries.mts <evidence-summary.json>");
if (statSync(file).size > 16_384) throw new Error("Evidence summary too large");
const input: unknown = JSON.parse(readFileSync(file, "utf8"));
const keys = ["productStatus", "qualifiedPrice", "contentReady", "templateReady", "indexPolicy", "navigationPolicy", "sitemapPolicy", "realPromotionEnabled"];
if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some((key) => !keys.includes(key))) throw new Error("Only publication evidence states are accepted");
console.log(JSON.stringify({ assessment: assessPublicationBoundaries(input as PublicationBoundaryInput), contentTargets: contentTargets.map((value) => contentTargetReadiness(value.id)) }, null, 2));

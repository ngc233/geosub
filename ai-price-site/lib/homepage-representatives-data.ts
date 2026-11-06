import "server-only";
import { cache } from "react";
import { loadComparablePrices } from "./comparable-prices-data";
import { getHomepageRepresentatives } from "./homepage-representatives.ts";

let lastIssueSignature = "";
let lastReportedAt = 0;

// V3's homepage product sections must consume this guarded entry point, never
// choose another plan from loadComparablePrices when a configured plan fails.
// D1 statistics continue to use the full collection, including Boomplay.
export const loadHomepageRepresentatives = cache(async () => {
  const result = getHomepageRepresentatives(await loadComparablePrices());
  const signature = JSON.stringify(result.issues);
  const now = Date.now();
  if (result.issues.length && (signature !== lastIssueSignature || now - lastReportedAt >= 3_600_000)) {
    // Public identifiers and reason codes only; no price rows or credentials.
    console.warn("[homepage-representatives]", { event: "configured-plan-ineligible", issues: result.issues });
    lastReportedAt = now;
  }
  lastIssueSignature = signature;
  return result.representatives;
});

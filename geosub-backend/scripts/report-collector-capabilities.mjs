import { readFileSync } from "node:fs";
import { assertClaudeProSource } from "./lib/claude-pro-official-web.mjs";
import { assertSunoSource } from "./lib/suno-official-web.mjs";
import { assertAutomaticWebSource } from "./lib/official-web-auto-review.mjs";

export function describeCollectorCapability(job, sources) {
  const kind = job.job_config?.collector_kind || "unknown";
  const base = { collects_prices: false, automatic_review: false, market_count: 0 };
  if (kind === "app_store") {
    return {
      ...base, mode: "app_store_prices", billing_platform: "ios",
      collects_prices: Boolean(job.job_config.app_store_id),
      automatic_review: Boolean(job.job_config.app_store_id),
      next_action: job.job_config.app_store_id ? "scheduled_collection" : "configure_app_store_identity",
    };
  }
  if (kind === "official_site" || (kind === "pricing_page" && !job.job_config.official_web_source_key)) {
    return {
      ...base, mode: kind === "official_site" ? "snapshot_only" : "price_hints_only",
      billing_platform: "web", next_action: "configure_verified_price_adapter",
    };
  }
  if (kind === "pricing_page") {
    const source = sources[job.job_config.official_web_source_key];
    if (source?.product_slug === job.product_slug) {
      try {
        if (source.parser_key === "suno_us_monthly") {
          assertSunoSource(source);
          return {
            ...base, mode: "pending_official_web_prices", billing_platform: "web",
            collects_prices: true, automatic_review: false, market_count: 1,
            next_action: "complete_isolated_review_acceptance",
          };
        }
        if (source.parser_key === "claude_us_pro") {
          assertClaudeProSource(source);
          if (source.auto_review) throw Error("claude_automatic_publication_isolated_harness_only");
          return {
            ...base, mode: "pending_official_web_prices", billing_platform: "web",
            collects_prices: true, automatic_review: false, market_count: 1,
            next_action: "complete_isolated_review_acceptance",
          };
        }
        assertAutomaticWebSource(source);
        return {
          ...base, mode: "official_web_prices", billing_platform: "web",
          collects_prices: true, automatic_review: true, market_count: source.markets.length,
          rule_id: source.auto_review.rule_id, next_action: "scheduled_collection",
        };
      } catch { /* Registered URLs alone do not establish price or review capability. */ }
    }
    return {
      ...base, mode: "unverified_web_adapter", billing_platform: "web",
      next_action: "verify_source_parser_and_review_policy",
    };
  }
  return { ...base, mode: "unclassified", billing_platform: null, next_action: "inspect_collector_configuration" };
}

export function reportCollectorCapabilities(jobs, sources) {
  return jobs.map(job => ({
    product_slug: job.product_slug,
    job_id: job.id,
    job_status: job.status,
    ...describeCollectorCapability(job, sources),
  }));
}

// Offline only: input contains job configuration; output intentionally omits URLs and raw configuration.
if (process.argv.includes("--stdin")) {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const jobs = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  const registry = JSON.parse(readFileSync(new URL("../data/official-web-price-sources.json", import.meta.url), "utf8"));
  process.stdout.write(JSON.stringify(reportCollectorCapabilities(jobs, registry.sources), null, 2) + "\n");
}
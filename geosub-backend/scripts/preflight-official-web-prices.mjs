#!/usr/bin/env node
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadDatabaseContext } from "./collect-official-web-prices.mjs";
import { assertClaudeProSource } from "./lib/claude-pro-official-web.mjs";
import { assertAutomaticWebSource } from "./lib/official-web-auto-review.mjs";

export function assertLocalPreflightConnection(parameters) {
  if (!['localhost', '127.0.0.1', '::1'].includes(parameters?.host)
    || Number(parameters?.port) !== 55433
    || (parameters?.database !== 'geosub_admin_preview_20261028'
      && !/^geosub_collector_test_[a-z0-9_]+$/.test(parameters?.database ?? ''))) {
    throw Error('local_preflight_database_required');
  }
}

const canonicalErrors = new Set([
  'missing_canonical_product', 'missing_canonical_plans', 'missing_canonical_countries',
  'canonical_plan_billing_cycle_mismatch',
]);
const sameCountries = (left, right) => JSON.stringify([...new Set(left)].sort()) === JSON.stringify([...new Set(right)].sort());

export async function preflightOfficialWebPrices({ client, sources, sourceKey, productSlug, countryCodes }) {
  assertLocalPreflightConnection(client.connectionParameters);
  const source = sources[sourceKey];

  const report = {
    source_key: sourceKey, product_slug: productSlug ?? source?.product_slug ?? null,
    collection_ready: false, task_ready: false, automatic_review: false,
    live_source_checked: false, writes: 0, blocker_codes: [],
  };
  try {
    if (source?.parser_key === 'claude_us_pro') {
      assertClaudeProSource(source);
      if (source.auto_review) throw Error('claude_automatic_publication_isolated_harness_only');
    } else {
      assertAutomaticWebSource(source);
    }
    if (productSlug && productSlug !== source.product_slug) throw Error('source_product_mismatch');
  } catch {
    return { ...report, state: 'invalid_source_configuration', blocker_codes: ['verify_source_parser_and_review_policy'] };
  }
  report.automatic_review = Boolean(source.auto_review);
  const codes = countryCodes ?? source.markets.map(market => market.country_code);
  if (!Array.isArray(codes) || codes.length === 0 || codes.some(code => !source.markets.some(market => market.country_code === code))) {
    return { ...report, state: 'unsupported_market_scope', blocker_codes: ['select_reviewed_source_markets'] };
  }
  report.country_codes = [...new Set(codes)].sort();
  await client.query('BEGIN READ ONLY');
  try {
    await client.query("SET LOCAL statement_timeout='15s'");
    const readOnly = (await client.query('SHOW transaction_read_only')).rows[0]?.transaction_read_only;
    if (readOnly !== 'on') throw Error('read_only_transaction_required');
    const actual = (await client.query('SELECT current_database() AS name')).rows[0]?.name;
    if (actual !== client.connectionParameters.database) throw Error('preflight_database_mismatch');
    report.database_read_only = true;
    let database;
    try {
      database = await loadDatabaseContext(client, source, report.country_codes);
    } catch (error) {
      const code = String(error.message).split(':')[0];
      if (!canonicalErrors.has(code)) throw error;
      return { ...report, state: 'canonical_configuration_blocked', blocker_codes: [code] };
    }
    if (database.product.status === 'archived') report.blocker_codes.push('canonical_product_archived');
    const category = (await client.query('SELECT category::text FROM products WHERE id=$1', [database.product.id])).rows[0]?.category;
    const jobType = category === 'ai' ? 'ai_pricing' : category === 'streaming' ? 'streaming_pricing' : null;
    if (!jobType) report.blocker_codes.push('unsupported_product_category');
    const plans = (await client.query(`SELECT slug, status::text FROM plans
      WHERE product_id=$1 AND slug=ANY($2::text[])`, [database.product.id, source.required_plan_slugs])).rows;
    if (plans.some(plan => plan.status === 'archived')) report.blocker_codes.push('canonical_plan_archived');
    if (!source.auto_review && source.markets.some(market => report.country_codes.includes(market.country_code)
      && database.countries.get(market.country_code).currency !== market.currency)) {
      report.blocker_codes.push('canonical_country_currency_mismatch');
    }
    if (report.blocker_codes.length) return { ...report, state: 'canonical_configuration_blocked' };
    report.collection_ready = true;
    const jobs = (await client.query(`SELECT status, job_type,
        job_config->>'collector_kind' AS collector_kind,
        job_config->>'official_web_source_key' AS source_key,
        job_config->'country_codes' AS country_codes
      FROM collector_jobs
      WHERE product_id=$1 AND status <> 'archived'
        AND job_config->>'collector_kind' IN ('official_site','pricing_page')`, [database.product.id])).rows;
    const priceJobs = jobs.filter(job => job.collector_kind === 'pricing_page' && job.source_key === sourceKey);
    const matching = priceJobs.filter(job => {
      if (!Array.isArray(job.country_codes)) return false;
      const configured = job.country_codes.length === 1 && job.country_codes[0] === 'ALL'
        ? source.markets.map(market => market.country_code) : job.country_codes;
      return sameCountries(configured, report.country_codes);
    });
    const eligible = matching.filter(job => job.job_type === jobType);
    const active = eligible.filter(job => job.status === 'active');
    report.snapshot_job_count = jobs.filter(job => job.collector_kind === 'official_site').length;
    report.matching_price_job_count = matching.length;
    report.active_price_job_count = active.length;
    report.unsupported_job_type_count = matching.length - eligible.length;
    report.task_type_suggestion = jobType;
    report.task_config_suggestion = {
      collector_kind: 'pricing_page', official_web_source_key: sourceKey, country_codes: report.country_codes,
    };
    if (active.length > 1) return { ...report, state: 'duplicate_price_jobs', next_action: 'consolidate_price_jobs' };
    if (active.length === 1) {
      return { ...report, task_ready: true, state: 'price_job_configured', next_action: 'scheduled_collection' };
    }
    if (eligible.length) return { ...report, state: 'price_job_not_active', next_action: 'review_job_status' };
    if (matching.length) return { ...report, state: 'price_job_type_mismatch', next_action: 'align_supported_job_type' };
    if (priceJobs.length) return { ...report, state: 'price_job_scope_mismatch', next_action: 'align_reviewed_market_scope' };
    return { ...report, state: 'task_configuration_required', next_action: 'configure_verified_price_job' };
  } finally {
    await client.query('ROLLBACK');
  }
}

async function main() {
  const options = new Map();
  for (let index = 2; index < process.argv.length; index += 2) {
    const key = process.argv[index], value = process.argv[index + 1];
    if (!['--source-key', '--product-slug', '--country-codes'].includes(key) || !value || value.startsWith('--')) {
      throw Error('invalid_preflight_arguments');
    }
    options.set(key, value);
  }
  if (!options.get('--source-key')) throw Error('source_key_required');
  // No environment-file fallback: this diagnostic requires an explicit local URL.
  const url = new URL(process.env.DATABASE_URL);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw Error('invalid_database_protocol');
  assertLocalPreflightConnection({ host: url.hostname === '[::1]' ? '::1' : url.hostname,
    port: url.port, database: url.pathname.slice(1) });
  const frontend = process.env.GEOSUB_FRONTEND_DIR || fileURLToPath(new URL('../../ai-price-site/', import.meta.url));
  const requireFromSite = createRequire(path.join(frontend, 'package.json'));
  const { Client } = requireFromSite('pg');
  const client = new Client({ connectionString: url.toString(), connectionTimeoutMillis: 5_000 });
  assertLocalPreflightConnection(client.connectionParameters);
  const sources = JSON.parse(readFileSync(new URL('../data/official-web-price-sources.json', import.meta.url), 'utf8')).sources;
  try {
    await client.connect();
    const result = await preflightOfficialWebPrices({ client, sources, sourceKey: options.get('--source-key'),
      productSlug: options.get('--product-slug'),
      countryCodes: options.has('--country-codes')
        ? options.get('--country-codes').split(',').map(code => code.trim().toUpperCase()).filter(Boolean) : undefined });
    console.log(JSON.stringify(result, null, 2));
    if (!result.collection_ready) process.exitCode = 2;
  } finally { await client.end().catch(() => {}); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => {
    console.error('Official Web local preflight failed. Check the explicit local connection and arguments; no collection was started.');
    process.exitCode = 1;
  });
}

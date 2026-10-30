import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { preflightOfficialWebPrices, assertLocalPreflightConnection } from './preflight-official-web-prices.mjs';

const sources = JSON.parse(readFileSync(new URL('../data/official-web-price-sources.json', import.meta.url), 'utf8')).sources;
const sourceKey = 'claude-us-pro';
const config = { collector_kind: 'pricing_page', source_key: sourceKey, country_codes: ['US'], status: 'active', job_type: 'ai_pricing' };
function fixture(options = {}) {
  const source = sources[options.sourceKey ?? sourceKey];
  const calls = [];
  return {
    calls, connectionParameters: { host: '127.0.0.1', port: 55433, database: 'geosub_collector_test_preflight_fixture' },
    async query(sql) {
      calls.push(sql);
      assert.match(sql.trim(), /^(BEGIN READ ONLY|ROLLBACK|SET LOCAL|SHOW |SELECT )/);
      if (sql === 'SHOW transaction_read_only') return { rows: [{ transaction_read_only: options.readOnly ?? 'on' }] };
      if (sql === 'SELECT current_database() AS name') return { rows: [{ name: options.database ?? this.connectionParameters.database }] };
      if (sql.includes('FROM products')) return { rows: options.missingProduct ? [] : [
        { id: 'product-fixture', slug: source.product_slug, status: options.productStatus ?? 'review',
          category: options.category ?? (source.product_slug === 'claude' ? 'ai' : 'streaming') },
      ] };
      if (sql.includes('SELECT slug, status::text')) return { rows: source.required_plan_slugs.map(slug => ({slug, status: options.planStatus ?? 'review'})) };
      if (sql.includes('FROM plans')) return { rows: options.missingPlans ? [] : source.required_plan_slugs.map(slug => ({
        id: 'plan-' + slug, slug, billing_cycle: options.cycle ?? 'monthly',
      })) };
      if (sql.includes('FROM countries')) return { rows: options.missingCountry ? [] : [{id: 'country-fixture', code: 'US', currency: options.currency ?? 'USD'}] };
      if (sql.includes('FROM collector_jobs')) return { rows: options.jobs ?? [] };
      return { rows: [] };
    },
  };
}
const run = (client, extra = {}) => preflightOfficialWebPrices({client, sources, sourceKey, countryCodes: ['US'], ...extra});

test('preflight separates a verified adapter from a configured scheduled task without HTTP or writes', async () => {
  const client = fixture({jobs: [{collector_kind: 'official_site', status: 'active', url: 'private-token-do-not-output'}]});
  const originalFetch = globalThis.fetch;
  globalThis.fetch = () => { throw Error('must_not_fetch'); };
  try {
    const result = await run(client);
    assert.equal(result.collection_ready, true);
    assert.equal(result.task_ready, false);
    assert.equal(result.state, 'task_configuration_required');
    assert.equal(result.automatic_review, false);
    assert.equal(result.live_source_checked, false);
    assert.equal(result.database_read_only, true);
    assert.equal(result.snapshot_job_count, 1);
    assert.equal(result.task_type_suggestion, 'ai_pricing');
    assert.equal(result.writes, 0);
    assert.deepEqual(result.task_config_suggestion, {
      collector_kind: 'pricing_page', official_web_source_key: sourceKey, country_codes: ['US'],
    });
    assert.equal(JSON.stringify(result).includes('private-token'), false);
    assert.equal(client.calls[0], 'BEGIN READ ONLY');
    assert.equal(client.calls.at(-1), 'ROLLBACK');
  } finally { globalThis.fetch = originalFetch; }
});

test('preflight rejects remote hosts, unknown databases and ports before querying', async () => {
  for (const change of [{host: 'remote.invalid'}, {port: 5432}, {database: 'geosub_app'}, {database: 'geosub_migration_20261028'}]) {
    const client = fixture();
    Object.assign(client.connectionParameters, change);
    await assert.rejects(run(client), /local_preflight_database_required/);
    assert.equal(client.calls.length, 0);
  }
  assertLocalPreflightConnection({host:'::1', port:55433, database:'geosub_admin_preview_20261028'});
});

test('invalid parser, product, publication policy and unsupported markets fail before any query', async () => {
  for (const mutate of [source => source.parser_version = 'unverified', source => source.auto_review = {rule_id: 'unapproved'}]) {
    const registry = structuredClone(sources); mutate(registry[sourceKey]);
    const client = fixture();
    assert.equal((await run(client, {sources: registry})).state, 'invalid_source_configuration');
    assert.equal(client.calls.length, 0);
  }
  for (const extra of [{productSlug: 'other-product'}, {sourceKey: 'unknown-source'}, {countryCodes: ['CA']}, {countryCodes: []}]) {
    const client = fixture();
    const result = await run(client, extra);
    assert.equal(result.collection_ready, false);
    assert.equal(client.calls.length, 0);
  }
});

test('canonical identity, cycle, currency and archive blockers are reported without activation', async () => {
  for (const [option, code] of [
    [{missingProduct:true}, 'missing_canonical_product'], [{missingPlans:true}, 'missing_canonical_plans'],
    [{missingCountry:true}, 'missing_canonical_countries'], [{cycle:'annual'}, 'canonical_plan_billing_cycle_mismatch'],
    [{currency:'EUR'}, 'canonical_country_currency_mismatch'], [{productStatus:'archived'}, 'canonical_product_archived'],
    [{planStatus:'archived'}, 'canonical_plan_archived'], [{category:'software'}, 'unsupported_product_category'],
  ]) {
    const client = fixture(option);
    const result = await run(client);
    assert.equal(result.collection_ready, false);
    assert.deepEqual(result.blocker_codes, [code]);
    assert.equal(result.task_ready, false);
    assert.equal(client.calls.at(-1), 'ROLLBACK');
  }
});

test('active, paused, wrong-scope and duplicate price jobs produce different configuration steps', async () => {
  for (const [jobs, state, ready] of [
    [[config], 'price_job_configured', true],
    [[{...config,status:'paused'}], 'price_job_not_active', false],
    [[{...config,country_codes:['CA']}], 'price_job_scope_mismatch', false],
    [[{...config,country_codes:['US','CA']}], 'price_job_scope_mismatch', false],
    [[config,config], 'duplicate_price_jobs', false],
    [[{...config,country_codes:['DEFAULT']}], 'price_job_scope_mismatch', false],
    [[{...config,job_type:'price_check'}], 'price_job_type_mismatch', false],
    [[{...config,country_codes:['ALL']}], 'price_job_configured', true],
  ]) {
    const result = await run(fixture({jobs}));
    assert.equal(result.state, state);
    assert.equal(result.task_ready, ready);
    assert.equal(result.writes, 0);
  }
});

test('preflight verifies read-only mode and actual database identity and always closes its transaction', async () => {
  for (const [option, error] of [[{readOnly:'off'}, /read_only_transaction_required/], [{database:'different'}, /preflight_database_mismatch/]]) {
    const client = fixture(option);
    await assert.rejects(run(client), error);
    assert.equal(client.calls.at(-1), 'ROLLBACK');
    assert.ok(!client.calls.some(sql => sql.includes('FROM products')));
  }
});

test('existing automatic sources retain their reviewed policy and accept only exact configured scopes', async () => {
  for (const key of ['spotify', 'apple-music']) {
    const client = fixture({sourceKey:key, jobs:[{...config,source_key:key,job_type:'streaming_pricing'}]});
    const result = await run(client, {sourceKey:key});
    assert.equal(result.collection_ready, true);
    assert.equal(result.task_ready, true);
    assert.equal(result.automatic_review, true);
    const broad = await run(fixture({sourceKey:key, jobs:[{...config,source_key:key,job_type:'streaming_pricing',country_codes:['ALL']}]}), {sourceKey:key});
    assert.equal(broad.task_ready, false);
    assert.equal(broad.state, 'price_job_scope_mismatch');
  }
});

test('CLI rejects a remote URL without displaying credentials or attempting collection', () => {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('./preflight-official-web-prices.mjs', import.meta.url)),
    '--source-key', sourceKey], {encoding:'utf8', env:{...process.env,
    DATABASE_URL:'postgresql://private-user:private-password@remote.invalid:55433/geosub_admin_preview_20261028'}});
  assert.equal(result.status, 1);
  assert.doesNotMatch(result.stdout + result.stderr, /private-user|private-password|remote\.invalid|postgresql:\/\//);
  assert.match(result.stderr, /no collection was started/);
});

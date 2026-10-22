import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { insertMarketObservations, recordMarketFailure } from './collect-official-web-prices.mjs';
import { reviewOfficialWebMarket } from './lib/official-web-auto-review.mjs';
import { configureOfficialWebJob } from './configure-official-web-job.mjs';

const dsn=process.env.GEOSUB_WEB_TEST_DATABASE_URL;
test('real PostgreSQL official Web pipeline publishes, isolates and recovers without touching iOS/other products', {skip:!dsn}, async()=>{
  const url=new URL(dsn);
  assert.ok(['localhost','127.0.0.1'].includes(url.hostname));assert.match(url.pathname,/^\/geosub_web_test/);
  const { Client }=createRequire(new URL('../../ai-price-site/package.json',import.meta.url))('pg');
  const client=new Client({connectionString:dsn});await client.connect();
  const schema=`web_test_${process.pid}`;
  const config=JSON.parse(readFileSync(new URL('../data/official-web-price-sources.json',import.meta.url)));
  const source=structuredClone(config.sources.spotify);source.auto_review.publish_product=true;
  const market=source.markets[0];
  await client.query(`CREATE SCHEMA ${schema}; SET search_path=${schema},public`);
  try {
    for(const file of ['001_core_schema.sql','018_collector_job_runs.sql','043_public_product_lifecycle.sql','054_successful_collection_publication_gate.sql']) {
      await client.query(readFileSync(new URL(`../sql/schema/${file}`,import.meta.url),'utf8'));
    }
    const product=(await client.query("INSERT INTO products(slug,name,category,status) VALUES('spotify','Spotify Premium','streaming','review') RETURNING *")).rows[0];
    const country=(await client.query("INSERT INTO countries(code,name_en,name_zh,currency) VALUES('US','United States','美国','USD') RETURNING *")).rows[0];
    const plans=new Map();
    for(const slug of ['individual','family']) {
      const plan=(await client.query("INSERT INTO plans(product_id,slug,name,billing_cycle,status) VALUES($1,$2,$2,'monthly','review') RETURNING *",[product.id,slug])).rows[0];
      plans.set(slug,plan);
    }
    const sourceId=(await client.query(`INSERT INTO price_sources(source_key,name,type,provider,base_url,source_level,status)
      VALUES($1,'Spotify official','official_page','Spotify',$2,'A','active') RETURNING id`,[source.source_key,source.base_url])).rows[0].id;
    const database={product,plans,countries:new Map([['US',country]])};
    // Test the real onboarding transaction using the existing production table
    // columns without installing any new database schema capability.
    await client.query("ALTER TABLE collector_jobs ADD COLUMN job_config JSONB DEFAULT '{}'::jsonb, ADD COLUMN priority INTEGER DEFAULT 50");
    assert.equal((await configureOfficialWebJob(client,source)).action,'dry-run');
    assert.equal((await client.query('SELECT count(*)::int n FROM collector_jobs')).rows[0].n,0);
    const configured=await configureOfficialWebJob(client,source,true);
    assert.equal(configured.action,'created');
    assert.equal((await configureOfficialWebJob(client,source,true)).jobId,configured.jobId);
    assert.equal((await client.query('SELECT count(*)::int n FROM collector_jobs')).rows[0].n,1);
    // Same product/plan/country iOS row is a real regression risk in the old
    // approve_price_observation function. Preserve it byte-for-byte.
    await client.query(`INSERT INTO region_prices(product_id,plan_id,country_id,local_price,currency,price_usd,billing_platform,status)
      VALUES($1,$2,$3,99,'USD',99,'ios','published')`,[product.id,plans.get('individual').id,country.id]);
    const other=(await client.query("INSERT INTO products(slug,name) VALUES('other','Other') RETURNING *")).rows[0];
    const untouched=async()=>JSON.stringify((await client.query("SELECT row_to_json(p) AS row FROM products p WHERE id=$1 UNION ALL SELECT row_to_json(r) FROM region_prices r WHERE billing_platform='ios'",[other.id])).rows);
    const before=await untouched();
    const now=Date.now();
    const snapshot=(hours,price=12.99)=>({ok:true,render_mode:'structured_http',http_status:200,final_url:market.url,user_agent:'GeoSub-test',
      content_hash:createHash('sha256').update(`fixture-${hours}-${price}`).digest('hex'),captured_at:new Date(now-hours*3_600_000).toISOString(),
      parser_result:{parser_key:source.parser_key,parser_version:source.parser_version,complete:true,issues:[],candidates:[
        {plan_slug:'individual',raw_price:price,currency:'USD',billing_cycle:'monthly',observed_price_text:`$${price} / month`,evidence_text:'canonical individual monthly price',price_type:'list_price'},
        {plan_slug:'family',raw_price:21.99,currency:'USD',billing_cycle:'monthly',observed_price_text:'$21.99 / month',evidence_text:'canonical family monthly price',price_type:'list_price'}]}});
    const collect=async(hours)=>insertMarketObservations({client,source,market,database,sourceId,snapshot:snapshot(hours),force:true});
    const review=()=>reviewOfficialWebMarket({client,source,market,database,sourceId});
    await collect(84);await collect(60);
    assert.equal((await review()).published,0,'two independent samples cannot publish');
    await collect(36);const approved=await review();assert.equal(approved.published,2);
    let prices=(await client.query("SELECT * FROM region_prices WHERE billing_platform='web' ORDER BY local_price")).rows;
    assert.deepEqual(prices.map(r=>[Number(r.local_price),r.data_quality,r.status]),[[12.99,'verified','published'],[21.99,'verified','published']]);
    assert.equal((await client.query('SELECT status FROM products WHERE id=$1',[product.id])).rows[0].status,'published');
    assert.equal((await review()).published,0,'review is idempotent');
    const retry=await collect(35);assert.equal(retry.inserted,0,'--force cannot manufacture close samples');
    const priceBeforeFailure=JSON.stringify(prices);
    await recordMarketFailure({client,source,market,database,sourceId,snapshot:snapshot(30),issues:['missing recurring period']});
    const isolated=await review();assert.equal(isolated.published,0);assert.ok(isolated.decisions.every(d=>d.decision==='isolated'));
    assert.equal(JSON.stringify((await client.query("SELECT * FROM region_prices WHERE billing_platform='web' ORDER BY local_price")).rows),priceBeforeFailure);
    await collect(24);await collect(12);await collect(0);
    assert.equal((await review()).published,2,'three newer clean samples recover automatically');
    assert.equal((await client.query("SELECT count(*)::int AS n FROM price_observations WHERE anomaly_flag AND status='ignored'")).rows[0].n,2);
    assert.equal(await untouched(),before,'iOS row and unrelated product unchanged');
    const audit=(await client.query("SELECT raw_payload->'automatic_review' AS audit FROM price_observations WHERE status='approved'")).rows;
    assert.ok(audit.every(x=>x.audit.observation_ids.length===3));
    const evidence=(await client.query('SELECT count(*)::int AS n FROM source_evidence')).rows[0].n;
    assert.ok(evidence>=12);
    // An archived product must not be resurrected by the new reviewer.
    await client.query("UPDATE products SET status='archived' WHERE id=$1",[product.id]);
    await assert.rejects(review(),/context_changed/);
  } finally {
    await client.query(`SET search_path=public; DROP SCHEMA ${schema} CASCADE`);
    await client.end();
  }
});

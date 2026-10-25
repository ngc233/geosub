import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { insertMarketObservations, recordMarketFailure } from './collect-official-web-prices.mjs';
import { reviewOfficialWebMarket } from './lib/official-web-auto-review.mjs';
import { configureOfficialWebJob } from './configure-official-web-job.mjs';
import { spotifyRegistry, parseSpotifyOfficialHtml } from './lib/spotify-official-web.mjs';

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
    const initialCountries=source.markets.filter(m=>!spotifyRegistry.catalog_additions[m.country_code]);
    const countryRows=(await client.query(`INSERT INTO countries(code,name_en,name_zh,currency)
      SELECT code,code,code,currency FROM jsonb_to_recordset($1::jsonb) AS c(code text,currency text) RETURNING *`,
      [JSON.stringify(initialCountries.map(m=>({code:m.country_code,currency:m.country_code==='AO'?'AOA':m.currency})))])).rows;
    const country=countryRows.find(row=>row.code==='US');
    const plans=new Map();
    for(const slug of ['individual','family']) {
      const plan=(await client.query("INSERT INTO plans(product_id,slug,name,billing_cycle,status) VALUES($1,$2,$2,'monthly','review') RETURNING *",[product.id,slug])).rows[0];
      plans.set(slug,plan);
    }
    const sourceId=(await client.query(`INSERT INTO price_sources(source_key,name,type,provider,base_url,source_level,status)
      VALUES($1,'Spotify official','official_page','Spotify',$2,'A','active') RETURNING id`,[source.source_key,source.base_url])).rows[0].id;
    const database={product,plans,countries:new Map(countryRows.map(row=>[row.code,row]))};
    // Test the real onboarding transaction using the existing production table
    // columns without installing any new database schema capability.
    await client.query("ALTER TABLE collector_jobs ADD COLUMN job_config JSONB DEFAULT '{}'::jsonb, ADD COLUMN priority INTEGER DEFAULT 50");
    const preview=await configureOfficialWebJob(client,source);
    assert.equal(preview.action,'dry-run');assert.equal(preview.catalogAdditions.length,21);
    assert.deepEqual(preview.planAdditions.map(p=>p.slug),['standard','platinum']);
    assert.equal((await client.query('SELECT count(*)::int n FROM plans')).rows[0].n,2);
    assert.equal((await client.query('SELECT count(*)::int n FROM countries')).rows[0].n,initialCountries.length);
    assert.equal((await client.query('SELECT count(*)::int n FROM collector_jobs')).rows[0].n,0);
    assert.equal((await configureOfficialWebJob(client,source,true,{plansOnly:true})).action,'plans-created');
    assert.equal((await configureOfficialWebJob(client,source,true,{plansOnly:true})).action,'plans-existing');
    assert.equal((await client.query('SELECT count(*)::int n FROM collector_jobs')).rows[0].n,0,'plan registration does not activate a collector');
    assert.equal((await client.query('SELECT count(*)::int n FROM countries')).rows[0].n,initialCountries.length);
    for(const plan of (await client.query("SELECT * FROM plans WHERE slug IN ('standard','platinum')")).rows) {
      assert.equal(plan.status,'review');plans.set(plan.slug,plan);
    }
    await client.query("UPDATE plans SET name='Conflicting identity' WHERE slug='standard'");
    await assert.rejects(configureOfficialWebJob(client,source,true),/identity_conflict/);
    await client.query("UPDATE plans SET name='Spotify Premium Standard' WHERE slug='standard'");
    const configured=await configureOfficialWebJob(client,source,true);
    assert.equal(configured.action,'created');
    assert.equal((await client.query('SELECT count(*)::int n FROM countries')).rows[0].n,source.markets.length);
    assert.equal((await client.query("SELECT currency FROM countries WHERE code='AO'")).rows[0].currency,'AOA');
    assert.equal((await configureOfficialWebJob(client,source,true)).jobId,configured.jobId);
    assert.equal((await client.query('SELECT count(*)::int n FROM collector_jobs')).rows[0].n,1);
    await client.query("UPDATE collector_jobs SET job_config=jsonb_set(job_config,'{country_codes}','[\"US\"]'::jsonb) WHERE id=$1",[configured.jobId]);
    assert.equal((await configureOfficialWebJob(client,source)).action,'update-required');
    assert.equal((await configureOfficialWebJob(client,source,true)).action,'updated');
    assert.deepEqual((await client.query('SELECT job_config FROM collector_jobs WHERE id=$1',[configured.jobId])).rows[0].job_config.country_codes,
      source.markets.map(m=>m.country_code));
    // Same product/plan/country iOS row is a real regression risk in the old
    // approve_price_observation function. Preserve it byte-for-byte.
    await client.query(`INSERT INTO region_prices(product_id,plan_id,country_id,local_price,currency,price_usd,billing_platform,status)
      VALUES($1,$2,$3,99,'USD',99,'ios','published')`,[product.id,plans.get('individual').id,country.id]);
    const other=(await client.query("INSERT INTO products(slug,name) VALUES('other','Other') RETURNING *")).rows[0];
    const untouched=async()=>JSON.stringify((await client.query("SELECT row_to_json(p) AS row FROM products p WHERE id=$1 UNION ALL SELECT row_to_json(r) FROM region_prices r WHERE billing_platform='ios'",[other.id])).rows);
    const before=await untouched();
    const now=Date.now();
    const tierMarket=source.markets.find(m=>m.country_code==='AE');
    const tierFixture=JSON.parse(readFileSync(new URL('./fixtures/spotify-world.json',import.meta.url))).find(f=>f.country_code==='AE');
    const parsedTiers=parseSpotifyOfficialHtml(`<script id="__NEXT_DATA__">${JSON.stringify({props:{pageProps:tierFixture.props}})}</script>`,
      {countryCode:'AE',currency:'AED',finalUrl:tierMarket.url});
    assert.equal(parsedTiers.complete,true);
    const tierReview=()=>reviewOfficialWebMarket({client,source,market:tierMarket,database,sourceId});
    for(const hours of [24,12]) await insertMarketObservations({client,source,market:tierMarket,database,sourceId,force:true,
      snapshot:{ok:true,render_mode:'structured_http',http_status:200,final_url:tierMarket.url,user_agent:'GeoSub-test',
        content_hash:createHash('sha256').update(`ae-${hours}`).digest('hex'),captured_at:new Date(now-hours*3_600_000).toISOString(),parser_result:parsedTiers}});
    assert.equal((await tierReview()).published,0,'new tiers still require three independent samples');
    await insertMarketObservations({client,source,market:tierMarket,database,sourceId,force:true,
      snapshot:{ok:true,render_mode:'structured_http',http_status:200,final_url:tierMarket.url,user_agent:'GeoSub-test',
        content_hash:createHash('sha256').update('ae-0').digest('hex'),captured_at:new Date(now).toISOString(),parser_result:parsedTiers}});
    assert.equal((await tierReview()).decisions[0].reason,'current_exchange_rate_missing');
    await client.query("INSERT INTO exchange_rates(base_currency,quote_currency,rate,rate_date,is_latest,status) VALUES('USD','AED',3.6725,CURRENT_DATE,TRUE,'active')");
    assert.equal((await tierReview()).published,2,'a real same-plan US price is unavailable; do not invent or borrow one');
    const tierPrices=(await client.query(`SELECT p.slug,r.us_base_price,r.diff_vs_us_percent,r.local_price FROM region_prices r JOIN plans p ON p.id=r.plan_id WHERE p.slug IN ('standard','platinum') ORDER BY r.local_price`)).rows;
    assert.deepEqual(tierPrices.map(r=>[r.slug,Number(r.local_price),r.us_base_price,r.diff_vs_us_percent]),
      [['standard',23.99,null,null],['platinum',59.99,null,null]]);
    assert.equal((await client.query("SELECT count(*)::int n FROM plans WHERE slug IN ('standard','platinum') AND status='published'")).rows[0].n,2);
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
    let prices=(await client.query("SELECT * FROM region_prices WHERE billing_platform='web' AND country_id=$1 ORDER BY local_price",[country.id])).rows;
    assert.deepEqual(prices.map(r=>[Number(r.local_price),r.data_quality,r.status]),[[12.99,'verified','published'],[21.99,'verified','published']]);
    assert.equal((await client.query('SELECT status FROM products WHERE id=$1',[product.id])).rows[0].status,'published');
    const nigeria=source.markets.find(item=>item.country_code==='NG');
    const nigeriaSnapshot=hours=>({ok:true,render_mode:'structured_http',http_status:200,final_url:nigeria.url,user_agent:'GeoSub-test',
      content_hash:createHash('sha256').update(`ng-${hours}`).digest('hex'),captured_at:new Date(now-hours*3_600_000).toISOString(),
      parser_result:{parser_key:source.parser_key,parser_version:source.parser_version,complete:true,issues:[],candidates:[
        {plan_slug:'individual',raw_price:1600,currency:'NGN',billing_cycle:'monthly',observed_price_text:'₦1,600/month',evidence_text:'canonical NG individual monthly price',price_type:'list_price'},
        {plan_slug:'family',raw_price:2500,currency:'NGN',billing_cycle:'monthly',observed_price_text:'₦2,500/month',evidence_text:'canonical NG family monthly price',price_type:'list_price'}]}});
    for(const hours of [24,12,0]) await insertMarketObservations({client,source,market:nigeria,database,sourceId,snapshot:nigeriaSnapshot(hours),force:true});
    const noFx=await reviewOfficialWebMarket({client,source,market:nigeria,database,sourceId});
    assert.equal(noFx.published,0);
    assert.equal(noFx.decisions[0].reason,'current_exchange_rate_missing');
    await client.query(`INSERT INTO exchange_rates(base_currency,quote_currency,rate,rate_date,is_latest,status)
      VALUES('USD','NGN',1000,CURRENT_DATE,TRUE,'active')`);
    assert.equal((await reviewOfficialWebMarket({client,source,market:nigeria,database,sourceId})).published,2);
    const ngPrices=(await client.query(`SELECT local_price,currency,price_usd,us_base_price,diff_vs_us_percent
      FROM region_prices WHERE country_id=$1 AND billing_platform='web' ORDER BY local_price`,[database.countries.get('NG').id])).rows;
    assert.deepEqual(ngPrices.map(row=>[Number(row.local_price),row.currency,Number(row.price_usd),Number(row.us_base_price)]),
      [[1600,'NGN',1.6,12.99],[2500,'NGN',2.5,21.99]]);
    assert.ok(ngPrices.every(row=>Number(row.diff_vs_us_percent)<0));
    assert.equal((await review()).published,0,'review is idempotent');
    const retry=await collect(35);assert.equal(retry.inserted,0,'--force cannot manufacture close samples');
    const priceBeforeFailure=JSON.stringify(prices);
    await recordMarketFailure({client,source,market,database,sourceId,snapshot:snapshot(30),issues:['missing recurring period']});
    const isolated=await review();assert.equal(isolated.published,0);assert.ok(isolated.decisions.every(d=>d.decision==='isolated'));
    assert.equal(JSON.stringify((await client.query("SELECT * FROM region_prices WHERE billing_platform='web' AND country_id=$1 ORDER BY local_price",[country.id])).rows),priceBeforeFailure);
    await collect(24);await collect(12);await collect(0);
    assert.equal((await review()).published,2,'three newer clean samples recover automatically');
    assert.equal((await client.query("SELECT count(*)::int AS n FROM price_observations WHERE anomaly_flag AND status='ignored'")).rows[0].n,2);
    assert.equal(await untouched(),before,'iOS row and unrelated product unchanged');
    const audit=(await client.query("SELECT raw_payload->'automatic_review' AS audit FROM price_observations WHERE status='approved'")).rows;
    assert.ok(audit.every(x=>x.audit.observation_ids.length===3));
    // Actual source currency is independent of the country's default. Angola
    // charges USD; Korea has no Family card and must publish Individual alone.
    for(const [code,currency,prices] of [['AO','USD',[3.29,5.79]],['KR','KRW',[11990]]]) {
      const regional=source.markets.find(m=>m.country_code===code);
      for(const hours of [24,12,0]) {
        const sample=snapshot(hours);sample.final_url=regional.url;sample.content_hash=createHash('sha256').update(`${code}-${hours}`).digest('hex');
        sample.parser_result.candidates=sample.parser_result.candidates.slice(0,prices.length).map((c,i)=>({...c,currency,raw_price:prices[i]}));
        await insertMarketObservations({client,source,market:regional,database,sourceId,snapshot:sample,force:true});
      }
      if(code==='KR') await client.query("INSERT INTO exchange_rates(base_currency,quote_currency,rate,rate_date,is_latest) VALUES('USD','KRW',1400,CURRENT_DATE,TRUE)");
      const result=await reviewOfficialWebMarket({client,source,market:regional,database,sourceId});
      assert.equal(result.published,prices.length);
      const rows=(await client.query(`SELECT currency,local_price FROM region_prices WHERE country_id=$1 AND billing_platform='web' ORDER BY local_price`,[database.countries.get(code).id])).rows;
      assert.deepEqual(rows.map(r=>[r.currency,Number(r.local_price)]),prices.map(price=>[currency,price]));
    }
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

import {parseAppleMusicOfficialHtml} from './lib/apple-music-official-web.mjs';
test('real PostgreSQL Apple Music paused pilot resumes once; stable observations publish all plans and recover without changing other sources', {skip:!dsn},async()=>{
  const url=new URL(dsn);assert.ok(['localhost','127.0.0.1'].includes(url.hostname));assert.match(url.pathname,/^\/geosub_web_test/);
  const {Client}=createRequire(new URL('../../ai-price-site/package.json',import.meta.url))('pg');
  const client=new Client({connectionString:dsn});await client.connect();const schema=`apple_test_${process.pid}`;
  const source=JSON.parse(readFileSync(new URL('../data/official-web-price-sources.json',import.meta.url))).sources['apple-music'];
  const fixtures=JSON.parse(readFileSync(new URL('./fixtures/apple-music-plans.json',import.meta.url)));
  await client.query(`CREATE SCHEMA ${schema}; SET search_path=${schema},public`);
  try {
    for(const file of ['001_core_schema.sql','018_collector_job_runs.sql','043_public_product_lifecycle.sql','054_successful_collection_publication_gate.sql'])
      await client.query(readFileSync(new URL(`../sql/schema/${file}`,import.meta.url),'utf8'));
    await client.query("ALTER TABLE collector_jobs ADD COLUMN job_config JSONB DEFAULT '{}'::jsonb, ADD COLUMN priority INTEGER DEFAULT 50");
    const product=(await client.query("INSERT INTO products(slug,name,category,status) VALUES('apple-music','Apple Music','streaming','review') RETURNING *")).rows[0];
    const countries=(await client.query(`INSERT INTO countries(code,name_en,name_zh,currency) SELECT code,code,code,currency
      FROM jsonb_to_recordset($1::jsonb) AS c(code text,currency text) RETURNING *`,[JSON.stringify(source.markets.map(m=>({code:m.country_code,currency:m.currency})))])).rows;
    const plans=new Map();for(const slug of source.required_plan_slugs) {
      const p=(await client.query("INSERT INTO plans(product_id,slug,name,billing_cycle,status) VALUES($1,$2,$3,'monthly','review') RETURNING *",
        [product.id,slug,`Apple Music ${slug}`])).rows[0];plans.set(slug,p);
    }
    const database={product,plans,countries:new Map(countries.map(c=>[c.code,c]))};
    const sourceId=(await client.query(`INSERT INTO price_sources(source_key,name,type,provider,base_url,source_level,status)
      VALUES($1,'Apple official','official_page','Apple',$2,'A','active') RETURNING id`,[source.source_key,source.base_url])).rows[0].id;
    const job=(await client.query(`INSERT INTO collector_jobs(product_id,source_id,job_type,schedule,status,job_config)
      VALUES($1,$2,'streaming_pricing','daily','paused',$3::jsonb) RETURNING id`,[product.id,sourceId,JSON.stringify({collector_kind:'pricing_page',official_web_source_key:'apple-music',pilot:true})])).rows[0];
    const before=(await client.query('SELECT row_to_json(j) row FROM collector_jobs j WHERE id=$1',[job.id])).rows[0];
    assert.equal((await configureOfficialWebJob(client,source)).action,'update-required');
    assert.deepEqual((await client.query('SELECT row_to_json(j) row FROM collector_jobs j WHERE id=$1',[job.id])).rows[0],before,'dry-run never activates pilot');
    assert.equal((await configureOfficialWebJob(client,source,true)).jobId,job.id);
    assert.equal((await configureOfficialWebJob(client,source,true)).action,'existing');
    const config=(await client.query('SELECT * FROM collector_jobs WHERE id=$1',[job.id])).rows[0];
    assert.equal(config.status,'active');assert.equal(config.job_config.interval_hours,12);assert.equal(config.job_config.pilot,undefined);
    assert.equal((await client.query('SELECT count(*)::int n FROM collector_jobs')).rows[0].n,1);
    const market=source.markets[0],country=database.countries.get('US');
    await client.query(`INSERT INTO region_prices(product_id,plan_id,country_id,local_price,currency,price_usd,billing_platform,status)
      VALUES($1,$2,$3,99,'USD',99,'ios','published')`,[product.id,plans.get('individual').id,country.id]);
    const other=(await client.query("INSERT INTO products(slug,name) VALUES('other','Other') RETURNING *")).rows[0];
    const fingerprint=async()=>JSON.stringify((await client.query("SELECT row_to_json(p) row FROM products p WHERE id=$1 UNION ALL SELECT row_to_json(r) FROM region_prices r WHERE billing_platform='ios'",[other.id])).rows);
    const untouched=await fingerprint(),now=Date.now();
    const snap=(m,hours)=>({ok:true,render_mode:'structured_http',http_status:200,final_url:m.url,user_agent:'GeoSub-test',
      content_hash:createHash('sha256').update(`${m.country_code}-${hours}`).digest('hex'),captured_at:new Date(now-hours*3600000).toISOString(),
      parser_result:parseAppleMusicOfficialHtml(fixtures.find(f=>f.country_code===m.country_code).html,{countryCode:m.country_code,currency:m.currency,finalUrl:m.url})});
    const insert=(m,hours)=>insertMarketObservations({client,source,market:m,database,sourceId,force:true,snapshot:snap(m,hours)});
    const review=m=>reviewOfficialWebMarket({client,source,market:m,database,sourceId});
    // Retained pilot evidence cannot qualify, and is only resolved after the
    // same market/plan obtains a newly verified formal price.
    const legacySource={...source,parser_version:'apple-music-official-web-v1',auto_review:undefined,pilot:true};
    const legacySnap=snap(market,48);legacySnap.parser_result.parser_version=legacySource.parser_version;
    await insertMarketObservations({client,source:legacySource,market,database,sourceId,force:false,snapshot:legacySnap});
    for(const hours of [24,12])assert.equal((await insert(market,hours)).inserted,3);
    assert.equal((await review(market)).published,0);
    assert.equal((await client.query('SELECT status FROM products WHERE id=$1',[product.id])).rows[0].status,'review');
    assert.equal((await insert(market,12)).inserted,0,'force cannot invent independent samples');
    await insert(market,0);assert.equal((await review(market)).published,3);assert.equal((await review(market)).published,0);
    assert.equal((await client.query('SELECT status FROM products WHERE id=$1',[product.id])).rows[0].status,'published');
    assert.equal((await client.query("SELECT count(*)::int n FROM price_observations WHERE parser_version='apple-music-official-web-v1' AND status='ignored'")).rows[0].n,3,'legacy evidence is retained and resolved, never approved');
    assert.equal((await client.query("SELECT count(*)::int n FROM plans WHERE product_id=$1 AND status='published'",[product.id])).rows[0].n,3);
    assert.equal((await client.query("SELECT count(*)::int n FROM region_prices WHERE billing_platform='web' AND status='published' AND data_quality='verified'")).rows[0].n,3);
    const br=source.markets[1];for(const hours of [24,12,0])await insert(br,hours);
    assert.equal((await review(br)).decisions[0].reason,'current_exchange_rate_missing');
    await client.query("INSERT INTO exchange_rates(base_currency,quote_currency,rate,rate_date,status,is_latest) VALUES('USD','BRL',5,CURRENT_DATE,'active',TRUE)");
    assert.equal((await review(br)).published,3);
    assert.equal((await client.query("SELECT price_usd::float8,us_base_price::float8 FROM region_prices WHERE plan_id=$1 AND country_id=$2 AND billing_platform='web'",[plans.get('individual').id,database.countries.get('BR').id])).rows[0].price_usd,4.78);
    const jp=source.markets.find(m=>m.country_code==='JP');
    await recordMarketFailure({client,source,market:jp,database,sourceId,snapshot:{...snap(jp,48),http_status:503},issues:['page_unavailable']});
    for(const hours of [24,12])await insert(jp,hours);
    assert.equal((await review(jp)).decisions[0].decision,'isolated');
    await insert(jp,0);
    await client.query("INSERT INTO exchange_rates(base_currency,quote_currency,rate,rate_date,status,is_latest) VALUES('USD','JPY',150,CURRENT_DATE,'active',TRUE)");
    assert.equal((await review(jp)).published,3,'three later stable samples recover automatically');
    assert.equal(await fingerprint(),untouched,'iOS and other product rows are unchanged');
  } finally {await client.query(`DROP SCHEMA ${schema} CASCADE`);await client.end();}
});

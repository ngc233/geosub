import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fetchClaudeProSnapshot, claudeProRule, claudeProHelpUrl } from "../scripts/lib/claude-pro-official-web.mjs";
import { ensureSource, insertMarketObservations, recordMarketFailure } from "../scripts/collect-official-web-prices.mjs";
import { reviewOfficialWebMarket } from "../scripts/lib/official-web-auto-review.mjs";

export async function verifyClaudeProPilot(client) {
  assert.ok(['localhost','127.0.0.1','::1'].includes(client.connectionParameters.host));
  const scope = await client.query('SELECT current_database() AS name');
  assert.match(scope.rows[0].name,/^geosub_collector_test_claude_/);
  const registry = JSON.parse(await readFile(new URL('../data/official-web-price-sources.json',import.meta.url),'utf8'));
  const configured = registry.sources['claude-us-pro'];
  assert.equal(configured.auto_review,undefined);
  const source = {...configured,auto_review:{rule_id:claudeProRule,publish_product:false}};
  const market = source.markets[0];
  const pricing = await readFile(new URL('../scripts/fixtures/claude-pro-pricing.html',import.meta.url),'utf8');
  const help = await readFile(new URL('../scripts/fixtures/claude-pro-help.html',import.meta.url),'utf8');
  const epoch = Date.now();
  async function snapshot(hours, price=20) {
    const body=pricing.replace('data-plan="pro_monthly">$20','data-plan="pro_monthly">$'+price);
    return fetchClaudeProSnapshot(market,{
      now:()=>new Date(epoch-hours*3_600_000),
      fetchImpl:async url=>new Response(url===market.url?body:help.replace('$20','$'+price),{
        headers:{'content-type':'text/html'},
      }),
    });
  }
  const product=(await client.query("INSERT INTO products(slug,name,category,status) VALUES('claude','Claude fixture','ai','review') RETURNING id,status")).rows[0];
  const plan=(await client.query("INSERT INTO plans(product_id,slug,name,billing_cycle,status) VALUES($1,'pro','Pro','monthly','review') RETURNING id",[product.id])).rows[0];
  const country=(await client.query("INSERT INTO countries(code,name_zh,name_en,currency) VALUES('US','美国','United States','USD') RETURNING id")).rows[0];
  const database={product,plans:new Map([['pro',plan]]),countries:new Map([['US',country]])};
  const sourceId=await ensureSource(client,source);
  const context={client,source,market,database,sourceId};
  const baselineDate=new Date(epoch-72*3_600_000);
  for(const [platform,price] of [['web',20],['ios',99]]) {
    await client.query(`INSERT INTO region_prices(product_id,plan_id,country_id,local_price,currency,price_usd,
      billing_platform,price_type,primary_source_id,status,data_quality,last_checked_at)
      VALUES($1,$2,$3,$4,'USD',$4,$5,'list_price',$6,'published','verified',$7)`,
      [product.id,plan.id,country.id,price,platform,sourceId,baselineDate]);
  }
  const priceRow=async platform=>(await client.query("SELECT * FROM region_prices WHERE product_id=$1 AND billing_platform=$2",[product.id,platform])).rows[0];
  const initial=await priceRow('web');
  await insertMarketObservations({...context,source:configured,snapshot:await snapshot(100),force:false});
  const pending=(await client.query('SELECT raw_payload,status FROM price_observations')).rows[0];
  assert.equal(pending.raw_payload.publication_eligible,false);assert.equal(pending.status,'pending');
  await recordMarketFailure({...context,snapshot:await snapshot(49),issues:['parser_changed_fixture']});
  assert.equal((await reviewOfficialWebMarket(context)).published,0);
  assert.deepEqual(await priceRow('web'),initial);
  for(const hours of [25,13,1]) await insertMarketObservations({...context,snapshot:await snapshot(hours),force:false});
  const latest=(await client.query('SELECT * FROM price_observations ORDER BY observed_at DESC LIMIT 1')).rows[0];
  assert.equal((await client.query('SELECT count(*)::int AS n FROM source_evidence WHERE observation_id=$1',[latest.id])).rows[0].n,2);
  await client.query('DELETE FROM source_evidence WHERE observation_id=$1 AND final_url=$2',[latest.id,claudeProHelpUrl]);
  assert.equal((await reviewOfficialWebMarket(context)).published,0);
  assert.deepEqual(await priceRow('web'),initial);
  await client.query(`INSERT INTO source_evidence(observation_id,evidence_type,content_hash,captured_at,http_status,final_url,country_context)
    VALUES($1,'html',$2,$3,200,$4,'US')`,[latest.id,latest.raw_payload.support_content_hash,latest.observed_at,claudeProHelpUrl]);
  assert.equal((await reviewOfficialWebMarket(context)).published,1);
  assert.equal(Number((await priceRow('web')).local_price),20);
  assert.equal(Number((await priceRow('ios')).local_price),99);
  assert.equal((await client.query('SELECT status FROM products WHERE id=$1',[product.id])).rows[0].status,'review');
  assert.equal((await client.query("SELECT count(*)::int AS n FROM price_observations WHERE anomaly_flag AND status='ignored'")).rows[0].n,1);
  assert.equal((await reviewOfficialWebMarket(context)).published,0);
  assert.equal((await insertMarketObservations({...context,snapshot:await snapshot(1),force:true})).inserted,0);
  // These dates and prices are synthetic fixtures in the disposable DB only.
  await client.query('DELETE FROM price_observations WHERE product_id=$1',[product.id]);
  for(const hours of [25,13,1]) await insertMarketObservations({...context,snapshot:await snapshot(hours,30),force:false});
  assert.equal((await reviewOfficialWebMarket(context)).published,0);
  assert.equal(Number((await priceRow('web')).local_price),20);
  await client.query('DELETE FROM price_observations WHERE product_id=$1',[product.id]);
  for(const hours of [73,55,37,19,1]) await insertMarketObservations({...context,snapshot:await snapshot(hours,30),force:false});
  assert.equal((await reviewOfficialWebMarket(context)).published,1);
  assert.equal(Number((await priceRow('web')).local_price),30);
  return {passed:true,publication:'isolated fixtures only',cases:[
    'normal configuration pending-only','failed evidence preserves last verified price','two-document evidence retained',
    'missing corroboration blocks publication','three independent samples recover automatically',
    'iOS prices unchanged','product lifecycle unchanged','old anomaly automatically superseded',
    'idempotent review and forced retry deduplication','large change waits for five samples across 72h',
  ]};
}
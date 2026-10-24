#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertAutomaticWebSource } from './lib/official-web-auto-review.mjs';
import { spotifyRegistry } from './lib/spotify-official-web.mjs';
import { loadDatabaseContext, ensureSource, loadEnvFile } from './collect-official-web-prices.mjs';

export async function configureOfficialWebJob(client, source, execute=false) {
  assertAutomaticWebSource(source);
  await client.query(execute ? 'BEGIN' : 'BEGIN READ ONLY');
  try {
    await client.query("SET LOCAL lock_timeout='3s'; SET LOCAL statement_timeout='15s'");
    const countryCodes=source.markets.map(market=>market.country_code);
    // This reviewed catalog only fills absent countries. Never rewrite a
    // country's default currency to match Spotify's actual charge currency.
    const additions=Object.entries(spotifyRegistry.catalog_additions)
      .filter(([code])=>countryCodes.includes(code));
    if(execute) for(const [code,row] of additions) {
      await client.query(`INSERT INTO countries(code,name_en,name_zh,currency,region)
        VALUES($1,$2,$3,$4,$5) ON CONFLICT(code) DO NOTHING`,
        [code,row.name_en,row.name_zh,row.currency,row.region]);
    }
    const database=await loadDatabaseContext(client,source,countryCodes,execute?[]:additions.map(([code])=>code));
    const catalogAdditions=additions.filter(([code])=>!database.countries.has(code)).map(([code,row])=>({code,...row}));
    if (!['draft','review','published'].includes(database.product.status)) throw Error('official_web_product_not_active');
    if (execute) await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`configure_official_web:${database.product.id}`]);
    const jobs=await client.query(`SELECT j.id,j.status,j.job_config FROM collector_jobs j
      LEFT JOIN price_sources s ON s.id=j.source_id WHERE j.product_id=$1 AND j.status<>'archived'
      AND (j.job_config->>'collector_kind' IN ('app_store','pricing_page','official_site') OR s.type='official_page') ${execute?'FOR UPDATE OF j':''}`,[database.product.id]);
    const config={collector_kind:'pricing_page',official_web_source_key:'spotify',country_codes:countryCodes,
      interval_hours:12,url:source.base_url,automatic_review_rule:source.auto_review.rule_id};
    if (jobs.rows.length) {
      if (jobs.rows.length !== 1 || jobs.rows[0].job_config.official_web_source_key !== 'spotify'
        || jobs.rows[0].status !== 'active') throw Error('official_web_existing_job_requires_explicit_resolution');
      const current=jobs.rows[0].job_config;
      const matches=JSON.stringify(current.country_codes)===JSON.stringify(countryCodes)
        && current.automatic_review_rule===config.automatic_review_rule;
      if (!matches && execute) await client.query(`UPDATE collector_jobs SET
        job_config=job_config||jsonb_build_object('country_codes',$2::jsonb,'automatic_review_rule',$3::text)
        WHERE id=$1`,[jobs.rows[0].id,JSON.stringify(countryCodes),config.automatic_review_rule]);
      await client.query('COMMIT');return {action:matches?'existing':execute?'updated':'update-required',
        product:source.product_slug,jobId:jobs.rows[0].id,config:matches?undefined:config,
        ...(catalogAdditions.length?{catalogAdditions}:{})};
    }
    let jobId=null;
    if(execute){
      const sourceId=await ensureSource(client,source);
      const result=await client.query(`INSERT INTO collector_jobs(id,product_id,source_id,job_type,schedule,status,priority,next_run_at,job_config)
        VALUES(gen_random_uuid(),$1,$2,'streaming_pricing','daily','active',10,NOW(),$3::jsonb) RETURNING id`,
        [database.product.id,sourceId,JSON.stringify(config)]);
      jobId=result.rows[0].id;
    }
    await client.query('COMMIT');return {action:execute?'created':'dry-run',product:source.product_slug,jobId,config,
      ...(catalogAdditions.length?{catalogAdditions}:{})};
  }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}
}

async function main(){
  const args=process.argv.slice(2);
  if(!args.includes('--source-key') || args[args.indexOf('--source-key')+1]!=='spotify') throw Error('Explicit --source-key spotify required');
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
  loadEnvFile(path.join(root,'ai-price-site/.env.local'));loadEnvFile(path.join(root,'ai-price-site/.env'));
  const {Client}=createRequire(path.join(process.env.GEOSUB_FRONTEND_DIR || path.join(root,'ai-price-site'),'package.json'))('pg');
  if(!process.env.DATABASE_URL) throw Error('DATABASE_URL is not set');
  const source=JSON.parse(readFileSync(path.join(root,'geosub-backend/data/official-web-price-sources.json'))).sources.spotify;
  const client=new Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:5000});
  try {await client.connect();console.log(JSON.stringify(await configureOfficialWebJob(client,source,args.includes('--execute'))));}
  finally{await client.end().catch(()=>{});}
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) main().catch(()=>{
  console.error('Official Web job configuration failed; no credentials logged.');process.exitCode=1;
});

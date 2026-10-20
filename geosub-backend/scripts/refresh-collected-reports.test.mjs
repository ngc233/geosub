import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {refreshCollectedReports,reportPaths,reportLocales} from './refresh-collected-reports.mjs';
const env={GEOSUB_CONTENT_DISTRIBUTION:'cloudflare',GEOSUB_WEB_HEALTH_URL:'http://127.0.0.1:3001/api/health',GEOSUB_CONTENT_CF_ZONE_ID:'a'.repeat(32),GEOSUB_CONTENT_CF_API_TOKEN:'test-token',GEOSUB_CONTENT_CACHE_POLICY:'audited-single-url',GEOSUB_FRONTEND_DIR:'/isolated/app'};
const read=()=>JSON.stringify({preview:{previewModeId:'b'.repeat(32)}});
test('only completed products: origin before edge, all locales, separate credentials, duplicate collapsed',async()=>{
 const calls=[];
 const http=async(url,options)=>{calls.push({url,options});return url.startsWith('http:')?new Response('pdf',{headers:{'content-type':'application/pdf'}}):Response.json({success:true});};
 assert.deepEqual(await refreshCollectedReports(['viki','viki'],env,http,read),{mode:'refreshed',products:1,reports:12});
 assert.equal(calls.length,13);
 for(const c of calls.slice(0,12)){assert.ok(c.url.startsWith('http://127.0.0.1:3001/reports/'));assert.ok(c.options.headers['x-prerender-revalidate']);assert.equal(c.options.headers.Authorization,undefined);assert.equal(c.options.redirect,'error');}
 const purge=calls.at(-1);assert.equal(purge.options.headers['x-prerender-revalidate'],undefined);assert.match(purge.url,/^https:\/\/api.cloudflare.com\//);assert.deepEqual(JSON.parse(purge.options.body),{files:reportPaths('viki').map(p=>'https://geosub.org'+p)});
});
test('quarantined-empty 404 still purges previous report; transient purge retries automatically',async()=>{
 let purges=0;const http=async url=>url.startsWith('http:')?new Response(null,{status:404}):Response.json({success:++purges>1});
 await refreshCollectedReports(['reelshort'],env,http,read);assert.equal(purges,2);
});
test('bounded failures visible, no edge purge before origin succeeds, invalid scopes make no requests',async()=>{
 let edge=0;await assert.rejects(refreshCollectedReports(['viki'],env,async url=>{if(url.startsWith('https:'))edge++;return new Response(null,{status:500});},read),/3 attempts/);assert.equal(edge,0);
 for(const slug of ['../admin','viki?x=1','https://outside.test',''])assert.throws(()=>reportPaths(slug));
 await assert.rejects(refreshCollectedReports(['viki'],{...env,GEOSUB_WEB_HEALTH_URL:'https://outside.test'},()=>{throw Error('must not request');},read),/Loopback/);
 assert.equal((await refreshCollectedReports(['viki'],{},()=>{throw Error('must not request');},read)).mode,'inactive');
});
test('scheduler hook follows successful review and full locale inventory matches frontend',()=>{
 const runner=fs.readFileSync(new URL('./run-collector-jobs.ps1',import.meta.url),'utf8');
 assert.ok(runner.indexOf('refresh-collected-reports.mjs')>runner.indexOf('$reportRefreshProducts = @($pendingAppStoreCompletions'));
 assert.match(runner,/if \(\$LASTEXITCODE -ne 0\)/);
 const locales=fs.readFileSync(new URL('../../ai-price-site/lib/site-locale.ts',import.meta.url),'utf8');
 const launched=locales.match(/export const launchedSiteLocales = \[([\s\S]*?)\]/)[1].match(/"([\w-]+)"/g).map(s=>JSON.parse(s));
 assert.deepEqual(reportLocales,launched);
 const route=fs.readFileSync(new URL('../../ai-price-site/app/reports/[locale]/[filename]/route.ts',import.meta.url),'utf8');
 assert.doesNotMatch(route,/stale-while-revalidate/);assert.match(route,/Cloudflare-CDN-Cache-Control.*max-age=300/);
});

test('CLI executes through deployment symlink and propagates invalid-configuration failure',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'geosub-report-cli-'));
 try {
  const linked=path.join(dir,'live');
  fs.symlinkSync(path.dirname(fileURLToPath(import.meta.url)),linked,'dir');
  const entry=path.join(linked,'refresh-collected-reports.mjs');
  const inactive=spawnSync(process.execPath,[entry,'--products-json','["viki"]'],{encoding:'utf8',env:{...process.env,GEOSUB_CONTENT_DISTRIBUTION:'local'}});
  assert.equal(inactive.status,0);assert.match(inactive.stdout,/"mode":"inactive"/);
  const invalid=spawnSync(process.execPath,[entry,'--products-json','["viki"]'],{encoding:'utf8',env:{...process.env,GEOSUB_CONTENT_DISTRIBUTION:'cloudflare',GEOSUB_WEB_HEALTH_URL:'not-a-url'}});
  assert.equal(invalid.status,1);assert.match(invalid.stderr,/Automatic report cache refresh failed/);
 } finally {fs.rmSync(dir,{recursive:true,force:true});}
});

// Read-only deployment smoke test: load actual dependencies and query the DB.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const backend = fs.realpathSync(process.env.GEOSUB_BACKEND_DIR || path.resolve(import.meta.dirname, '..'));
const frontend = fs.realpathSync(process.env.GEOSUB_FRONTEND_DIR);
const requireSite = createRequire(path.join(frontend, 'package.json'));
const requireBackend = createRequire(path.join(backend, 'package.json'));
requireBackend('playwright-core');
const { Client } = requireSite('pg');
const client = new Client({connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000});
try {
  await client.connect();
  await client.query('BEGIN READ ONLY');
  await client.query("SET LOCAL statement_timeout = '5s'");
  const result = await client.query("SELECT to_regclass('public.collector_jobs') IS NOT NULL AND to_regprocedure('reconcile_app_store_identity_ambiguities(text)') IS NOT NULL AS ready");
  if (!result.rows[0].ready) throw Error('Collector database contract unavailable');
  await client.query('ROLLBACK');
  const runtime = process.env.GEOSUB_WEB_RUNTIME_FILE ? JSON.parse(fs.readFileSync(process.env.GEOSUB_WEB_RUNTIME_FILE,'utf8')) : {app:frontend,dist:process.env.GEOSUB_NEXT_DIST_DIR || '.next',healthUrl:process.env.GEOSUB_WEB_HEALTH_URL};
  const health = new URL(runtime.healthUrl);
  if (health.protocol !== 'http:' || health.hostname !== '127.0.0.1' || !health.port) throw Error('Local web runtime unavailable');
  const preview = JSON.parse(fs.readFileSync(path.join(runtime.app,runtime.dist,'prerender-manifest.json'),'utf8')).preview?.previewModeId;
  if (!preview) throw Error('Web report runtime unavailable');
  const response = await fetch(health,{redirect:'error',signal:AbortSignal.timeout(5000)});
  if (!response.ok || (await response.json()).status !== 'ok') throw Error('Web health check failed');
  console.log(JSON.stringify({status:'ok',backend,frontend:runtime.app,webPort:health.port,database:'read-only-ok'}));
} catch { console.error('Collector runtime check failed; no credentials logged.'); process.exitCode=1; }
finally {await client.end().catch(()=>{});}

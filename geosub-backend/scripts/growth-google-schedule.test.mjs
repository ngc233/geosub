import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { googleCollectionWindow } from './growth-google-window.mjs';

test('collection window uses Pacific calendar dates across year and DST boundaries',()=>{
 assert.deepEqual(googleCollectionWindow(new Date('2026-09-05T06:59:00Z')), {startDate:'2026-08-05',endDate:'2026-09-01'});
 assert.deepEqual(googleCollectionWindow(new Date('2026-09-05T07:00:00Z')), {startDate:'2026-08-06',endDate:'2026-09-02'});
 assert.deepEqual(googleCollectionWindow(new Date('2026-01-01T08:00:00Z')), {startDate:'2025-12-02',endDate:'2025-12-29'});
 assert.deepEqual(googleCollectionWindow(new Date('2026-03-09T07:00:00Z')), {startDate:'2026-02-07',endDate:'2026-03-06'});
});

test('scheduled collection replaces latest only after success and refuses half configured dates',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'geosub-google-'));
 try{
  const scripts=path.join(dir,'scripts');const output=path.join(dir,'out');mkdirSync(scripts);mkdirSync(output);
  const latest=path.join(output,'google-shadow-latest.json');writeFileSync(latest,'old snapshot');
  writeFileSync(path.join(scripts,'growth-google-window.mjs'),'console.log("2026-08-06 2026-09-02");');
  writeFileSync(path.join(scripts,'growth-google-shadow.mjs'),`import fs from 'node:fs';if(process.env.FAIL==='true')process.exit(7);if(process.env.GEOSUB_GOOGLE_ACCESS_TOKEN||process.env.GEOSUB_GOOGLE_TOKEN_FILE)process.exit(8);fs.writeFileSync(process.env.GEOSUB_GOOGLE_OUTPUT_FILE,JSON.stringify({start:process.env.GEOSUB_GOOGLE_START_DATE,end:process.env.GEOSUB_GOOGLE_END_DATE}));`);
  const wrapper=fileURLToPath(new URL('../deploy/linux-arm64/run-growth-google-shadow.sh',import.meta.url));
  const env={PATH:path.dirname(process.execPath)+path.delimiter+(process.env.PATH||''),GEOSUB_ENV_FILE:path.join(dir,'missing.env'),GEOSUB_GROWTH_GOOGLE_ENABLED:'true',GEOSUB_BACKEND_DIR:dir,GEOSUB_GROWTH_OUTPUT_DIR:output,GEOSUB_GOOGLE_ACCESS_TOKEN:'should-be-unset',GEOSUB_GOOGLE_TOKEN_FILE:'should-be-unset'};
  let result=spawnSync('bash',[wrapper],{env:{...env,FAIL:'true'},encoding:'utf8'});
  assert.equal(result.status,7);assert.equal(readFileSync(latest,'utf8'),'old snapshot');
  result=spawnSync('bash',[wrapper],{env:{...env,GEOSUB_GOOGLE_START_DATE:'2026-08-06'},encoding:'utf8'});
  assert.equal(result.status,1);assert.equal(readFileSync(latest,'utf8'),'old snapshot');
  result=spawnSync('bash',[wrapper],{env,encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);assert.deepEqual(JSON.parse(readFileSync(latest,'utf8')),{start:'2026-08-06',end:'2026-09-02'});
  assert.ok(!readdirSync(output).some(n=>n.startsWith('.google-shadow-latest')));
 } finally {rmSync(dir,{recursive:true,force:true});}
});

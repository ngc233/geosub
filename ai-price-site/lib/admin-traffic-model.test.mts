import test from 'node:test';
import assert from 'node:assert/strict';
import { trafficDelta,trafficPaths,validateTrafficSnapshot,trafficCsv,trafficScreeningComplete, type TrafficDay } from './admin-traffic-model.ts';
import { readFileSync,readdirSync } from 'node:fs';
import path from 'node:path';
import type * as TypeScript from 'typescript';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const ts:typeof import('typescript')=require('typescript');
test('comparison distinguishes zero, missing and a measured change',()=>{assert.equal(trafficDelta(0,10),-100);assert.equal(trafficDelta(10,0),null);assert.equal(trafficDelta(null,10),null);assert.equal(trafficDelta(15,10),50);});
test('missing chart observations split paths and zero remains a point',()=>{const p=trafficPaths([{x:0,y:2},{x:10,y:0},{x:20,y:null},{x:30,y:4}]);assert.equal(p.length,2);assert.match(p[0],/10,0$/);assert.equal(p[1],'M30,4');});
test('smooth line cannot invent a peak at a turning point',()=>{const p=trafficPaths([{x:0,y:0},{x:3,y:9},{x:6,y:0}])[0];assert.equal(p,'M0,0 C1,3 2,9 3,9 C4,9 5,3 6,0');});
test('invalid or duplicate snapshot data is rejected',()=>{assert.throws(()=>validateTrafficSnapshot({}));assert.throws(()=>validateTrafficSnapshot({version:1,timezone:'UTC',capturedAt:'2026-10-15',totals:[],days:[{date:'2026-10-15',pv:-1}]}));});
const screenedDay:TrafficDay={date:'2026-11-03',pv:20,suspected:70,excluded_views:10,screened_views:100,raw_views:130,uv:4,sessions:5,consented_views:6,missing_session:0};
test('partial screening and legacy snapshots cannot masquerade as complete clean traffic',()=>{
 const snap={version:2,timezone:'UTC',capturedAt:'2026-11-03T12:00:00Z',days:[screenedDay],totals:[]};
 assert.equal(validateTrafficSnapshot(snap).days[0].pv,20);
 assert.equal(trafficScreeningComplete(screenedDay),false);
 assert.equal(trafficScreeningComplete({...screenedDay,raw_views:100}),true);
 assert.throws(()=>validateTrafficSnapshot({...snap,version:1}));
 for(const invalid of [{...screenedDay,screened_views:140},{...screenedDay,pv:21},{...screenedDay,screened_views:null},{...screenedDay,suspected:-1}])assert.throws(()=>validateTrafficSnapshot({...snap,days:[invalid]}));
 assert.throws(()=>validateTrafficSnapshot({...snap,days:[screenedDay,screenedDay]}));
});
test('CSV distinguishes missing, zero, partial coverage and the new independent metrics',()=>{
 const missing={...screenedDay,date:'2026-11-02',pv:null,suspected:null,screened_views:null,excluded_views:null};
 const zero={...screenedDay,pv:0,suspected:0,excluded_views:0,screened_views:0,raw_views:0};
 const csv=trafficCsv([missing,screenedDay,zero],'2026-11-03T12:00:00Z','fixture, "local"');
 assert.match(csv,/pv_screened,suspected_automation,other_excluded/);
 assert.match(csv,/"2026-11-02","","","","","130","no"/);
 assert.match(csv,/"2026-11-03","20","70","10","100","130","no"/);
 assert.match(csv,/"2026-11-03","0","0","0","0","0","yes"/);
 assert.match(csv,/"fixture, ""local"""/);
});
function files(dir:string):string[]{return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);}
test('all admin mutation forms use the shared capability boundary, read filters stay native',()=>{
 let writes=0,reads=0;
 for(const file of files('app/admin').filter(f=>f.endsWith('.tsx'))){const s=readFileSync(file,'utf8'),ast=ts.createSourceFile(file,s,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 function visit(n:TypeScript.Node){if(ts.isJsxOpeningElement(n)){const tag=n.tagName.getText(ast),attrs=n.attributes.properties;const action=attrs.find((a):a is TypeScript.JsxAttribute=>ts.isJsxAttribute(a)&&a.name.getText(ast)==='action'),method=attrs.find((a):a is TypeScript.JsxAttribute=>ts.isJsxAttribute(a)&&a.name.getText(ast)==='method');if(tag==='AdminActionForm')writes++;if(tag==='form'){reads++;assert.ok(!(action?.initializer&&ts.isJsxExpression(action.initializer))&&method?.initializer?.getText(ast)!=='"post"',`${file} has unguarded write form`);}}ts.forEachChild(n,visit);}visit(ast);
 }assert.ok(writes>=60);assert.ok(reads>=3);
 const settings=readFileSync('app/admin/settings/page.tsx','utf8');assert.match(settings,/<AdminActionForm capability="account" action=\{updateAdminPassword\}/);
});

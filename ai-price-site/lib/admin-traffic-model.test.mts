import test from 'node:test';
import assert from 'node:assert/strict';
import { trafficDelta,trafficPaths,validateTrafficSnapshot } from './admin-traffic-model.ts';
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
function files(dir:string):string[]{return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(dir,e.name)):[path.join(dir,e.name)]);}
test('all admin mutation forms use the shared capability boundary, read filters stay native',()=>{
 let writes=0,reads=0;
 for(const file of files('app/admin').filter(f=>f.endsWith('.tsx'))){const s=readFileSync(file,'utf8'),ast=ts.createSourceFile(file,s,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 function visit(n:TypeScript.Node){if(ts.isJsxOpeningElement(n)){const tag=n.tagName.getText(ast),attrs=n.attributes.properties;const action=attrs.find((a):a is TypeScript.JsxAttribute=>ts.isJsxAttribute(a)&&a.name.getText(ast)==='action'),method=attrs.find((a):a is TypeScript.JsxAttribute=>ts.isJsxAttribute(a)&&a.name.getText(ast)==='method');if(tag==='AdminActionForm')writes++;if(tag==='form'){reads++;assert.ok(!(action?.initializer&&ts.isJsxExpression(action.initializer))&&method?.initializer?.getText(ast)!=='"post"',`${file} has unguarded write form`);}}ts.forEachChild(n,visit);}visit(ast);
 }assert.ok(writes>=60);assert.ok(reads>=3);
 const settings=readFileSync('app/admin/settings/page.tsx','utf8');assert.match(settings,/<AdminActionForm capability="account" action=\{updateAdminPassword\}/);
});

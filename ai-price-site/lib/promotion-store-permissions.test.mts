import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import * as policy from './first-party-promotion.ts';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = ts.transpileModule(readFileSync(new URL('./first-party-promotion-store.ts',import.meta.url),'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function load(role:string) {
 let writes=0; const audits:unknown[]=[];
 const result={exports:{} as {mutatePromotion:(f:FormData)=>Promise<unknown>}};
 const mocks:Record<string,unknown>={
  'server-only':{},'@prisma/client':{},'./prisma':{prisma:{auditLog:{create:async(data:unknown)=>{audits.push(data);}},$transaction:async()=>{writes++;}}},
  './admin-auth':{requireAdmin:async()=>({id:'test-actor',role})},
  './first-party-promotion':{...policy,promotionRuntime:()=>true,preproductionRuntime:()=>false},
 };
 vm.runInNewContext('(function(require,module,exports){'+source+'\n})')((name:string)=>name in mocks?mocks[name]:require(name),result,result.exports);
 return {mutate:result.exports.mutatePromotion,writes:()=>writes,audits};
}
for(const role of ['OWNER','EDITOR','VIEWER']) test(`${role}: read cannot be submitted as a mutation`,async()=>{
 const s=load(role),f=new FormData(); f.set('operation','read');f.set('generation','0');f.set('reason','test');
 await assert.rejects(s.mutate(f)); assert.equal(s.writes(),0);
});
for(const role of ['EDITOR','VIEWER']) for(const op of ['review','enable','pause','off']) test(`${role} denied ${op} before DB access`,async()=>{ const s=load(role),f=new FormData();f.set('operation',op);await assert.rejects(s.mutate(f));assert.equal(s.writes(),0); });
test('viewer cannot save drafts',async()=>{const s=load('VIEWER'),f=new FormData();f.set('operation','draft');await assert.rejects(s.mutate(f));assert.equal(s.writes(),0);});

test('foundation enable denied before transaction and failure audit excludes input',async()=>{
 const s=load('OWNER'),f=new FormData(); f.set('operation','enable');f.set('generation','0');f.set('reason','valid reason');f.set('evidence','private-test-evidence');
 await assert.rejects(s.mutate(f),/真实推广禁止启用/); assert.equal(s.writes(),0); assert.equal(s.audits.length,1);
 assert.match(JSON.stringify(s.audits),/promotion_failed/);assert.doesNotMatch(JSON.stringify(s.audits),/private-test-evidence|valid reason/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require=createRequire(import.meta.url),ts=require('typescript');
const source=ts.transpileModule(readFileSync(new URL('../app/api/promotions/home/route.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
test('foundation public API is empty without database access, including database failure',async()=>{
 let databaseCalls=0;const result={exports:{} as {GET:(r:Request)=>Promise<Response>}};
 const mocks:Record<string,unknown>={
 '../../../../lib/first-party-promotion':{preproductionRuntime:()=>false,publicPromotion:()=>{throw Error('must not resolve a card');}},
 '../../../../lib/first-party-promotion-store':{},
 '../../../../lib/prisma':{prisma:{$transaction:()=>{databaseCalls++;throw Error('database unavailable');}}},
 };
 // Web platform globals are injected separately for the server handler.
 const context={require:(name:string)=>mocks[name],module:result,exports:result.exports,URL,Response};
 vm.runInNewContext(source,context);
 for(const suffix of ['?path=%2Fzh','?path=/en','']){
  const response=await result.exports.GET(new Request('http://localhost/api/promotions/home'+suffix));
  assert.equal(response.status,200);assert.deepEqual(await response.json(),{card:null});
  for(const name of ['Cache-Control','CDN-Cache-Control','Cloudflare-CDN-Cache-Control'])assert.match(response.headers.get(name)||'',/no-store/);
 }
 assert.equal(databaseCalls,0);
});

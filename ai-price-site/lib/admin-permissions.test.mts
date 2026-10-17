import test from 'node:test';
import assert from 'node:assert/strict';
import { canAdmin } from './admin-permissions.ts';
import { workspaceStatus, type WorkspaceRow } from './admin-workspace-model.ts';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';
const require=createRequire(import.meta.url),ts=require('typescript');
const auth=ts.transpileModule(readFileSync(new URL('./admin-auth.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
for(const role of ['OWNER','EDITOR','VIEWER','UNKNOWN'])test(`server auth enforces ${role} capabilities`,async()=>{
 const result={exports:{} as {requireAdmin:(cap?:string)=>Promise<unknown>}};
 const mocks:Record<string,unknown>={'server-only':{},'@prisma/client':{},'./admin-permissions':{canAdmin},'next/headers':{cookies:async()=>({get:()=>({value:'test-only-session'})})},'next/navigation':{redirect:(url:string)=>{throw Error('redirect:'+url);}},'./prisma':{prisma:{adminSession:{findUnique:async()=>({expiresAt:new Date(Date.now()+60000),user:{id:'test',status:'ACTIVE',role}})}}}};
 vm.runInNewContext('(function(require,module,exports){'+auth+'\n})')((name:string)=>name in mocks?mocks[name]:require(name),result,result.exports);
 for(const cap of ['read','draft','manage','account'] as const){const promise=result.exports.requireAdmin(cap);if(canAdmin(role,cap))await promise;else await assert.rejects(promise,/permission=denied/);}
});
test('write boundary does not infer permissions from an unknown role',()=>{assert.equal(canAdmin('VIEWER','draft'),false);assert.equal(canAdmin('EDITOR','manage'),false);assert.equal(canAdmin('OWNER','manage'),true);});
const row:WorkspaceRow={id:'x',slug:'x',name:'X',publish_status:'published',price_count:4,stale_count:2,latest_checked:null,job_count:1,running_count:1,failed_count:0,queued_count:0};
test('published and running do not erase stale price action',()=>{const s=workspaceStatus(row,false);assert.equal(s.publication,'已发布');assert.equal(s.collection,'采集执行中');assert.equal(s.needsAction,true);assert.equal(s.progress,true);});
test('partial snapshot never treats missing operational records as known failure',()=>{const s=workspaceStatus({...row,stale_count:0,failed_count:3},true);assert.equal(s.needsAction,false);assert.equal(s.progress,false);assert.equal(s.collection,'未导入采集记录');});

for (const route of ['pipeline/collect','review/collect','search-demand/authority-collect']) {
 for (const role of ['EDITOR','VIEWER']) test(`${route} rejects ${role} before reading request or queuing`, async()=>{
  const code=ts.transpileModule(readFileSync(new URL(`../app/admin/${route}/route.ts`,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const mod={exports:{} as {POST:(request:unknown)=>Promise<Response>}};
  vm.runInNewContext('(function(require,module,exports){'+code+'\n})',{Response})((name:string)=>name.endsWith('admin-auth')?{requireAdmin:async()=>({role})}:name.endsWith('admin-permissions')?{canAdmin}:new Proxy({},{get(){throw Error('Collector dependency accessed before permission check');}}),mod,mod.exports);
  const response=await mod.exports.POST({formData:()=>{throw Error('Unauthorized form was read');}});
  assert.equal(response.status,403);
 });
}
test('review publication is not mislabeled as a draft',()=>assert.equal(workspaceStatus({...row,publish_status:'review'},false).publication,'审核中'));

test('published product with no prices needs review, draft without prices does not',()=>{assert.equal(workspaceStatus({...row,price_count:0,stale_count:0},true).needsAction,true);assert.equal(workspaceStatus({...row,publish_status:'draft',price_count:0,stale_count:0},true).needsAction,false);});

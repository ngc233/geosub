import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADMIN_ROLE_CAPABILITIES,
  DOMAIN_ADMIN_CAPABILITIES,
  assertAdminCapability,
  canAdmin,
  listAdminRoleDomainCapabilities,
} from './admin-permissions.ts';
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
 for(const cap of ['read','draft','manage','account',...DOMAIN_ADMIN_CAPABILITIES] as const){const promise=result.exports.requireAdmin(cap);if(canAdmin(role,cap))await promise;else await assert.rejects(promise,/permission=denied/);}
});
test('write boundary does not infer permissions from an unknown role',()=>{assert.equal(canAdmin('VIEWER','draft'),false);assert.equal(canAdmin('EDITOR','manage'),false);assert.equal(canAdmin('OWNER','manage'),true);});

test('fine-grained domain RBAC matrix enforces least privilege per role', () => {
  assert.deepEqual(listAdminRoleDomainCapabilities('OWNER'), [...DOMAIN_ADMIN_CAPABILITIES]);
  assert.deepEqual(listAdminRoleDomainCapabilities('EDITOR'), [
    'catalog.write',
    'seo.write',
    'audit.read',
    'sessions.manage',
  ]);
  assert.deepEqual(listAdminRoleDomainCapabilities('VIEWER'), [
    'audit.read',
    'sessions.manage',
  ]);
  assert.deepEqual(listAdminRoleDomainCapabilities('UNKNOWN'), []);

  assert.equal(canAdmin('EDITOR', 'pricing.review'), false);
  assert.equal(canAdmin('EDITOR', 'collector.trigger'), false);
  assert.equal(canAdmin('EDITOR', 'settings.manage'), false);
  assert.equal(canAdmin('EDITOR', 'users.manage'), false);
  assert.equal(canAdmin('VIEWER', 'catalog.write'), false);
  assert.equal(canAdmin('VIEWER', 'seo.write'), false);
  assert.equal(canAdmin('VIEWER', 'sessions.manage'), true);
  assert.equal(canAdmin('OWNER', 'users.manage'), true);
  assert.ok(ADMIN_ROLE_CAPABILITIES.OWNER.includes('pricing.review'));

  assert.throws(() => assertAdminCapability('VIEWER', 'settings.manage'), /没有此操作权限/);
  assert.doesNotThrow(() => assertAdminCapability('OWNER', 'settings.manage'));
});
const row:WorkspaceRow={id:'x',slug:'x',name:'X',publish_status:'published',price_count:4,stale_count:2,latest_checked:null,job_count:1,running_count:1,failed_count:0,queued_count:0};
test('published and running do not erase stale price action',()=>{const s=workspaceStatus(row,false);assert.equal(s.publication,'已发布');assert.equal(s.collection,'采集执行中');assert.equal(s.needsAction,true);assert.equal(s.progress,true);});
test('partial snapshot never treats missing operational records as known failure',()=>{const s=workspaceStatus({...row,stale_count:0,failed_count:3},true);assert.equal(s.needsAction,false);assert.equal(s.progress,false);assert.equal(s.collection,'未导入采集记录');});

const routeGuardSource=ts.transpileModule(readFileSync(new URL('./admin-route-guard.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const proxyPolicySource=ts.transpileModule(readFileSync(new URL('./admin-proxy-policy.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function loadRouteGuard(role:string|null){
 const policyMod={exports:{}};
 vm.runInNewContext('(function(require,module,exports){'+proxyPolicySource+'\n})',{Headers})(require,policyMod,policyMod.exports);
 const guardMod={exports:{}};
 vm.runInNewContext('(function(require,module,exports){'+routeGuardSource+'\n})',{Response,Headers,URL,console})((name:string)=>{
  if(name==='server-only')return {};
  if(name==='./admin-auth')return {getCurrentAdmin:async()=>role?{id:'test-admin',role}:null};
  if(name==='./admin-permissions')return {canAdmin};
  if(name==='./admin-proxy-policy')return policyMod.exports;
  return require(name);
 },guardMod,guardMod.exports);
 return guardMod.exports;
}

for (const route of ['pipeline/collect','review/collect','search-demand/authority-collect']) {
 for (const role of ['EDITOR','VIEWER']) test(`${route} rejects ${role} before reading request or queuing`, async()=>{
  const code=ts.transpileModule(readFileSync(new URL(`../app/admin/${route}/route.ts`,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const mod={exports:{} as {POST:(request:unknown)=>Promise<Response>}};
  const guardExports=loadRouteGuard(role);
  vm.runInNewContext('(function(require,module,exports){'+code+'\n})',{Response,Headers,URL})((name:string)=>name.endsWith('admin-route-guard')?guardExports:new Proxy({},{get(){throw Error('Collector dependency accessed before permission check');}}),mod,mod.exports);
  const request={url:'https://geosub.org/admin/'+route,headers:new Headers({origin:'https://geosub.org',host:'geosub.org'}),formData:()=>{throw Error('Unauthorized form was read');}};
  const response=await mod.exports.POST(request);
  assert.equal(response.status,403);
 });
}
test('review publication is not mislabeled as a draft',()=>assert.equal(workspaceStatus({...row,publish_status:'review'},false).publication,'审核中'));

test('workspace separates review failures from collection and mixed failures',()=>{
 const failed={...row,running_count:0,failed_count:1,review_failed_count:1};
 assert.equal(workspaceStatus(failed,false).collection,'采集成功，审核失败');
 assert.equal(workspaceStatus({...failed,failed_count:2},false).collection,'采集和审核均有失败');
 assert.equal(workspaceStatus({...failed,review_failed_count:0},false).collection,'最近采集失败');
});

test('published product with no prices needs review, draft without prices does not',()=>{assert.equal(workspaceStatus({...row,price_count:0,stale_count:0},true).needsAction,true);assert.equal(workspaceStatus({...row,publish_status:'draft',price_count:0,stale_count:0},true).needsAction,false);});

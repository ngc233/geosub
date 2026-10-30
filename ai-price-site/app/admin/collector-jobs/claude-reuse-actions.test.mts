import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { canAdmin } from '../../../lib/admin-permissions.ts';
import {
  canApplyClaudeReuse, claudeReuseError, initialClaudeReuseState, claudeReuseOperations,
  isClaudeReuseOperation, isClaudeReuseMutation, claudeReviewMode, claudeReusePreview, type ClaudeReuseState,
} from './claude-reuse-model.ts';

const id='12345678-1234-4234-8234-123456789abc';
const token='a'.repeat(64);
type MockResponse={ok:boolean;result?:{state:string;configuration_fingerprint?:string;updated_jobs?:number;activated_jobs?:number;
  automatic_review?:boolean;automatic_review_after_confirmation?:boolean};
  error_code?:string;private_error?:string};
function loadAction({role='OWNER',isolated=true,response={ok:true,result:{state:'conversion_preview',configuration_fingerprint:token}}}:
  {role?:string;isolated?:boolean;response?:MockResponse}={}) {
  const calls:unknown[]=[],invalidated:string[]=[];
  const compiledModule={exports:{} as {claudeJobReuseAction:(previous:ClaudeReuseState,data:FormData)=>Promise<ClaudeReuseState>}};
  const source=readFileSync(new URL('./claude-reuse-actions.ts',import.meta.url),'utf8');
  const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  vm.runInNewContext(code,{module:compiledModule,exports:compiledModule.exports,process:{env:{DATABASE_URL:
    isolated?'postgresql://127.0.0.1:55433/geosub_collector_test_claude_scheduler_ui_fixture'
      :'postgresql://127.0.0.1:55433/geosub_admin_preview_20261028'}},require(name:string){
    if(name.endsWith('/admin-auth')) return {requireAdmin:async(capability:'manage')=>{
      if(!canAdmin(role,capability)) throw Error('permission denied');
      return {id};
    }};
    if(name==='next/cache') return {revalidatePath:(route:string)=>invalidated.push(route)};
    if(name==='./claude-reuse-service') return {runClaudeReuseCommand:async(input:unknown)=>{calls.push(input);return response;}};
    if(name==='./claude-reuse-model') return {canApplyClaudeReuse,claudeReuseError,isClaudeReuseOperation,isClaudeReuseMutation};
    throw Error('Unexpected import '+name);
  }});
  return {run:compiledModule.exports.claudeJobReuseAction,calls,invalidated};
}
function data(operation='preview',fingerprint='') {
  const form=new FormData();form.set('id',id);form.set('operation',operation);form.set('fingerprint',fingerprint);return form;
}

test('both reuse operations authorize managers before inspecting or spawning commands',async()=>{
  for(const role of ['VIEWER','EDITOR']) for(const operation of claudeReuseOperations) {
    const fixture=loadAction({role});
    await assert.rejects(fixture.run(initialClaudeReuseState,data(operation,token)),/permission denied/);
    assert.equal(fixture.calls.length,0);
  }
});

test('server rejects invalid parameters, missing fingerprints and forged apply permission',async()=>{
  const fixture=loadAction();
  const invalid=data();invalid.set('id','invalid');
  assert.equal((await fixture.run(initialClaudeReuseState,invalid)).status,'blocked');
  assert.equal((await fixture.run(initialClaudeReuseState,data('other'))).status,'blocked');
  assert.equal((await fixture.run(initialClaudeReuseState,data('apply'))).status,'blocked');
  assert.equal(fixture.calls.length,0);
  const existing=loadAction({isolated:false}),forged=data('apply',token);forged.set('canApply','true');
  assert.equal((await existing.run(initialClaudeReuseState,forged)).status,'blocked');
  assert.equal(existing.calls.length,0);
  assert.equal((await existing.run(initialClaudeReuseState,data('enable',token))).status,'blocked');
  assert.equal((await fixture.run(initialClaudeReuseState,data('enable'))).status,'blocked');
  assert.equal(existing.calls.length,0);
});

test('preview returns a configuration fingerprint but enables application only in the isolated database',async()=>{
  for(const isolated of [true,false]) {
    const fixture=loadAction({isolated});
    const result=await fixture.run(initialClaudeReuseState,data());
    assert.equal(result.status,'preview');assert.equal(result.fingerprint,token);assert.equal(result.canApply,isolated);
    assert.equal(fixture.calls.length,1);
  }
});

test('converted response revalidates the list and says the task is still paused',async()=>{
  const fixture=loadAction({response:{ok:true,result:{state:'converted_paused',updated_jobs:1,activated_jobs:0}}});
  const result=await fixture.run(initialClaudeReuseState,data('apply',token));
  assert.equal(result.status,'converted');assert.match(result.message,/仍保持暂停/);
  assert.equal(fixture.invalidated.join(','),'/admin/collector-jobs');
  assert.equal((fixture.calls[0] as {actorId:string}).actorId,id);
});

test('changed configuration, running jobs and duplicate tasks return readable blockers without raw errors',async()=>{
  for(const error_code of ['job_configuration_changed','target_job_still_running','another_price_job_already_exists']) {
    const fixture=loadAction({response:{ok:false,error_code,private_error:'private-credential'}});
    const result=await fixture.run(initialClaudeReuseState,data('apply',token));
    assert.equal(result.status,'blocked');assert.ok(result.message.length>0);
    assert.ok(!JSON.stringify(result).includes('private-credential'));
    assert.equal(result.fingerprint,undefined);
  }
});

test('URL scope check cannot allow a production or existing preview database',()=>{
  for(const url of [undefined,'invalid','postgresql://db.invalid:55433/geosub_collector_test_claude_scheduler_ui_fixture',
    'postgresql://127.0.0.1:5432/geosub_collector_test_claude_scheduler_ui_fixture',
    'postgresql://127.0.0.1:55433/geosub_admin_preview_20261028']) assert.equal(canApplyClaudeReuse(url),false);
});


test('activation preview and confirmation describe scheduling without claiming collection or publication',async()=>{
  const preview=loadAction({response:{ok:true,result:{state:'activation_preview',configuration_fingerprint:token}}});
  const proposed=await preview.run(initialClaudeReuseState,data('enable-preview'));
  assert.equal(proposed.status,'activation-preview');assert.equal(proposed.canApply,true);
  assert.equal(proposed.fingerprint,token);
  const enabled=loadAction({response:{ok:true,result:{state:'collection_enabled',updated_jobs:1,activated_jobs:1}}});
  const result=await enabled.run(initialClaudeReuseState,data('enable',token));
  assert.equal(result.status,'enabled');assert.match(result.message,/等待执行器/);
  assert.match(result.message,/尚未执行采集/);
  assert.deepEqual(enabled.invalidated,['/admin/collector-jobs','/admin/pipeline']);
  assert.equal((enabled.calls[0] as {actorId:string}).actorId,id);
  const repeat=loadAction({response:{ok:true,result:{state:'already_enabled',updated_jobs:0,activated_jobs:0}}});
  assert.equal((await repeat.run(initialClaudeReuseState,data('enable-preview'))).status,'enabled');
  assert.deepEqual(repeat.invalidated,['/admin/collector-jobs','/admin/pipeline']);
});


test('all write operations reject missing fingerprints and forged environment permission before spawning',async()=>{
  for(const operation of claudeReuseOperations.filter(isClaudeReuseMutation)) {
    const missing=loadAction();
    assert.equal((await missing.run(initialClaudeReuseState,data(operation))).status,'blocked');
    assert.equal(missing.calls.length,0);
    const existing=loadAction({isolated:false}),forged=data(operation,token);
    forged.set('canApply','true');forged.set('policy','private-policy-input');
    assert.equal((await existing.run(initialClaudeReuseState,forged)).status,'blocked');
    assert.equal(existing.calls.length,0);
  }
});

test('review previews bind separate confirmations and keep admission distinct from activation',async()=>{
  const cases=[
    {operation:'review-preview',state:'review_admission_preview',status:'review-preview',confirm:'review-apply'},
    {operation:'review-enable-preview',state:'activation_preview',status:'review-activation-preview',confirm:'review-enable'},
    {operation:'review-revoke-preview',state:'review_revocation_preview',status:'review-revoke-preview',confirm:'review-revoke'},
  ];
  for(const item of cases) {
    const f=loadAction({response:{ok:true,result:{state:item.state,configuration_fingerprint:token,
      automatic_review_after_confirmation:item.operation==='review-enable-preview'}}});
    const result=await f.run(initialClaudeReuseState,data(item.operation));
    assert.equal(result.status,item.status);assert.equal(result.canApply,true);
    assert.equal(result.fingerprint,token);assert.equal(claudeReusePreview(result.status)?.operation,item.confirm);
    assert.equal(f.invalidated.length,0);
  }
  const wrong=loadAction({response:{ok:true,result:{state:'activation_preview',configuration_fingerprint:token,
    automatic_review_after_confirmation:true}}});
  assert.equal((await wrong.run(initialClaudeReuseState,data('enable-preview'))).status,'blocked');
});

test('review configuration changes refresh the mode and use the authenticated actor only',async()=>{
  for(const item of [
    {operation:'review-apply',state:'review_admitted_paused',status:'review-admitted'},
    {operation:'review-revoke',state:'review_disabled_paused',status:'review-disabled'},
  ]) {
    const f=loadAction({response:{ok:true,result:{state:item.state,updated_jobs:1,activated_jobs:0}}});
    const form=data(item.operation,token);form.set('actorId','forged');form.set('policy','private-policy-input');
    const result=await f.run(initialClaudeReuseState,form);
    assert.equal(result.status,item.status);assert.match(result.message,/暂停/);
    assert.equal((f.calls[0] as {actorId:string}).actorId,id);
    assert.ok(!JSON.stringify(f.calls).includes('forged'));
    assert.ok(!JSON.stringify(f.calls).includes('private-policy-input'));
    assert.deepEqual(f.invalidated,['/admin/collector-jobs','/admin/pipeline']);
  }
  const enabled=loadAction({response:{ok:true,result:{state:'collection_enabled',updated_jobs:1,activated_jobs:1,automatic_review:true}}});
  assert.match((await enabled.run(initialClaudeReuseState,data('review-enable',token))).message,/候选/);
});

test('unknown review configuration is redacted and never mapped to a pending-only enable',()=>{
  assert.equal(claudeReviewMode(undefined),'pending');
  assert.equal(claudeReviewMode('claude-us-pro-local-review-v1'),'candidate');
  for(const unknown of ['private-token',false,0,{},'']) {
    const mode=claudeReviewMode(unknown);
    assert.equal(mode,'unknown');assert.ok(!JSON.stringify({mode}).includes('private-token'));
  }
  for(const error of ['review_actor_not_authorized','claude_review_source_replacement_not_allowed',
    'unknown_claude_review_admission_policy','claude_review_admission_requires_disposable_database']) {
    assert.notEqual(claudeReuseError(error),claudeReuseError('unknown'));
  }
});

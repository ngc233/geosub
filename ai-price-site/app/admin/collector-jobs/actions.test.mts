import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';
import { canAdmin } from '../../../lib/admin-permissions.ts';

function fixture({role='OWNER',claudePrice=true,failAudit=false}={}) {
  const queries:string[]=[],txQueries:string[]=[],started:string[]=[];
  let txCount=0;
  const compiledModule={exports:{} as {runCollectorJobNow:(data:FormData)=>Promise<unknown>}};
  const code=ts.transpileModule(readFileSync(new URL('./actions.ts',import.meta.url),'utf8'),
    {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  const runRaw=async(parts:TemplateStringsArray,inTx:boolean)=>{
    const sql=parts.join('?');
    queries.push(sql);
    if(inTx) txQueries.push(sql);
    if(failAudit && sql.includes('INSERT INTO audit_logs')) throw new Error('audit insert failed');
    return sql.includes('SELECT job.id') && claudePrice?[{id:'fixture'}]:[];
  };
  vm.runInNewContext(code,{module:compiledModule,exports:compiledModule.exports,require(name:string) {
    if(name==='next/cache') return {revalidatePath() {}};
    if(name.endsWith('/admin-auth')) return {requireAdmin:async(capability:'manage')=>{
      if(!canAdmin(role,capability)) throw Error('permission denied');
      return {id:'12345678-1234-4234-8234-123456789abc'};
    }};
    if(name.endsWith('/prisma')) return {prisma:{
      $queryRaw:(parts:TemplateStringsArray)=>runRaw(parts,false),
      $transaction:async(callback:(tx:{$queryRaw:(parts:TemplateStringsArray)=>Promise<unknown>})=>Promise<unknown>)=>{
        txCount+=1;
        return callback({$queryRaw:(parts:TemplateStringsArray)=>runRaw(parts,true)});
      },
    }};
    if(name.endsWith('/collection-runner')) return {startCollectorJobRunInBackground:async(id:string)=>{started.push(id);}};
    throw Error('Unexpected import '+name);
  }});
  const form=new FormData();form.set('id','12345678-1234-4234-8234-123456789abc');
  return {run:()=>compiledModule.exports.runCollectorJobNow(form),queries,txQueries,started,getTxCount:()=>txCount};
}

test('generic run entry cannot bypass the Claude price activation preflight',async()=>{
  const f=fixture();const result=await f.run() as {ok:boolean;error:string};
  assert.equal(result.ok,false);assert.match(result.error,/检查启用条件/);
  assert.equal(f.queries.length,1);assert.equal(f.started.length,0);
  assert.ok(f.queries.every(sql=>!sql.includes('UPDATE') && !sql.includes('INSERT')));
});

test('generic run entry updates job and records audit log atomically before starting worker',async()=>{
  const f=fixture({claudePrice:false});await f.run();
  assert.equal(f.getTxCount(),1);
  assert.ok(f.txQueries.some(sql=>sql.includes('UPDATE collector_jobs')));
  assert.ok(f.txQueries.some(sql=>sql.includes('INSERT INTO audit_logs')));
  assert.equal(f.started.length,1);
});

test('generic run entry does not spawn worker if transactional audit insert fails',async()=>{
  const f=fixture({claudePrice:false,failAudit:true});
  await assert.rejects(f.run(),/audit insert failed/);
  assert.equal(f.getTxCount(),1);
  assert.equal(f.started.length,0);
});

test('generic run entry checks management permission before any query',async()=>{
  for(const role of ['VIEWER','EDITOR']) {
    const f=fixture({role});await assert.rejects(f.run(),/permission denied/);
    assert.equal(f.queries.length,0);assert.equal(f.started.length,0);
  }
});

import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { Prisma } from "@prisma/client";
function reader(count: number, slow = false) {
  const queries: Prisma.Sql[] = [], options: unknown[] = [];
  let now = 0;
  const exports: {getHomepagePriceRecords?:()=>Promise<{records:unknown[];truncated:boolean}>} = {};
  const tx = {$executeRaw:async()=>0,$queryRaw:async(sql:Prisma.Sql|TemplateStringsArray,...values:unknown[])=>{
    const query = Array.isArray(sql) ? Prisma.sql(sql as unknown as TemplateStringsArray,...values) : sql as Prisma.Sql;
    queries.push(query);
    if (query.text.includes("set_config")) return [];
    if (query.text.includes("SELECT NOW")) return [{now:new Date()}];
    if (query.text.includes("WITH streams")) {if(slow)now=6001;return Array.from({length:count},(_,i)=>({id:String(i)}));}
    if (query.text.includes("ANY(")) return (query.values[0] as string[]).map(id=>({id,amount:"1.25"}));
    throw Error("Unexpected SQL");
  }};
  const code=ts.transpileModule(fs.readFileSync(new URL('./homepage-price-records-data.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(code,{exports,Error,performance:{now:()=>now},require:(id:string)=>{
    if(id==='server-only')return {};
    if(id==='@prisma/client')return {Prisma};
    if(id==='./prisma')return {prisma:{$transaction:async(fn:(t:typeof tx)=>unknown,opts:unknown)=>{options.push(opts);return fn(tx);}}};
    throw Error(id);
  }});
  return {load:exports.getHomepagePriceRecords!,queries,options};
}
test("overflow checks 50001 lightweight IDs and never fetches payloads or partial events", async()=>{
  const r=reader(50001), result=await r.load();
  assert.equal(result.truncated,true); assert.equal(result.records.length,0);
  assert.equal(r.queries.filter(q=>q.text.includes("ANY(")).length,0);
  assert.ok(r.queries.some(q=>q.values.includes(50001)));
});
test("50000 is complete; evidence pages use IDs in the same read-only snapshot",async()=>{
  const r=reader(50000),result=await r.load();
  assert.equal(result.truncated,false);assert.equal(result.records.length,50000);
  assert.equal(r.queries.filter(q=>q.text.includes("ANY(")).length,10);
  assert.equal(JSON.stringify(r.options),JSON.stringify([{isolationLevel:"RepeatableRead",maxWait:500,timeout:6500}]));
  const sql=r.queries.find(q=>q.text.includes("WITH streams"))!.text;
  assert.match(sql,/120 days/);assert.match(sql,/30 days/);
  assert.doesNotMatch(sql.slice(sql.indexOf("SELECT po.id")),/po.status\s*=/);
});
test("budget exhaustion stops subsequent evidence reads; SQL has real statement cancellation",async()=>{
  const r=reader(2,true);await assert.rejects(r.load(),{name:"HomepageHistoryTimeout"});
  assert.equal(r.queries.filter(q=>q.text.includes("ANY(")).length,0);
  const timeouts=r.queries.filter(q=>q.text.includes("set_config"));
  assert.ok(timeouts.length>=2);assert.ok(timeouts.every(q=>Number(q.values[0])<=6000));
});

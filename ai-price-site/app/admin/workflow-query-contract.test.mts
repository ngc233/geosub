import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import {resolve,dirname} from "node:path";
import {fileURLToPath} from "node:url";
import * as context from "../../lib/admin-workflow-context.ts";
import * as claudeReuse from "./collector-jobs/claude-reuse-model.ts";
const root=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const require=createRequire(resolve(root,"package.json"));
const ts=require("typescript");
function load(file:string,stubs:Record<string,unknown>){const source=readFileSync(resolve(root,file),"utf8");const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});const m={exports:{} as Record<string,unknown>};new Function("require","module","exports",outputText)((name:string)=>name in stubs?stubs[name]:require(name),m,m.exports);return m.exports;}
test("collector product/source predicates bind values before each existing history limit",async()=>{
 const queries:Array<{sql:string;values:unknown[]}>=[];
 const loaded=load("app/admin/collector-jobs/queries.ts",{
  "@/lib/admin-workflow-context":context,
  "./claude-reuse-model":claudeReuse,
  "../../../lib/admin-performance":{measureAdminWorkload:(_name:string,fn:()=>unknown)=>fn()},
  "../../../lib/prisma":{prisma:{$queryRaw:(strings:TemplateStringsArray,...values:unknown[])=>{
   queries.push({sql:strings.join("?"),values});return Promise.resolve([]);
  }}},
 });
 await (loaded.getCollectorJobsPageData as (p:unknown)=>Promise<unknown>)({product:"spotify",q:"a%b",platform:"web"});
 assert.equal(queries.length,3);
 assert.ok(queries[0].values.includes(claudeReuse.claudeReviewPolicyId));
 assert.ok(!queries[0].sql.includes(claudeReuse.claudeReviewPolicyId));
 for(const q of queries){assert.ok(q.values.includes("spotify"));assert.ok(q.values.includes("web"));assert.ok(q.values.includes("%a\\%b%"));assert.ok(q.sql.indexOf("WHERE")<q.sql.indexOf("LIMIT"));assert.ok(!q.sql.includes("spotify"));}
 assert.match(queries[2].sql,/AND \? <> 'web'/);
});
test("collection status endpoint rejects malformed run IDs before querying history",async()=>{
 let queried=false;
 const loaded=load("app/admin/review/collection-runs/route.ts",{"../../../../lib/admin-auth":{requireAdmin:async()=>({role:"VIEWER"})},"../collection-runner":{reconcileStaleCollectorRuns:async()=>{}},"../collector-run-history-query":{getCollectorRunHistoryRows:async()=>{queried=true;return [];}}});
 const response=await (loaded.GET as (r:Request)=>Promise<Response>)(new Request("http://local/admin/review/collection-runs?runId=bad"));
 assert.equal(response.status,400);assert.equal(queried,false);
});
test("collection status reads the exact product/run and disables caching",async()=>{
 let seen:unknown[]=[];
 const loaded=load("app/admin/review/collection-runs/route.ts",{"../../../../lib/admin-auth":{requireAdmin:async()=>({role:"VIEWER"})},"../collection-runner":{reconcileStaleCollectorRuns:async()=>{}},"../collector-run-history-query":{getCollectorRunHistoryRows:async(...args:unknown[])=>{seen=args;return [];}}});
 const id="11111111-1111-4111-8111-111111111111";
 const response=await (loaded.GET as (r:Request)=>Promise<Response>)(new Request(`http://local/admin/review/collection-runs?product=spotify&runId=${id}`));
 assert.deepEqual(seen,["",12,{product:"spotify",runId:id}]);assert.equal(response.headers.get("cache-control"),"no-store");
});
test("collect submission denies non-managers without starting a worker",async()=>{
 let called=false;
 const loaded=load("app/admin/review/collect/route.ts",{"@/lib/admin-workflow-context":context,"../../../../lib/admin-permissions":{canAdmin:()=>false},"../../../../lib/admin-auth":{requireAdmin:async()=>({role:"VIEWER"})},"../collection-status":{buildCollectionRedirectPath:()=>"/admin/review"},"../collection-runner":{queueAndRunAppStoreCollection:async()=>{called=true;}}});
 const response=await (loaded.POST as (r:Request)=>Promise<Response>)(new Request("http://local/admin/review/collect",{method:"POST"}));
 assert.equal(response.status,403);assert.equal(called,false);
});

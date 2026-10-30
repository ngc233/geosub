import assert from "node:assert/strict";
import test from "node:test";
import { parseAdminProductFilter,matchesAdminProduct,safeAdminHref,safeAdminReturnTo,withAdminReturnTo,adminListLocation,adminSaveDestination } from "./admin-workflow-context.ts";

test("explicit product scope is exact and cannot fall back to a broad search",()=>{
 const rows=[{slug:"chatgpt",name:"ChatGPT"},{slug:"chatgpt-tools",name:"ChatGPT Tools"}];
 assert.deepEqual(rows.filter(r=>matchesAdminProduct(r,parseAdminProductFilter({product:" CHATGPT ",q:"tools"}))),[rows[0]]);
 assert.equal(rows.filter(r=>matchesAdminProduct(r,parseAdminProductFilter({product:"missing"}))).length,0);
 assert.deepEqual(rows.filter(r=>matchesAdminProduct(r,parseAdminProductFilter({q:"tools"}))),[rows[1]]);
});
test("malformed and repeated filters stay bounded and platform scope is explicit",()=>{
 assert.deepEqual(parseAdminProductFilter({product:["spotify","other"],q:" x ",platform:"web"}),{product:"spotify",q:"x",platform:"web"});
 assert.equal(parseAdminProductFilter({q:"a".repeat(1000),platform:"any"}).q.length,100);
 assert.equal(parseAdminProductFilter({platform:"any"}).platform,"");
});
test("return locations retain filters, independent pages and the exact row anchor",()=>{
 const path=adminListLocation("/admin/products",{category:"ai",state:"pending",page:2},"products-row-123");
 assert.equal(path,"/admin/products?category=ai&state=pending&page=2#products-row-123");
 const edit=new URL(withAdminReturnTo("/admin/products/123/edit",path),"http://local");
 assert.equal(edit.searchParams.get("returnTo"),path);
 assert.equal(safeAdminReturnTo(edit.searchParams.get("returnTo")),path);
});
test("return locations reject external redirects, traversal, controls and action endpoints",()=>{
 for(const value of ["https://evil.example/admin","//evil.example/admin","/admin/../login","/admin/%2e%2e/login","/admin\\evil","/admin/%0aevil","javascript:alert(1)","/admin/review/collect","/admin/products/new","/administrator"]){
  assert.equal(safeAdminReturnTo(value,"/admin/plans"),"/admin/plans",value);
 }
 assert.equal(safeAdminHref("https://evil.example/admin","/admin"),"/admin");
});
test("nested return contexts and transient receipts cannot accumulate",()=>{
 const path=safeAdminReturnTo("/admin/pipeline?page=2&category=ai&returnTo=%2Fadmin&collectionRun=queued&batchQueued=1#pipeline-products");
 assert.equal(path,"/admin/pipeline?page=2&category=ai#pipeline-products");
});
test("only confirmed saves navigate and errors keep the current inputs in place",()=>{
 const values={intent:"return",returnTo:"/admin/articles?state=editing&page=2#row-a"};
 for(const result of [undefined,null,{error:"conflict"},{ok:false},{unrecognized:true}])assert.equal(adminSaveDestination(result,values),null);
 assert.equal(adminSaveDestination({recordVersion:"v2"},values),values.returnTo);
 assert.equal(adminSaveDestination({recordVersion:"v2"},{...values,intent:"stay"}),null);
 assert.equal(adminSaveDestination({redirectTo:"https://evil.example"},values),null);
 assert.equal(adminSaveDestination({redirectTo:"/admin/products/123/edit?created=1"},values),"/admin/products/123/edit?created=1");
});

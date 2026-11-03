import assert from "node:assert/strict";
import test from "node:test";
import {comparisonRows,quoteDifference,type ComparisonPlan} from "./overview-comparison.ts";
import {selectGuideQuotes,guidePriceContextFromLinks} from "./guide-price-block.ts";
import {isCodexResetReadUnavailable} from "./codex-reset-read-state.ts";
import type {ProductPlan,RegionPrice} from "./public-pricing-model.ts";

const quote=(code:string,price:number)=>({code,country:code,priceUsd:price,localPrice:`local ${price}`,tax:"unknown"});
const plan=(slug:string,regions:ComparisonPlan["regions"],platform="ios",billing:ProductPlan["billing"]="monthly"):ComparisonPlan=>({slug,name:slug,platform,billing,href:`/zh/ai-pricing/test/${slug}`,regions});
test("overview union retains each plan's exact quote and sorts unavailable cells last in either direction",()=>{
 const a=plan("a",[quote("US",20),quote("PH",10)]),b=plan("b",[quote("US",100),quote("TR",80)]),before=structuredClone([a,b]);
 const rows=comparisonRows([a,b],"","a");assert.deepEqual(rows.map(row=>row.code),["PH","US","TR"]);
 assert.equal(rows[1].quotes.a.priceUsd,20);assert.equal(rows[1].quotes.b.priceUsd,100);assert.equal(rows[0].quotes.b,undefined);
 assert.deepEqual(comparisonRows([a,b],"","a",true).map(row=>row.code),["US","PH","TR"]);
 assert.deepEqual([a,b],before);
});
test("overview comparisons reject mixed billing platforms and cycles",()=>{
 const a=plan("a",[quote("US",20)]);
 assert.throws(()=>comparisonRows([a,plan("b",[],"web")],"","a"),/one platform/);
 assert.throws(()=>comparisonRows([a,plan("b",[],"ios","yearly")],"","a"),/one platform/);
 assert.equal(comparisonRows([a],"missing","a").length,0);
});
test("quote color position uses an explicit matching US quote and preserves unknown references",()=>{
 assert.equal(quoteDifference(quote("PH",10),quote("US",20)),-50);
 assert.equal(quoteDifference(quote("JP",25),quote("US",20)),25);
 assert.equal(quoteDifference(quote("PH",10),undefined),null);
 assert.equal(quoteDifference(undefined,quote("US",20)),null);
});
const now=new Date('2026-11-02T00:00:00Z');
const regional=(code:string,price:number,patch:Partial<RegionPrice>={}):RegionPrice=>({rank:1,code,country:code,priceUsd:price,localPrice:`local ${price}`,tax:"unknown",billingPlatform:"ios",priceType:"list_price",dataQuality:"verified",confidenceScore:100,lastCheckedAt:"2026-11-01",...patch});
const articlePlan=(regions:RegionPrice[]):ProductPlan=>({slug:"plus",name:"Plus",billing:"monthly",regions});
test("article comparison has three distinct published regions including US and never rewrites quote values",()=>{
 const rows=[regional("PH",10),regional("US",20),regional("JP",18),regional("CO",30)],before=structuredClone(rows);
 assert.deepEqual(selectGuideQuotes(articlePlan(rows),now).map(row=>[row.code,row.priceUsd]),[["PH",10],["US",20],["CO",30]]);
 assert.deepEqual(rows,before);
 const usMin=[regional("US",10),regional("JP",12),regional("PH",15)];assert.equal(selectGuideQuotes(articlePlan(usMin),now).length,3);
});
test("article quote view excludes stale, estimated, future, missing and low-confidence evidence",()=>{
 const invalid=[regional("PH",10,{dataQuality:"stale"}),regional("US",20,{dataQuality:"estimated"}),regional("JP",30,{lastCheckedAt:"2026-10-01"}),regional("CO",40,{lastCheckedAt:"2026-11-03"}),regional("IN",8,{confidenceScore:79}),regional("TR",9,{lastCheckedAt:undefined}),regional("KE",0),regional("PK",10,{priceType:"trial"})];
 assert.deepEqual(selectGuideQuotes(articlePlan(invalid),now),[]);
});
test("article with no matching US reference becomes a single quote and never borrows Web prices",()=>{
 assert.equal(selectGuideQuotes(articlePlan([regional("JP",10),regional("PH",15),regional("IN",16)]),now).length,1);
 assert.equal(selectGuideQuotes(articlePlan([regional("JP",10),regional("US",15)]),now).length,1);
 const mixed=[regional("JP",10,{dataQuality:"stale"}),regional("US",1,{billingPlatform:"web"})];
 assert.deepEqual(selectGuideQuotes(articlePlan(mixed),now),[]);
});
test("article quote contexts come from existing product/plan links, excluding non-product and cross-country links",()=>{
 assert.deepEqual(guidePriceContextFromLinks([{href:"/zh/ai-pricing/chatgpt/plus"}]),{category:"ai",productSlug:"chatgpt",planSlug:"plus"});
 assert.deepEqual(guidePriceContextFromLinks([{href:"/zh/streaming-pricing/netflix"}]),{category:"streaming",productSlug:"netflix",planSlug:undefined});
 assert.equal(guidePriceContextFromLinks([{href:"javascript:alert(1)"},{href:"/zh/ai-pricing/chatgpt/regions/turkey"}]),undefined);
});
test("Codex missing schema and datasource failures are recoverable; programming and evidence failures remain errors",()=>{
 for(const error of [{code:"P2010",meta:{code:"42P01"}},{code:"P2021"},{code:"P1001"},{code:"P2024"}])assert(isCodexResetReadUnavailable(error));
 for(const error of [null,"error",new Error("公开修订状态异常"),{code:"P2010",meta:{code:"42601"}},{code:"P2010"}])assert.equal(isCodexResetReadUnavailable(error),false);
});

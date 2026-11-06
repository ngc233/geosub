import assert from "node:assert/strict";
import test from "node:test";
import { usesUnifiedPublicStyle } from "./public-style-rollout.ts";
test("V2 activates Chinese chrome but preserves the explicit Plus lock and all other locales",()=>{
  for(const path of ["/zh","/zh/","/zh/ai-pricing","/zh/countries/japan","/zh/ai-pricing/chatgpt/plus-extra"])assert.equal(usesUnifiedPublicStyle(path),true,path);
  for(const path of ["/zh/ai-pricing/chatgpt/plus","/zh/ai-pricing/chatgpt/plus/","/zh/ai-pricing/chatgpt/plus?x=1","/en","/en/ai-pricing/chatgpt/plus","/zh-tw","/admin","/","","/ar"])assert.equal(usesUnifiedPublicStyle(path),false,path);
});

import { minimumSearchPrice, minimumCountrySearchPrice, selectChromeSearchCandidates } from "./public-chrome-search.ts";
import { formatUsd, getPlanStats, getDefaultPlanRegions, type SubscriptionProduct } from "./public-pricing-model.ts";
import { getProductOverviewPriceFact } from "./pricing-product-overview-copy.ts";
import { getPricingPagePlan } from "./pricing-page-facts.ts";
import type { PublicSearchResult } from "./public-search.ts";
const region={rank:1,country:"测试",code:"US",priceUsd:20,localPrice:"20 USD",tax:"",billingPlatform:"ios",dataQuality:"verified" as const,lastCheckedAt:"2026-10-01T00:00:00Z"};
const product:SubscriptionProduct={slug:"test",name:"Test",brand:"Test",description:"",category:"ai",defaultPlan:"monthly",updatedAt:"",plans:[
 {slug:"monthly",name:"Monthly",billing:"monthly",regions:[region,{...region,billingPlatform:"web",priceUsd:1},{...region,priceUsd:2,dataQuality:"estimated"}]},
 {slug:"yearly",name:"Yearly",billing:"yearly",regions:[{...region,priceUsd:0.5}]},
]};
test("search matches overview monthly preference and destination prices without an extra seven-day or verified-only filter",()=>{
 assert.equal(minimumSearchPrice(product)?.usd,2);
 assert.equal(formatUsd(minimumSearchPrice(product)!.usd),getProductOverviewPriceFact(product)?.price);
 const pagePlan=getPricingPagePlan(product.plans[0],"/zh/ai-pricing/test/monthly");
 assert.equal(minimumSearchPrice(product,"monthly")?.usd,getPlanStats(pagePlan).minRegion.priceUsd);
 assert.equal(minimumSearchPrice(product,"yearly")?.usd,0.5);
 assert.equal(minimumSearchPrice(product,"missing"),null);
 assert.equal(minimumSearchPrice({...product,plans:[]}),null);
 const annualOnly={...product,plans:[product.plans[1]]};
 assert.equal(formatUsd(minimumSearchPrice(annualOnly)!.usd),getProductOverviewPriceFact(annualOnly)?.price);
});
test("search matches Plus's default price panel and the overview's current-plan scope",()=>{
 const chatgpt={...product,slug:"chatgpt",plans:[{...product.plans[0],slug:"plus"},{...product.plans[1],slug:"pro-legacy"}]};
 assert.equal(minimumSearchPrice(chatgpt,"plus")?.usd,getPlanStats({...chatgpt.plans[0],regions:getDefaultPlanRegions(chatgpt.plans[0])}).minRegion.priceUsd);
 assert.equal(formatUsd(minimumSearchPrice(chatgpt)!.usd),getProductOverviewPriceFact(chatgpt)?.price);
});
test("country minimum comes directly from page rows including older rows, with no USD fallback",()=>{
 const rows=[{usd:9,checkedAt:"2026-11-05"},{usd:3,checkedAt:"2026-10-25"},{usd:null,checkedAt:"2026-11-05"}];
 assert.equal(minimumCountrySearchPrice(rows),rows[1]);
 assert.equal(minimumCountrySearchPrice([{usd:null}]),null);
 assert.equal(minimumCountrySearchPrice([]),null);
});
test("product and plan search groups together load at most three unique products",()=>{
 const results:PublicSearchResult[]=Array.from({length:8},(_,i)=>({id:String(i),kind:i<4?"product":"plan",title:String(i),subtitle:"",href:"/test/"+i,logoSlug:"product-"+i,score:100-i}));
 // Include multiple plans of a selected product; they reuse the same detail read.
 results.push({...results[4],id:"shared",logoSlug:"product-0",score:101});
 const selected=selectChromeSearchCandidates(results);
 assert.deepEqual([...new Set(selected.map(row=>row.logoSlug))],["product-0","product-1","product-2"]);
 for(const kind of ["product","plan"])assert.ok(selected.filter(row=>row.kind===kind).length<=3);
 assert.equal(selected.some(row=>row.id==="shared"),true);
});

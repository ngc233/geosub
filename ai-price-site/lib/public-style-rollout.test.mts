import assert from "node:assert/strict";
import test from "node:test";
import { usesUnifiedPublicStyle } from "./public-style-rollout.ts";
test("V2 activates Chinese chrome but preserves the explicit Plus lock and all other locales",()=>{
  for(const path of ["/zh","/zh/","/zh/ai-pricing","/zh/countries/japan","/zh/ai-pricing/chatgpt/plus-extra"])assert.equal(usesUnifiedPublicStyle(path),true,path);
  for(const path of ["/zh/ai-pricing/chatgpt/plus","/zh/ai-pricing/chatgpt/plus/","/zh/ai-pricing/chatgpt/plus?x=1","/en","/en/ai-pricing/chatgpt/plus","/zh-tw","/admin","/","","/ar"])assert.equal(usesUnifiedPublicStyle(path),false,path);
});

import { minimumSearchPrice } from "./public-chrome-search.ts";
import type { SubscriptionProduct } from "./public-pricing-model.ts";
test("search minimum preserves destination platform and rejects stale/unverified prices without fallback",()=>{
 const now=Date.parse("2026-11-05T00:00:00Z");
 const region={rank:1,country:"测试",code:"US",priceUsd:20,localPrice:"20 USD",tax:"",billingPlatform:"ios",dataQuality:"verified" as const,lastCheckedAt:"2026-11-04T00:00:00Z"};
 const product:SubscriptionProduct={slug:"test",name:"Test",brand:"Test",description:"",category:"ai",defaultPlan:"monthly",updatedAt:"",plans:[{slug:"monthly",name:"Monthly",billing:"monthly",regions:[region,{...region,billingPlatform:"web",priceUsd:1},{...region,priceUsd:2,dataQuality:"estimated"},{...region,priceUsd:3,lastCheckedAt:"2026-10-01"}]}]};
 assert.equal(minimumSearchPrice(product,undefined,now)?.usd,20);
 assert.equal(minimumSearchPrice(product,"missing",now),null);
 assert.equal(minimumSearchPrice(product,undefined,now+8*86400000),null);
 product.plans[0].regions=[{...region,priceUsd:NaN},{...region,priceUsd:0},{...region,lastCheckedAt:"2027-01-01"}];
 assert.equal(minimumSearchPrice(product,undefined,now),null);
});

import assert from "node:assert/strict";
import test from "node:test";
import { productCountryRows, usableCountryDisplayRate } from "./product-country-display.ts";
import { getCountryPricingPlans } from "./pricing-page-facts.ts";
import type { ProductPlan, RegionPrice } from "./public-pricing-model.ts";

const region=(code:string,price:number,platform="ios"):RegionPrice=>({rank:0,country:code,code,priceUsd:price,localPrice:`${price}/月`,tax:"待核验",billingPlatform:platform});
test("product-country projection keeps the selected monthly iOS dataset and no fabricated US fallback",()=>{
  const plans:ProductPlan[]=[{slug:"plus",name:"Plus",billing:"monthly",regions:[region("TR",8),region("US",10),region("CO",20),region("AR",1,"web")]},{slug:"other",name:"Other",billing:"monthly",regions:[region("TR",7)]}];
  const original=structuredClone(plans);
  const rows=productCountryRows(getCountryPricingPlans(plans,"TR"));
  assert.equal(rows[0].region.priceUsd,8);assert.equal(rows[0].us?.priceUsd,10);assert.equal(rows[0].highest.priceUsd,20);assert.equal(rows[0].count,3);
  assert.equal(rows[0].region.rank,1);assert.equal(rows[1].us,undefined);assert.equal(rows[1].highest.code,"TR");
  assert.equal("regions" in rows[0],false);assert.deepEqual(plans,original);
});
test("display currency cannot use missing, fallback, expired or invalid rates",()=>{
  const rate={baseCurrency:"USD",quoteCurrency:"CNY",rate:7,source:"test",rateDate:"2026-01-01",fetchedAt:null,isFallback:false};
  assert.equal(usableCountryDisplayRate(rate),true);assert.equal(usableCountryDisplayRate({...rate,isStale:true}),true);
  assert.equal(usableCountryDisplayRate(undefined),false);
  for(const patch of [{isFallback:true},{isExpired:true},{rate:0},{rate:NaN},{rate:-1}])assert.equal(usableCountryDisplayRate({...rate,...patch}),false);
});

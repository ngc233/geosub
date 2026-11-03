import assert from "node:assert/strict";
import test from "node:test";
import { formatPublicPrice, publicCurrencyPreference, resolvePublicCurrency, usableDisplayCurrency } from "./public-display-currency.ts";
import { publicMapBand, publicMapDifference } from "./public-price-map.ts";

const rate = { baseCurrency:"USD",quoteCurrency:"CNY",rate:7.12,source:"fixture",rateDate:"2026-10-27",fetchedAt:"2026-10-27T00:00:00Z",isFallback:false };
test("one currency preference resolves missing, invalid and expired rates without inventing a conversion",()=>{
  assert.equal(publicCurrencyPreference(null),"CNY");
  assert.equal(publicCurrencyPreference("TRY"),"TRY");
  assert.equal(publicCurrencyPreference("<invalid>"),"CNY");
  assert.equal(resolvePublicCurrency("CNY",{CNY:rate}),"CNY");
  assert.equal(resolvePublicCurrency("CNY",{CNY:{...rate,isStale:true}}),"CNY");
  assert.equal(resolvePublicCurrency("USD",{}),"USD");
  assert.equal(resolvePublicCurrency("CNY",{}),"USD");
  for(const patch of [{isExpired:true},{isFallback:true},{rate:0},{rate:-1},{rate:NaN},{rate:Infinity}]) {
    assert.equal(usableDisplayCurrency("CNY",{CNY:{...rate,...patch}}),false);
    assert.equal(resolvePublicCurrency("CNY",{CNY:{...rate,...patch}}),"USD");
  }
});
test("display conversion keeps canonical USD independent and respects currency precision",()=>{
  assert.equal(formatPublicPrice(20,"USD",0.5),"$20.00");
  assert.equal(formatPublicPrice(20,"USD"),"$20.00");
  assert.equal(formatPublicPrice(20,"CNY"),"—");
  assert.equal(formatPublicPrice(20,"CNY",7.12),"¥142.40");
  assert.equal(formatPublicPrice(20,"JPY",150.12),"¥3,002");
  assert.equal(formatPublicPrice(20,"HKD",7.8),"HK$156.00");
  assert.equal(formatPublicPrice(20,"CNY",0),"—");
  assert.equal(formatPublicPrice(NaN,"CNY",7),"—");
});
const region=(code:string,priceUsd:number)=>({code,country:code,priceUsd});
test("only the actual US region receives the dark baseline; Argentina at the same price is a separate band",()=>{
  const us=region("US",20);
  assert.equal(publicMapBand(us,us),"reference");
  assert.equal(publicMapBand(region("AR",20),us),"same");
  assert.equal(publicMapDifference(region("AR",20),us),"与美国相同");
  assert.equal(publicMapBand(region("PH",15),us),"lower");
  assert.equal(publicMapBand(region("CO",30),us),"higher");
  assert.equal(publicMapBand(region("JP",20.01),us),"higher");
  assert.equal(publicMapDifference(region("JP",20.01),us),"高于美国 不到 1%");
});
test("missing US baseline stays neutral and missing/invalid prices never become a saving",()=>{
  assert.equal(publicMapBand(region("PH",15)),"covered");
  assert.equal(publicMapBand(region("US",20)),"covered");
  assert.equal(publicMapDifference(region("PH",15)),"美国基准缺失");
  for(const value of [0,-1,NaN,Infinity])assert.equal(publicMapBand(region("PH",value),region("US",20)),"no-data");
  assert.equal(publicMapBand(undefined,region("US",20)),"no-data");
});

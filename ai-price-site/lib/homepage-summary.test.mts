import { getChinesePlanDisplayName, getPlanDisplayName } from "./pricing-labels.ts";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { formatPublicPrice } from "./public-price-format.ts";
import assert from "node:assert/strict";
import test from "node:test";
import { homepageStatistics, homepageProducts, homepageCountries, homepageDisplayRates, homepageDataFailure } from "./homepage-summary.ts";
import { savingsLabel, savingsPercent } from "./homepage-display.ts";
import { getComparablePriceRows } from "./country-hubs.ts";
import { getHomepageRepresentatives } from "./homepage-representatives.ts";
import { fictionalHomepageSource, isHomepageFixtureEnabled } from "./test-fixtures/homepage.ts";
import { filterPublicNavigation } from "./public-navigation-filter.ts";
const now=new Date("2026-11-06T08:00:00Z"), source=fictionalHomepageSource(now);
const rows=getComparablePriceRows(source.prices,source.rates,now);
test("D1 includes nonrepresentative plans and products, empty has no current-date fallback",()=>{
  assert.deepEqual(homepageStatistics(rows),{products:7,regions:10,prices:62,updatedAt:now.toISOString()});
  assert.equal(homepageStatistics([]),null);
  const reps=getHomepageRepresentatives(rows).representatives;
  const products=homepageProducts(reps);assert.equal(products.length,6);
  assert.equal(products.filter(p=>p.slug==="chatgpt").length,1);
  assert.ok(products.every(p=>p.saving===(p.usPrice-p.lowest.usd)/p.usPrice));
  const noUs=getHomepageRepresentatives(rows.filter(row=>row.countryCode!=="US"));
  assert.equal(noUs.representatives.length,0);
  assert.equal(getHomepageRepresentatives(rows.filter(row=>row.countryCode!=="TR")).representatives.length,0);
});
test("D8 uses raw, equal-plan median, retains negatives, requires five and links only four existing pages",()=>{
  const sample=[0.001,0.2,-0.1,0.05,0.14,0.1].map((s,i)=>({...rows[0],countryCode:"PH",productSlug:`fictional-${i}`,planSlug:"one",usd:(1-s)*100,usPrice:100,difference:0}));
  const actual=homepageCountries(sample)[0];
  assert.ok(Math.abs(actual.median-0.075)<1e-12);assert.equal(actual.cheaper,5);assert.equal(actual.count,6);
  assert.equal(actual.href,"/zh/countries/philippines");assert.deepEqual(homepageCountries(sample.slice(0,4)),[]);
  assert.equal(homepageCountries([...sample,sample[0]])[0].count,6);
  assert.equal(homepageCountries(sample.map(r=>({...r,countryCode:"CA"})))[0].href,null);
  assert.ok(homepageCountries(sample.map(r=>({...r,usd:110})))[0].median<0);
  assert.equal(savingsLabel(0.140329),"比美国低 14%");assert.equal(savingsLabel(-0.0001),"比美国高 0%");
});
test("display FX excludes stale/future/fallback values, USD is a unit identity",()=>{
  assert.deepEqual(homepageDisplayRates(source.rates,now),{USD:1,CNY:7,JPY:150,EUR:0.9});
  assert.deepEqual(homepageDisplayRates(source.rates,new Date(now.getTime()+19*3600000)),{USD:1});
  assert.deepEqual(homepageDisplayRates(source.rates,new Date(now.getTime()-1)),{USD:1});
});
test("navigation is sanitized before serialization, preserving other labels/order/links",()=>{
  const kept={name:"方法论",href:"/guides/methodology",external:false};
  const input={zh:[{name:"指南",href:"/guides",children:[{name:"礼品卡教程",href:"/zh/guides/gift-card-guide/"},kept]},{name:"旧链接",href:"/guides/gift-card-guide"}],en:[kept]};
  const result=filterPublicNavigation(input);
  assert.deepEqual(result,{zh:[{name:"指南",href:"/guides",match:undefined,children:[kept]}],en:[{...kept,match:undefined,children:undefined}]});
  assert.ok(!JSON.stringify(result).includes("/guides/gift-card-guide"));assert.equal(input.zh.length,2);
});
test("fictional fixture cannot activate in production or with a remote DB",()=>{
  const saved={...process.env};
  try {process.env.GEOSUB_V3_FIXTURE="fictional";process.env.DATABASE_URL="postgresql://local:local@127.0.0.1/test";
    Object.assign(process.env,{NODE_ENV:"production"});assert.equal(isHomepageFixtureEnabled(),false);
    Object.assign(process.env,{NODE_ENV:"development"});assert.equal(isHomepageFixtureEnabled(),true);
    delete process.env.GEOSUB_V3_FIXTURE;assert.equal(isHomepageFixtureEnabled(),false);
    process.env.GEOSUB_V3_FIXTURE="fictional";process.env.DATABASE_URL="postgresql://local:local@example.com/test";assert.equal(isHomepageFixtureEnabled(),false);
  } finally {for(const key of ["NODE_ENV","DATABASE_URL","GEOSUB_V3_FIXTURE"]) {if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key];}}
});

test("public price symbols are shared, spaced and deterministic; other currencies keep ISO codes",()=>{
  for(const [currency,symbol] of Object.entries({CNY:"¥",USD:"$",JPY:"JP¥",HKD:"HK$",TWD:"NT$",EUR:"€",GBP:"£",SGD:"SGD",TRY:"TRY"})) {
    assert.equal(formatPublicPrice(119,currency),`${symbol} 119.00`);
  }
  assert.equal(formatPublicPrice(1234.5,"cny"),"¥ 1,234.50");
  assert.equal(formatPublicPrice(NaN,"CNY"),"");
});
test("homepage preserves existing Chinese names without inventing translations or duplicating product names",()=>{
  const reps=getHomepageRepresentatives(rows).representatives;
  const products=homepageProducts(reps.map(rep=>({...rep,prices:rep.prices.map(row=>({...row,planName:`${row.productName} 测试中文名`}))})));
  assert.ok(products.every(p=>p.plan==="测试中文名"&&p.planDisplayName===`${p.name} 测试中文名`));
  assert.equal(homepageProducts(reps).find(p=>p.slug==="netflix")?.planDisplayName,"Netflix 标准版");
});
test("actual production build fails immediately when the local fixture switch is present",()=>{
  const cwd=fileURLToPath(new URL("../",import.meta.url));
  const result=spawnSync(process.execPath,["node_modules/next/dist/bin/next","build","--webpack"],{
    cwd,encoding:"utf8",timeout:30_000,
    env:{...process.env,NODE_ENV:"production",GEOSUB_V3_FIXTURE:"fictional",NEXT_TELEMETRY_DISABLED:"1"},
  });
  assert.equal(result.error,undefined);
  assert.equal(result.status,1);
  assert.match(result.stdout+result.stderr,/GEOSUB_V3_FIXTURE is local-only/);
});

test("Chinese generic tiers translate without changing brand words, stored Chinese or locked labels",()=>{
  for(const [raw,zh] of Object.entries({Individual:"个人版",Standard:"标准版",Premium:"高级版",Family:"家庭版",Basic:"基础版",Monthly:"月度会员",Membership:"会员",Subscription:"订阅会员"})) {
    assert.equal(getChinesePlanDisplayName("Example",raw),`Example ${zh}`);
    assert.equal(getChinesePlanDisplayName("Example",`Example ${raw}`),`Example ${zh}`);
  }
  assert.equal(getChinesePlanDisplayName("YouTube Premium","YouTube Premium Individual"),"YouTube Premium 个人版");
  assert.equal(getChinesePlanDisplayName("YouTube Premium","YouTube Premium"),"YouTube Premium");
  assert.equal(getChinesePlanDisplayName("Netflix","官方中文套餐"),"Netflix 官方中文套餐");
  for(const brand of ["Plus","Pro","Go","Max"])assert.equal(getChinesePlanDisplayName("Example",brand),`Example ${brand}`);
  assert.equal(getChinesePlanDisplayName("Gemini","Google AI Pro"),"Google AI Pro");
  assert.equal(getPlanDisplayName("Netflix","Standard"),"Netflix Standard");
});

test("homepage read failure logs only an event and safe error type, returning the empty state",async(t)=>{
  const log=t.mock.method(console,"error",()=>{});
  const sensitive="fictional price detail must not be logged";
  const error=new Error(sensitive);error.name=sensitive;
  for(const [value,errorType] of [[error,"Error"],[{price:sensitive},"object"],[sensitive,"string"],[null,"null"],[undefined,"undefined"]] as const){
    const data=await Promise.reject(value).catch(homepageDataFailure);
    assert.equal(data,null);
    assert.deepEqual(homepageProducts(data??[]),[]);
    assert.equal(homepageStatistics(data??[]),null);
    assert.deepEqual(log.mock.calls.at(-1)?.arguments,[{event:"homepage_data_read_failed",errorType}]);
  }
  assert.equal(log.mock.callCount(),5);
  assert.ok(!JSON.stringify(log.mock.calls).includes(sensitive));
});


test("savings display rounds integers without changing raw comparisons or median",()=>{
  for(const [raw,display] of [[0.145,15],[0.1449,14],[0.1451,15],[0.8553,86],[-0.1451,15],[0,0],[0.0001,0]])assert.equal(savingsPercent(raw),display);
  assert.equal(savingsLabel(0.8553),"比美国低 86%");
  assert.equal(savingsLabel(-0.1451),"比美国高 15%");
  assert.equal(savingsLabel(0),"与美国相同");
});

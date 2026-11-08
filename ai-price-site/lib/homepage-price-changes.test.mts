import assert from "node:assert/strict";
import test from "node:test";
import { homepagePriceChanges } from "./homepage-price-changes.ts";
import { getPriceChanges, type PriceObservationRecord } from "./price-records.ts";
const now = new Date("2026-11-08T12:00:00Z"), day = 86_400_000;
function row(id: number, days: number, amount: number, extra: Partial<PriceObservationRecord> = {}): PriceObservationRecord {
  return { id: `00000000-0000-4000-8000-${String(id).padStart(12,"0")}`, productSlug:"chatgpt", productName:"ChatGPT", category:"ai", planSlug:"plus", planName:"Plus", countryCode:"PH", sourceId:"fixture-source", sourceUrl:"https://apps.apple.com/ph/app/fictional/id123456789", observedAt:new Date(+now-days*day).toISOString(), platform:"ios", priceType:"list_price", amount, currency:"PHP", status:"approved", confidence:90, anomaly:false, itemName:"Plus", originalPriceText:"fictional", snapshot:{country:"PH",planSpecSlug:"plus",billingCycle:"monthly",inAppPurchases:[{Name:"Plus",PriceText:"fictional"}],private_token:"never-export"}, ...extra };
}
test("latest six, inclusive 30-day boundary, future excluded, compact safe DTO",()=>{
  const rows=Array.from({length:10},(_,i)=>row(i+1,35-i*4,100+i*10));
  const result=homepagePriceChanges(rows,now);
  assert.equal(result.length,6);
  const expected=getPriceChanges(rows.filter(r=>Date.parse(r.observedAt)<=+now)).filter(e=>Date.parse(e.after.observedAt)>=+now-30*day).slice(0,6);
  assert.deepEqual(result.map(e=>e.id),expected.map(e=>e.after.id));
  assert.equal(homepagePriceChanges([row(1,31,100),row(2,30,110)],now).length,1);
  assert.equal(homepagePriceChanges([row(1,32,100),row(2,30.001,110)],now).length,0);
  assert.doesNotMatch(JSON.stringify(result),/never-export|snapshot|sourceId|inAppPurchases/);
  assert.ok(Buffer.byteLength(JSON.stringify(result))<10_000);
});
test("same-price and FX-only changes absent; decreases and original local currency retained",()=>{
  assert.deepEqual(homepagePriceChanges([row(1,2,100),row(2,1,100)],now),[]);
  const event=homepagePriceChanges([row(1,2,100),row(2,1,80)],now)[0];
  assert.equal(event.direction,"decrease");assert.equal(event.percent,-20);assert.equal(event.currency,"PHP");
  assert.equal(event.href,"/zh/price-history/chatgpt");
});
test("pending, rejected, low confidence, anomaly, wrong currency and long gaps break continuity",()=>{
  for(const extra of [{status:"pending"},{status:"rejected"},{confidence:79},{anomaly:true},{currency:"USD"}])
    assert.deepEqual(homepagePriceChanges([row(1,3,100),row(2,2,100,extra),row(3,1,80)],now),[]);
  assert.deepEqual(homepagePriceChanges([row(1,20,100),row(2,1,80)],now),[]);
});
test("older approved baseline and ignored unchanged evidence retain continuity across month boundary",()=>{
  const rows=[row(1,50,100),row(2,40,100,{status:"ignored",reviewReason:"superseded_by_published_price"}),row(3,29,80)];
  assert.equal(homepagePriceChanges(rows,now).length,1);
  assert.deepEqual(homepagePriceChanges(rows,now,true),[]);
  assert.deepEqual(homepagePriceChanges([],now),[]);
});

// Execute the real cache/error boundary with deterministic I/O; do not query a DB.
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
function cachedReader(read: () => Promise<{records:PriceObservationRecord[]; now:Date; truncated:boolean}>) {
  const settings: unknown[] = [], logs: unknown[][] = [];
  const exports: {loadHomepagePriceChanges?:()=>Promise<unknown[]>} = {};
  const code=ts.transpileModule(fs.readFileSync(new URL('./cached-homepage-price-changes.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(code,{exports,Error,Date,console:{error:(...args:unknown[])=>logs.push(args)},require:(id:string)=>{
    if(id==='server-only')return {};
    if(id==='react')return {cache:(fn:unknown)=>fn};
    if(id==='next/cache')return {unstable_cache:(fn:unknown,keys:unknown,options:unknown)=>{settings.push({keys,options});return fn;}};
    if(id==='./price-records-data')return {getHomepagePriceRecords:read};
    if(id==='./homepage-price-changes')return {homepagePriceChanges};
    if(id==='./public-pricing-cache')return {PUBLIC_PRICING_CACHE_TAG:'public-pricing'};
    throw new Error('Unexpected dependency '+id);
  }});
  return {load:exports.loadHomepagePriceChanges!,settings,logs};
}
test('actual service hides read failures, logs only event/type and configures a one-hour cache',async()=>{
  const r=cachedReader(async()=>{throw new Error('private database detail must not leave server');});
  assert.equal((await r.load()).length,0);
  assert.equal(JSON.stringify(r.settings),JSON.stringify([{keys:['homepage-price-changes-v1'],options:{revalidate:3600,tags:['public-pricing']}}]));
  assert.equal(JSON.stringify(r.logs),JSON.stringify([['homepage-price-changes-read-failed','Error']]));
});
test('actual service fails closed on truncation and removes aged cached events',async()=>{
  const source=[row(1,31,100),row(2,30,80)];
  const capped=cachedReader(async()=>({records:source,now,truncated:true}));
  assert.equal((await capped.load()).length,0);assert.equal(JSON.stringify(capped.logs),JSON.stringify([['homepage-price-changes-read-limit']]));
  const old=new Date('2020-01-02T00:00:00Z');
  const stale=cachedReader(async()=>({records:[row(1,1,100,{observedAt:'2020-01-01T00:00:00Z'}),row(2,0,80,{observedAt:old.toISOString()})],now:old,truncated:false}));
  assert.equal((await stale.load()).length,0);
});

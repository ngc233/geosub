import assert from "node:assert/strict";
import test from "node:test";
import {countryDisplaySummary, filterCountryPlans, type CountryPlanRow} from "./country-hub-display.ts";
const row = (values: Partial<CountryPlanRow> = {}): CountryPlanRow => ({productSlug:"chatgpt",productName:"ChatGPT",category:"ai",planSlug:"plus",planName:"Plus",countryCode:"TR",amount:100,currency:"TRY",checkedAt:"2026-10-30T12:00:00Z",sourceUrl:"https://apps.apple.com/tr/app/id1",observationId:null,usd:null,fxDate:null,difference:null,...values});
test("country counts exclude missing comparisons and do not report 0% for an unknown category",()=>{
  const result=countryDisplaySummary([row(),row({planSlug:"go",difference:-20,usd:4,fxDate:"2026-10-30"}),row({productSlug:"netflix",category:"streaming",difference:0})]);
  assert.equal(result.plans,3);assert.equal(result.products,2);assert.equal(result.comparable,2);assert.equal(result.cheaper,1);
  assert.equal(result.categories[0].percent,100);assert.equal(result.categories[1].percent,0);
  assert.equal(countryDisplaySummary([row()]).categories[0].percent,null);
  assert.equal(countryDisplaySummary([]).collected,"—");assert.equal(countryDisplaySummary([row()]).fx,"—");
});
test("display filtering keeps missing FX out of cheaper results, preserves zero, and does not mutate data",()=>{
  const rows=[row({productSlug:"z",productName:"Z",category:"streaming",usd:20,difference:10}),row({planSlug:"go",usd:5,difference:-50}),row({planSlug:"pro",usd:null}),row({planSlug:"base",usd:10,difference:0})];
  const snapshot=structuredClone(rows);
  assert.deepEqual(filterCountryPlans(rows,"","lower","original").map(x=>x.planSlug),["go"]);
  assert.deepEqual(filterCountryPlans(rows,"","all","price").map(x=>x.usd),[5,10,20,null]);
  assert.deepEqual(filterCountryPlans(rows," CHATGPT ","all","original").map(x=>x.planSlug),["go","pro","base"]);
  assert.equal(filterCountryPlans(rows,"不存在","all","name").length,0);assert.deepEqual(rows,snapshot);
});

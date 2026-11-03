import assert from "node:assert/strict";
import test from "node:test";
import { comparisonPreview, comparisonRows, type ComparisonPlan } from "./overview-comparison.ts";

const plan:ComparisonPlan={slug:"plus",name:"Plus",platform:"ios",billing:"monthly",href:"/zh/ai-pricing/chatgpt/plus",regions:[
  {code:"PH",country:"菲律宾",priceUsd:10,localPrice:"PHP 999",tax:"unknown"},
  {code:"PK",country:"巴基斯坦",priceUsd:11,localPrice:"PKR 4999",tax:"unknown"},
  {code:"CA",country:"加拿大",priceUsd:12,localPrice:"CAD 24",tax:"unknown"},
  {code:"BR",country:"巴西",priceUsd:13,localPrice:"BRL 99",tax:"unknown"},
  {code:"US",country:"美国",priceUsd:20,localPrice:"USD 20",tax:"unknown"},
  {code:"CO",country:"哥伦比亚",priceUsd:30,localPrice:"COP 99999",tax:"unknown"},
]};

test("matrix preview includes minimum, US and maximum while retaining sorted canonical rows",()=>{
  const rows=comparisonRows([plan],"","plus"),before=structuredClone(rows),preview=comparisonPreview(rows,"plus");
  assert.deepEqual(preview.map(row=>row.code),["PH","PK","US","CO"]);
  assert.deepEqual(rows,before);
  for(const row of preview)assert.equal(row,rows.find(original=>original.code===row.code));
});

test("preview does not reintroduce regions excluded by search or change descending order",()=>{
  const filtered=comparisonRows([plan],"巴","plus");
  assert.deepEqual(comparisonPreview(filtered,"plus"),filtered);
  const rows=comparisonRows([plan],"","plus",true);
  assert.deepEqual(comparisonPreview(rows,"plus").map(row=>row.code),["CO","US","BR","PH"]);
});

test("missing baseline, duplicate anchors and unavailable selected-plan quotes are handled without fabricated values",()=>{
  const noUs=comparisonRows([{...plan,regions:plan.regions.filter(row=>row.code!=="US")}],"","plus");
  assert.deepEqual(comparisonPreview(noUs,"plus").map(row=>row.code),["PH","PK","CA","CO"]);
  const usMinimum=comparisonRows([{...plan,regions:plan.regions.map(row=>row.code==="US"?{...row,priceUsd:1}:row)}],"","plus");
  assert.deepEqual(comparisonPreview(usMinimum,"plus").map(row=>row.code),["US","PH","PK","CO"]);
  assert.deepEqual(comparisonPreview(noUs,"not-a-plan").map(row=>row.code),["PH","PK","CA","BR"]);
  assert.deepEqual(comparisonPreview([],"plus"),[]);
});

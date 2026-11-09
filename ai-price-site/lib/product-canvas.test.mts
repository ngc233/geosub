import assert from "node:assert/strict";
import test from "node:test";
import { productCanvasModel } from "./product-canvas.ts";
import { productSaving, sortProductRows } from "./product-canvas-order.ts";
import { getProductOverviewDecisionPlans } from "./pricing-product-overview-copy.ts";
import { homepageDisplayRates } from "./homepage-summary.ts";
import type { SubscriptionProduct, RegionPrice } from "./public-pricing-model.ts";

// Handwritten fictional prices. Never sourced from production or the canvas.
const region = (code: string, usd: number, platform = "ios"): RegionPrice => ({code, country:code, priceUsd:usd, localPrice:`USD ${usd}`, rank:1, tax:"", billingPlatform:platform});
const fixture: SubscriptionProduct = {slug:"fictional-product", name:"Fixture", brand:"Fixture", description:"虚构测试数据", category:"ai", updatedAt:"2026-11-08", defaultPlan:"plus", plans:[
  {slug:"plus", name:"Plus", billing:"monthly", regions:[region("US",20),region("PH",10.005),region("CA",30),region("JP",1,"web")]},
  {slug:"premium", name:"Premium", billing:"yearly", regions:[region("US",100),region("JP",30)]},
  {slug:"monthly", name:"Monthly", billing:"monthly", regions:[region("PH",0),region("CA",5)]},
]};
test("D5 keeps every price exactly in the overview platform/plan scope", () => {
  const model=productCanvasModel(fixture), legacy=getProductOverviewDecisionPlans(fixture);
  for(const [index,plan] of legacy.entries()) {
    assert.equal(model.plans[index].coverage,plan.regions.length);
    assert.deepEqual(model.rows.flatMap(row=>row.cells[index]?[row.code]:[]).sort(),plan.regions.map(p=>p.code).sort());
    assert.equal(model.plans[index].lowest.usd,Math.min(...plan.regions.map(p=>p.priceUsd)));
    for(const row of model.rows)assert.equal(row.cells[index]?.usd,plan.regions.find(p=>p.code===row.code)?.priceUsd);
  }
  assert.equal(model.plans[0].lowest.code,"PH"); // The cheaper web quote is outside this column.
  assert.equal(model.plans[1].cycle,"yearly");
  assert.equal(model.plans[1].name,"高级版");
  assert.equal(model.plans[2].name,"月度会员");
});
test("absent US and sparse cells remain absent, zero is a valid price, negatives stay negative",()=>{
  const m=productCanvasModel(fixture);
  assert.equal(m.plans[2].usPrice,undefined);assert.equal(m.plans[2].saving,null);
  assert.equal(m.plans[2].lowest.usd,0);assert.equal(m.rows.find(r=>r.code==="JP")?.cells[0],null);
  assert.equal(productSaving(30,20),-0.5);assert.equal(productSaving(1,0),null);
  assert.equal(m.plans[0].saving,1-10.005/20);
});
test("both sort directions put missing cells last, preserve ties deterministically, never mutate input",()=>{
  const rows=productCanvasModel(fixture).rows, snapshot=structuredClone(rows);
  assert.deepEqual(sortProductRows(rows,0,"asc").map(r=>r.code),["PH","US","CA","JP"]);
  assert.deepEqual(sortProductRows(rows,0,"desc").map(r=>r.code),["CA","US","PH","JP"]);
  assert.deepEqual(rows,snapshot);
});
test("50 independent synthetic sets preserve matrix/minimum membership and raw-price sorting",()=>{
  for(let seed=1;seed<=50;seed++){
    const product={...fixture,plans:fixture.plans.map((p,i)=>({...p,regions:Array.from({length:12},(_,j)=>region(j===0?"US":`X${j}`,((seed*17+j*31+i*7)%137)/7))}))};
    const m=productCanvasModel(product);
    for(let column=0;column<m.plans.length;column++){
      assert.equal(m.plans[column].lowest.usd,Math.min(...product.plans[column].regions.map(p=>p.priceUsd)));
      for(const direction of ["asc","desc"] as const){
        const values=sortProductRows(m.rows,column,direction).map(r=>r.cells[column]!.usd);
        assert.deepEqual(values,[...values].sort((a,b)=>direction==="asc"?a-b:b-a));
      }
    }
  }
});
test("empty product has no fabricated cards or timestamps; unavailable display rates retain USD fallback",()=>{
  assert.deepEqual(productCanvasModel({...fixture,plans:[]}),{plans:[],rows:[],intro:undefined,summary:undefined,defaultPlan:0});
  const rate={rate:7,source:"fictional",rateDate:"2026-11-08",fetchedAt:"2026-11-08T00:00:00Z",isFallback:false};
  assert.equal(homepageDisplayRates({CNY:rate},new Date("2026-11-08T17:59:59Z")).CNY,7);
  assert.deepEqual(homepageDisplayRates({CNY:rate},new Date("2026-11-08T18:00:01Z")),{USD:1});
});

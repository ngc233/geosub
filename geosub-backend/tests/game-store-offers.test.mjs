import test from "node:test";
import assert from "node:assert/strict";
import {sample, at, xboxId} from "./fixtures/game-offers/sample.mjs";
import {collectGameOffer} from "../scripts/collect-game-offer.mjs";

function xboxItem(data) {
  const products = data.state.core2.products;
  const sku = products.productSummaries[xboxId].preferredSkuId;
  return Object.values(products.availabilitySummaries[xboxId][sku])[0];
}
function psCart(data) {
  const cache = data.component.cache;
  return cache[cache["Product:" + data.page.productId].webctas[0].__ref];
}

test("anonymous Hong Kong standard editions have their own public buyout price and evidence", () => {
  for (const store of ["xbox","ps5"]) {
    const {result,target} = sample(store);
    assert.equal(result.purchasable_status, "available");
    assert.equal(result.public_price, "568.00");
    assert.equal(result.currency, "HKD");
    assert.equal(result.public_promotion, false);
    assert.equal(result.promo_ends_at, null);
    assert.equal(result.proof.product_id.toLowerCase(), target.store_product_id.toLowerCase());
  }
});
test("Xbox edition, upgrade and other add-on prices are present but isolated", () => {
  const {result} = sample("xbox", d => {
    const offers = Object.values(d.state.core2.products.availabilitySummaries).flatMap(s=>Object.values(s).flatMap(Object.values));
    assert.deepEqual(offers.map(x=>x.price.listPrice).sort((a,b)=>a-b), [38,140,568,708]);
    xboxItem(d).price.listPrice = 500;
    xboxItem(d).price.endDateUtc = "11/24/2026 12:00:00";
    d.structured["@graph"][0].offers.price = 500;
  });
  assert.equal(result.public_price,"500.00");
  assert.equal(result.promo_ends_at,"2026-11-24T12:00:00.000Z");
  assert.equal(sample("ps5").result.public_price,"568.00");
});
test("explicit anonymous PS upgrade ineligibility carries no price", () => {
  const {result} = sample("upgrade");
  assert.equal(result.purchasable_status,"unavailable");
  assert.deepEqual(result.proof.reasons, ["DONT_OWN"]);
  assert.equal(result.public_price,undefined);
});
test("English Hong Kong and ambiguous dollar signs are handled independently", () => {
  assert.equal(sample("ps5",d=>{d.page.locale="en-HK";d.component.overrides.locale="en-HK";},"en-HK").result.currency,"HKD");
  assert.equal(sample("ps5",d=>{psCart(d).price.currencyCode=null;}).result.failure_reason,"missing_evidence");
  assert.equal(sample("xbox",d=>{xboxItem(d).price.currency="USD";}).result.failure_reason,"currency_mismatch");
});
test("market, SKU, login, missing purchase item and conflicting public prices reject the sample", () => {
  assert.equal(sample("xbox",d=>{d.state.appContext.marketInfo.market="US";}).result.failure_reason,"region_mismatch");
  assert.equal(sample("ps5",d=>{d.page.productId="OTHER";}).result.failure_reason,"sku_mismatch");
  assert.equal(sample("xbox",d=>{d.state.user.isSignedIn=true;}).result.failure_reason,"missing_evidence");
  assert.equal(sample("xbox",d=>{xboxItem(d).skuId="0000";}).result.failure_reason,"sku_mismatch");
  assert.equal(sample("xbox",d=>{d.structured["@graph"][0].offers.price=38;}).result.failure_reason,"parse_ambiguous");
  assert.equal(sample("ps5",d=>{psCart(d).price.qualifications=["UNKNOWN"];}).result.failure_reason,"parse_ambiguous");
});
test("subscription access, targeted discounts and membership never become a public zero", () => {
  const {result}=sample("xbox", d=>{
    const products=d.state.core2.products, plain=xboxItem(d);
    const other=structuredClone(plain);
    other.availabilityId=other.price.availabilityId="member";
    other.price.eligibilityInfo.eligibility="Subscription";
    other.price.listPrice=0;
    products.availabilitySummaries[xboxId][plain.skuId].member=other;
    products.productSummaries[xboxId].includedWithPassesProductIds=["pass"];
  });
  assert.equal(result.public_price,"568.00");
  assert.equal(result.included_in_subscription,true);
  assert.equal(sample("xbox",d=>{xboxItem(d).price.hasXPriceOffer=true;}).result.failure_reason,"parse_ambiguous");
  assert.equal(sample("ps5",d=>{psCart(d).price.isTiedToSubscription=true;}).result.failure_reason,"parse_ambiguous");
});
test("duplicate unrestricted Xbox offers fail closed and elapsed promo prices do not enter review", () => {
  const duplicate=sample("xbox",d=>{
    const item=structuredClone(xboxItem(d));
    item.availabilityId=item.price.availabilityId="duplicate";
    d.state.core2.products.availabilitySummaries[xboxId][item.skuId].duplicate=item;
  });
  assert.equal(duplicate.result.failure_reason,"parse_ambiguous");
  const elapsed=sample("ps5",d=>{
    const p=psCart(d).price;p.discountedValue=50000;p.endTime=at;
  });
  assert.equal(elapsed.result.failure_reason,"parse_ambiguous");
});
test("PS membership buyout is optional detail and an expired or subscription-only offer preserves the public price", () => {
  for (const mode of ["buyout", "expired", "access"]) {
    const {result} = sample("ps5", data => {
      const cache = data.component.cache, product = cache["Product:" + data.page.productId];
      const member = structuredClone(psCart(data));
      member.id += ":MEMBER";
      Object.assign(member.price, {membershipType:"PS Plus", discountedValue:45400,
        isTiedToSubscription:mode === "access", endTime:mode === "expired" ? at : null});
      cache["GameCTA:" + member.id] = member;
      product.webctas.push({__ref:"GameCTA:" + member.id});
    });
    assert.equal(result.public_price,"568.00");
    assert.equal(result.member_price,mode === "buyout" ? "454.00" : undefined);
  }
});
test("HTTP rejects wrong-market redirects before making another request", async () => {
  const {target}=sample("xbox");
  let count=0;
  const result=await collectGameOffer(target,{request:async()=>{
    count++;
    return Response.redirect(target.store_url.replace("zh-HK","en-US"),302);
  }});
  assert.equal(result.failure_reason,"region_mismatch");
  assert.equal(count,1);
});
test("HTTP transport handles both a real response shape and a transient failure", async () => {
  const {target,html}=sample("ps5");
  const collected=await collectGameOffer(target,{request:async()=>new Response(html,{headers:{"content-type":"text/html; charset=utf-8"}})});
  assert.equal(collected.public_price,"568.00");
  const failed=await collectGameOffer(target,{request:async()=>new Response(null,{status:503})});
  assert.equal(failed.failure_reason,"fetch_error");
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { getBillingSourceText, getBillingSourceFaqs } from './billing-source-copy.ts';
import { getProductOverviewChannel, getPricingProductOverviewCopy } from './pricing-product-overview-copy.ts';
import { getProductOverviewSearchFaqs } from './product-overview-search-intent.ts';
import { getPricingDetailPageCopy } from './pricing-detail-page-copy.ts';
import { getPricingDetailSeoCopy } from './pricing-detail-seo-copy.ts';
import type { SubscriptionProduct } from './public-pricing-model.ts';

const product:SubscriptionProduct={slug:'spotify',name:'Spotify Premium',brand:'Spotify',category:'streaming',
  description:'',defaultPlan:'individual',updatedAt:'2026-10-22',plans:[{slug:'individual',name:'Spotify Premium Individual',billing:'monthly',
  regions:[{rank:1,code:'US',country:'United States',billingPlatform:'web',priceUsd:12.99,localPrice:'USD 12.99',tax:'Unknown'}]}]};

test('Web-only canonical dataset selects Web copy, including non-English metadata',()=>{
  assert.equal(getProductOverviewChannel(product),'Web');
  for(const locale of ['zh','en','de'] as const){
    const overview=getPricingProductOverviewCopy({locale,productName:product.name,planCount:1,regionCount:1,billingChannel:'Web'});
    const detail=getPricingDetailSeoCopy({locale,productName:product.name,planName:'Individual',stats:null,regionCount:1,billingChannel:'Web'});
    assert.doesNotMatch(overview.description,/App Store|App-Store/);assert.match(overview.description,/Web/);
    assert.doesNotMatch(detail.description,/App Store|App-Store/);assert.match(detail.description,/Web/);
  }
});
test('Web-only public FAQ never inherits Apple ID requirements',()=>{
  for(const locale of ['zh','en'] as const){
    const faqs=getProductOverviewSearchFaqs({locale,product});
    const detail=getPricingDetailPageCopy({locale,productName:product.name,planName:'Individual',stats:null,billingChannel:'Web'});
    assert.doesNotMatch(JSON.stringify([faqs,detail]),/Apple ID|App Store|App-Store/);
  }
});
test('App Store defaults and experiment copy remain byte-for-byte unchanged',()=>{
  const text='App Store and Apple ID terms';
  assert.equal(getBillingSourceText(text),text);
  assert.equal(getBillingSourceText(text,'App Store'),text);
  const faqs=[{q:'Test',a:text}];assert.equal(getBillingSourceFaqs(faqs),faqs);
  const original=getPricingProductOverviewCopy({locale:'zh',productName:'ChatGPT',planCount:4,regionCount:39});
  const explicit=getPricingProductOverviewCopy({locale:'zh',productName:'ChatGPT',planCount:4,regionCount:39,billingChannel:'App Store'});
  assert.deepEqual(original,explicit);
});

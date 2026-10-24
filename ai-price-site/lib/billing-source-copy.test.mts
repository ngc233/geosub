import test from 'node:test';
import assert from 'node:assert/strict';
import { getBillingSourceText, getBillingSourceFaqs } from './billing-source-copy.ts';
import { getProductOverviewChannel, getPricingProductOverviewCopy } from './pricing-product-overview-copy.ts';
import { getProductOverviewSearchFaqs } from './product-overview-search-intent.ts';
import { getPricingDetailPageCopy } from './pricing-detail-page-copy.ts';
import { getPricingDetailSeoCopy } from './pricing-detail-seo-copy.ts';
import type { SubscriptionProduct } from './public-pricing-model.ts';
import { getRegionPriceTableCopy } from './region-price-table-copy.ts';
import { getPricingPressureCopy } from './pricing-pressure-copy.ts';
import { buildPricingStructuredData } from './pricing-seo.ts';
import { supportedSiteLocales } from './site-locale.ts';

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

test('Web table tax/access text and affordability empty state match the canonical channel in every locale',()=>{
  for(const locale of supportedSiteLocales){
    const table=getRegionPriceTableCopy(locale,'Web');
    const pressure=getPricingPressureCopy(locale,'Web');
    assert.doesNotMatch(JSON.stringify([table,pressure]),/App Store|App-Store/);
    assert.match(table.taxRankingPolicy,/Web/);
    assert.match(pressure.pending.noRows,/Web/);
    assert.deepEqual(getRegionPriceTableCopy(locale),getRegionPriceTableCopy(locale,'App Store'));
    assert.deepEqual(getPricingPressureCopy(locale),getPricingPressureCopy(locale,'App Store'));
  }
});

test('structured dataset measurement follows its selected plan platform, preserving iOS output',()=>{
  for(const locale of supportedSiteLocales){
    const build=(billingPlatform:string)=>buildPricingStructuredData({locale,path:'/en/streaming-pricing/spotify/individual',title:'Title',description:'Description',product,plan:{...product.plans[0],regions:product.plans[0].regions.map(row=>({...row,billingPlatform}))},faqs:[]});
    const web=build('web')['@graph'][0];
    assert.doesNotMatch(JSON.stringify(web),/App Store|App-Store/);
    assert.match(JSON.stringify(web.variableMeasured),/Web/);
    assert.match(JSON.stringify(build('ios')['@graph'][0].variableMeasured),/App Store|App-Store/);
  }
});

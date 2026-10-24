import test from 'node:test';
import assert from 'node:assert/strict';
import { getProductEditorialContent } from './product-editorial-content.ts';
import { buildPricingReportDataset } from './pricing-report.ts';

test('Spotify regional tiers have separate account and billing descriptions',()=>{
  for(const locale of ['zh','en'] as const) {
    const standard=getProductEditorialContent(locale,'spotify','standard');
    const platinum=getProductEditorialContent(locale,'spotify','platinum');
    assert.ok(standard);assert.ok(platinum);
    assert.notEqual(standard.plan.difference,platinum.plan.difference);
    assert.match(standard.plan.difference,locale==='zh'?/一个 Standard 账号/:/one Standard account/);
    assert.match(platinum.plan.difference,locale==='zh'?/三个同住成员账号/:/three accounts/);
    assert.match(platinum.plan.availabilityNote || '',locale==='zh'?/美国暂无同名套餐/:/No same-plan US price/);
    assert.ok(getProductEditorialContent(locale,'spotify','individual'));
    assert.ok(getProductEditorialContent(locale,'spotify','family'));
  }
});
test('regional Spotify reports retain an unavailable US comparison per plan',()=>{
  const product={slug:'spotify',name:'Spotify Premium',brand:'Spotify',category:'streaming' as const,
    description:'Regional music tiers',defaultPlan:'standard',updatedAt:'2026-10-25',
    plans:['standard','platinum'].map(slug=>({slug,name:`Spotify Premium ${slug}`,billing:'monthly' as const,
      regions:[{rank:1,code:'AE',country:'United Arab Emirates',priceUsd:slug==='standard'?6.53:16.34,
        localPrice:slug==='standard'?'AED 23.99':'AED 59.99',localPriceValue:slug==='standard'?23.99:59.99,
        currencyCode:'AED',tax:'Tax determined at checkout',billingPlatform:'web',dataQuality:'verified' as const,
        lastCheckedAt:'2026-10-25',sourceName:'Spotify Official Web Pricing',sourceUrl:'https://www.spotify.com/ae-en/premium/'}]}))};
  const dataset=buildPricingReportDataset({product,exchangeRates:{},generatedAt:new Date('2026-10-25T01:00:00Z')});
  assert.deepEqual(dataset.rows.map(r=>r.planSlug),['standard','platinum']);
  assert.ok(dataset.rows.every(r=>r.differenceVsUsPercent===null));
});

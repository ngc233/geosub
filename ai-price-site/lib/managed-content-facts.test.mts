import assert from 'node:assert/strict';
import test from 'node:test';
import { initialContentDraft, parseOverviewContent } from './managed-content.ts';
import { projectClaudeFactProduct, renderFactContent } from './managed-content-facts.ts';
import type { RegionPrice, SubscriptionProduct } from './public-pricing-model.ts';
import { verifyContentHtml, matchesContentDistributionEvidence } from './content-readback.ts';
const id='overview:en:claude';
const region=(patch:Partial<RegionPrice>={}):RegionPrice=>({rank:1,code:'US',country:'United States',priceUsd:20,localPrice:'$20.00',localPriceValue:20,currencyCode:'USD',billingPlatform:'ios',priceType:'list_price',dataQuality:'verified',confidenceScore:100,lastCheckedAt:'2026-10-20',formalFxRateDate:'2026-10-19',tax:'Unknown',...patch});
const product=(regions:RegionPrice[]=[region()]):SubscriptionProduct=>({slug:'claude',name:'Claude',category:'ai',brand:'Anthropic',description:'',defaultPlan:'pro',updatedAt:'2099-01-01',plans:[{slug:'pro',name:'Claude Pro',billing:'monthly',priceStatus:'published',regions}]});
const template=()=>parseOverviewContent({...initialContentDraft(id),title:'{{product.name}} plans',heading:'{{pro.name}} facts',description:'{{pro.price_range}}; {{pro.regions}}',sections:[{heading:'Dates',body:'{{pro.price_date}}; {{pro.fx_date}}'}],faqs:[{q:'What is the coverage?',a:'{{pro.regions}}'}]},id);
test('fixed tokens are accepted only for registered Claude editorial fields',()=>{
 assert.equal(template().title,'{{product.name}} plans');
 assert.equal(parseOverviewContent({...initialContentDraft('overview:en:chatgpt'),description:'Literal closing braces }} remain plain text.'}).description,'Literal closing braces }} remain plain text.');
 for(const text of ['{{other.price}}','{{pro.regions + 1}}','{{pro.price_range|raw}}','{{__proto__}}','{{constructor}}','{{product.price}}','{{pro.price_range}','{{ pro.regions }}','{{plan_id}}'])assert.throws(()=>parseOverviewContent({...initialContentDraft(id),description:text},id));
 assert.throws(()=>parseOverviewContent({...initialContentDraft('overview:en:chatgpt'),description:'{{pro.regions}}'}));
 assert.throws(()=>parseOverviewContent({...initialContentDraft(id),sources:['https://claude.com/{{product.name}}']},id));
 for(const value of ['$20','20美元','23 countries','覆盖 20 个地区'])assert.throws(()=>parseOverviewContent({...initialContentDraft(id),description:value},id));
});
test('price, coverage, independent date ranges and FAQ derive from one canonical snapshot',()=>{
 const raw=product([region(),region({code:'GB',country:'UK',priceUsd:25,lastCheckedAt:'2026-10-22',formalFxRateDate:'2026-10-21'})]);
 const before=structuredClone(raw),source=template(),saved=structuredClone(source);
 const out=renderFactContent(source,id,projectClaudeFactProduct(raw));
 assert.match(out.content.description,/USD \$20.00–\$25.00; monthly App Store 2 regions/);
 assert.equal(out.content.faqs[0].a,'monthly App Store 2 regions');
 assert.match(out.content.sections[0].body,/price collected: 2026-10-20 to 2026-10-22; FX date: 2026-10-19 to 2026-10-21/);
 assert.match(out.factsHash!,/^[a-f0-9]{64}$/);assert.deepEqual(raw,before);assert.deepEqual(source,saved);
 const zh=renderFactContent(source,'overview:zh:claude',projectClaudeFactProduct(raw));assert.match(zh.content.description,/2 个地区/);assert.equal(zh.factsHash,out.factsHash);
});
test('wrong platform, cycle, status, quality, price type and invalid numbers never enter facts',()=>{
 for(const patch of [{billingPlatform:'web'},{priceType:'trial'},{dataQuality:'pending_review'},{dataQuality:'estimated'},{dataQuality:'stale'},{confidenceScore:70},{priceUsd:NaN},{priceUsd:0},{localPriceValue:0},{lastCheckedAt:undefined},{lastCheckedAt:'2026-02-30'},{currencyCode:'?'}]){
  const raw=product([region(patch as Partial<RegionPrice>)]);assert.equal(projectClaudeFactProduct(raw).plans[0].regions.length,0);
 }
 for(const patch of [{billing:'yearly'},{priceStatus:'pending'},{priceStatus:'empty'}]){const p=product();Object.assign(p.plans[0],patch);assert.equal(projectClaudeFactProduct(p).plans[0].regions.length,0);}
});
test('duplicate regional identities are quarantined instead of counting or choosing one',()=>{
 const raw=product([region(),region({priceUsd:21}),region({code:'GB'})]);const p=projectClaudeFactProduct(raw);
 assert.equal(p.plans[0].regions.length,1);assert.equal(p.plans[0].regions[0].code,'GB');
});
test('unknown data is not zero, and neither product update nor wall clock substitutes dates',()=>{
 const empty=renderFactContent(template(),id,projectClaudeFactProduct(product([])));
 assert.match(empty.content.description,/data unavailable/);assert.doesNotMatch(empty.content.description,/0 regions|\$0/);
 const noFx=renderFactContent(template(),id,projectClaudeFactProduct(product([region({formalFxRateDate:undefined,fxRateDate:'2099-01-01'})])));
 assert.match(noFx.content.sections[0].body,/FX date: date unavailable/);assert.doesNotMatch(noFx.content.sections[0].body,/2099/);
});
test('formal data changes alter rendered fingerprint without changing stored content',()=>{
 const source=template(),first=renderFactContent(source,id,projectClaudeFactProduct(product()));
 const second=renderFactContent(source,id,projectClaudeFactProduct(product([region({priceUsd:30})])));
 assert.notEqual(first.factsHash,second.factsHash);assert.notEqual(first.content.description,second.content.description);assert.equal(source.description,'{{pro.price_range}}; {{pro.regions}}');
});
test('long rendered fields fall back as a whole, not truncated numeric claims',()=>{
 const content={...template(),title:'Facts '.repeat(7)+'{{pro.price_date}}{{pro.fx_date}}'};
 assert.match(renderFactContent(content,id,projectClaudeFactProduct(product())).content.title,/display limit/);
});
test('token readback pins both rendering and canonical fact hash',()=>{
 const rendered=renderFactContent(template(),id,projectClaudeFactProduct(product()));
 const c=rendered.content,h=rendered.factsHash!;
 const html=`<title>${c.title} - GeoSub</title><h1>${c.heading}</h1><meta name="description" content="${c.description}"><meta property="og:description" content="${c.description}"><meta name="twitter:description" content="${c.description}"><link rel="canonical" href="https://geosub.org/en/ai-pricing/claude"><main data-content-version="1" data-content-mode-generation="0" data-content-facts-hash="${h}"></main>`;
 const expected={title:c.title+' - GeoSub',heading:c.heading,description:c.description,version:'1',modeGeneration:'0',factsHash:h};
 const proof=verifyContentHtml(html,expected,id);assert.equal(proof.factsHash,h);
 assert.throws(()=>verifyContentHtml(html.replace(h,'a'.repeat(64)),expected,id),/factsHash/);
 const receipt={status:'verified' as const,stage:'complete' as const,origin:proof,public:proof,purge:{acceptedAt:'2026-10-20',url:'https://geosub.org/en/ai-pricing/claude'}};
 assert.equal(matchesContentDistributionEvidence(receipt,1,0,id,true),true);
 assert.equal(matchesContentDistributionEvidence({...receipt,public:{...proof,factsHash:'a'.repeat(64)}},1,0,id,true),false);
});

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

// Inspect actual PDF link annotations, not just printed URL text or HTTP 200.
const run = spawnSync(process.execPath, ["--conditions=react-server", "--experimental-strip-types", "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "--input-type=module", "-e", `
import {renderPricingReportPdf} from './lib/pricing-report-pdf.ts';
import {buildPricingReportDataset} from './lib/pricing-report.ts';
const results=[];
for(const locale of ['zh','zh-tw','en','ja','ko','es','tr','ar','fr','it','de','pt']) {
 const product={slug:'fixture',name:'Premium',category:'streaming',plans:[{slug:'plan',name:'Premium Standard with Ads and Downloads',billing:'monthly',regions:Array.from({length:40},(_,i)=>({rank:i+1,country:'United States',code:'US',priceUsd:12.99,localPriceValue:12.99,currencyCode:'USD',tax:'Tax varies; confirm the final displayed amount at checkout.',lastCheckedAt:'2026-10-25',sourceName:'Source '+i,sourceUrl:'https://example.org/pricing/'+('long-path-'.repeat(28))+i,dataQuality:'verified'}))}]};
 const dataset=buildPricingReportDataset({product,exchangeRates:{},locale,generatedAt:new Date('2026-10-25T00:00:00Z')});
 dataset.pricingSources.push(...['javascript:alert(1)','file:///tmp/private','https://user:password@example.org/','https://example.org/\\nambiguous'].map(url=>({name:'Invalid source',url,status:'linked'})),{name:'No URL',url:null,status:'unlinked'});
 const original=JSON.stringify(dataset),bytes=await renderPricingReportPdf(dataset),pdf=Buffer.from(bytes).toString('latin1');
 const uris=[...pdf.matchAll(/\\/URI \\(([^)]*)\\)/g)].map(m=>m[1]);
 const targets=[dataset.canonicalPageUrl,dataset.canonicalReportUrl,...dataset.pricingSources.slice(0,40).map(s=>s.url)];
 const rects=[...pdf.matchAll(/\\d+ \\d+ obj([\\s\\S]*?)endobj/g)].filter(m=>m[1].includes('/Subtype /Link')).map(m=>m[1].match(/\\/Rect \\[([^\\]]+)\\]/)[1].trim().split(/\\s+/).map(Number));
 results.push({locale,unchanged:original===JSON.stringify(dataset),allTargets:targets.every(url=>uris.includes(url)),onlyExpected:uris.every(url=>targets.includes(url)),wrapped:uris.filter(url=>url===targets[2]).length>1,rectangles:rects.length===uris.length&&rects.every(r=>r.length===4&&r.every(Number.isFinite)&&r[0]>=39&&r[2]<=556&&r[1]>=54&&r[3]<=794),pages:[...pdf.matchAll(/\\/Type \\/Page\\b/g)].length});
}
console.log(JSON.stringify(results));
`], { cwd: process.cwd(), encoding: "utf8", timeout: 120000 });
assert.equal(run.status, 0, run.stderr);
for (const row of JSON.parse(run.stdout) as Array<{locale:string;unchanged:boolean;allTargets:boolean;onlyExpected:boolean;wrapped:boolean;rectangles:boolean;pages:number}>) {
  test(`${row.locale} report links preserve destinations across wraps and pages`, () => {
    assert.ok(row.allTargets, "Canonical and source URLs must have real PDF link annotations");
    assert.ok(row.onlyExpected, "Unsafe, ambiguous and missing URLs must not become links");
    assert.ok(row.wrapped && row.rectangles && row.pages > 4, "Wrapped multi-page sources must remain clickable within page bounds");
    assert.ok(row.unchanged, "Link rendering must not mutate canonical data");
  });
}

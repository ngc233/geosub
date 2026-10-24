import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

// Run the real server-only renderer in its supported condition. Count actual
// PDF page objects, so a footer that silently creates pages fails this test.
const run = spawnSync(process.execPath, ["--conditions=react-server", "--experimental-strip-types", "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "--input-type=module", "-e", `
import {renderPricingReportPdf} from './lib/pricing-report-pdf.ts';
import {buildPricingReportDataset} from './lib/pricing-report.ts';
const rows=[];
for(const locale of ['zh','zh-tw','en','ja','ko','es','tr','ar','fr','it','de','pt']) {
 for(const scenario of ['empty','short','continued']) {
  const plans=scenario==='empty'?[]:Array.from({length:scenario==='short'?2:1},(_,i)=>({slug:'plan-'+i,name:'Premium '+i,billing:'monthly',regions:Array.from({length:scenario==='short'?1:100},(_,n)=>({rank:n+1,country:'Region '+n,code:n===0?'US':'R'+n,priceUsd:12.99+i,localPriceValue:12.99+i,currencyCode:'USD',tax:'Tax varies',lastCheckedAt:'2026-10-25',sourceName:'Official',sourceUrl:'https://www.spotify.com/us/premium/',dataQuality:'verified'}))}));
  const dataset=buildPricingReportDataset({product:{slug:'fixture',category:'streaming',name:'Premium',plans},exchangeRates:{},locale,generatedAt:new Date('2026-10-25T00:00:00Z')});
  const before=JSON.stringify(dataset),pdf=await renderPricingReportPdf(dataset);
  if(JSON.stringify(dataset)!==before)throw Error('Renderer mutated canonical input');
  rows.push({locale,scenario,pages:[...Buffer.from(pdf).toString('latin1').matchAll(/\\/Type \\/Page\\b/g)].length});
 }
}
console.log(JSON.stringify(rows));
`], { cwd: process.cwd(), encoding: "utf8", timeout: 120000 });
assert.equal(run.status, 0, run.stderr);
const results = JSON.parse(run.stdout) as Array<{locale:string;scenario:string;pages:number}>;
for (const row of results) {
  test(`${row.locale} ${row.scenario} report has content pages only`, () => {
    if(row.scenario === "empty") assert.equal(row.pages, 2);
    else if(row.scenario === "short") assert.equal(row.pages, 4);
    else assert.ok(row.pages >= 6 && row.pages <= 8, `100 rows should continue across content pages, got ${row.pages}`);
  });
}

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";

// Observe real PDFKit text calls: missing glyphs and text clipped by a height
// box must fail, even if the response is a valid PDF with the expected prices.
const result = spawnSync(process.execPath, ["--conditions=react-server", "--experimental-strip-types", "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", "--input-type=module", "-e", `
import PDF from 'pdfkit';
import {renderPricingReportPdf} from './lib/pricing-report-pdf.ts';
import {buildPricingReportDataset} from './lib/pricing-report.ts';
const original=PDF.prototype.text;let state;
PDF.prototype.text=function(text,x,y,options){
 if(state&&typeof text==='string'){
  state.text.push(text);const face=this._font.font;
  for(const char of text)if(!/[\\s\\p{Default_Ignorable_Code_Point}]/u.test(char)&&face&&!face.hasGlyphForCodePoint(char.codePointAt(0)))state.missing.add(char);
  if(options?.height&&options.width&&text.includes('(US)')&&this.heightOfString(text,{width:options.width})>options.height+0.01)state.clipped++;
 }
 return original.call(this,text,x,y,options);
};
const results=[];
const countries=['United States of America and associated territories','Amerika Birleşik Devletleri ve bağlı bölgeleri','中华人民共和国香港特别行政区及其相关地区','대한민국 및 관련 지역'];
const source='OpenAI 官网价格核验 / 공식 가격 출처 / المصدر الرسمي / vérifié ğİı';
for(const locale of ['zh','zh-tw','en','ja','ko','es','tr','ar','fr','it','de','pt']){
 state={text:[],missing:new Set(),clipped:0};
 const product={slug:'fixture',name:'Premium',category:'streaming',plans:[{slug:'individual',name:'Premium Individual',billing:'monthly',regions:countries.map((country,i)=>({rank:i+1,country,code:'US',priceUsd:12.99,localPriceValue:12.99,currencyCode:'USD',tax:'Tax varies',lastCheckedAt:'2026-10-25',sourceName:source+' '+i,sourceUrl:'https://example.org/pricing/'+('long-path-'.repeat(20))+i,dataQuality:'verified'}))}]};
 const dataset=buildPricingReportDataset({product,exchangeRates:{},locale,generatedAt:new Date('2026-10-25T00:00:00Z')});const before=JSON.stringify(dataset);const bytes=await renderPricingReportPdf(dataset);const text=state.text.join('').replace(/\\s/gu,'');
 results.push({locale,missing:[...state.missing],clipped:state.clipped,completeNames:countries.every(c=>text.includes((c+' (US)').replace(/\\s/gu,'')))&&text.includes(source.replace(/\\s/gu,'')),unchanged:before===JSON.stringify(dataset),pdf:Buffer.from(bytes).subarray(0,5).toString()==='%PDF-'});
}
console.log(JSON.stringify(results));
`], { cwd: process.cwd(), encoding: "utf8", timeout: 120000 });
assert.equal(result.status, 0, result.stderr);
for (const row of JSON.parse(result.stdout) as Array<{locale:string;missing:string[];clipped:number;completeNames:boolean;unchanged:boolean;pdf:boolean}>) {
  test(`${row.locale} long region names and mixed-script provenance remain complete`, () => {
    assert.deepEqual(row.missing, [], "No .notdef glyphs may be drawn");
    assert.equal(row.clipped, 0, "Name must fit its measured row");
    assert.ok(row.completeNames && row.unchanged && row.pdf);
  });
}

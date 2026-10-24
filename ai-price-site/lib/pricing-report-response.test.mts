import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';

const require=createRequire(import.meta.url),ts=require('typescript');
const code=ts.transpileModule(readFileSync(new URL('../app/reports/[locale]/[filename]/route.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;

test('PDF response validator changes with rendered bytes even when the pricing snapshot is unchanged',async()=>{
  let pdf=Buffer.from('%PDF-1.7\nOriginal rendered representation\n%%EOF');
  const dataset={snapshotId:'geosub-fixture-same-data',datasetVersion:'geosub-fixture',canonicalReportUrl:'https://geosub.org/reports/en/fixture-global-pricing.pdf'};
  const result={exports:{} as {GET:(request:Request,context:{params:Promise<{locale:string;filename:string}>})=>Promise<Response>}};
  const mocks:Record<string,unknown>={
    'next/server':{NextResponse:Response},
    '../../../../lib/exchange-rates':{getLatestUsdExchangeRates:async()=>({})},
    '../../../../lib/pricing-detail-adapter':{getPricingDetailProduct:async()=>({plans:[{regions:[{currencyCode:'USD'}]}]})},
    '../../../../lib/pricing-report':{buildPricingReportDataset:()=>dataset},
    '../../../../lib/pricing-report-pdf':{renderPricingReportPdf:async()=>pdf},
    '../../../../lib/site-locale':{isSiteLocale:(locale:string)=>locale==='en'},
  };
  vm.runInNewContext(code,{module:result,exports:result.exports,require:(name:string)=>name==='node:crypto'?require(name):mocks[name],Buffer});
  const get=()=>result.exports.GET(new Request(dataset.canonicalReportUrl),{params:Promise.resolve({locale:'en',filename:'fixture-global-pricing.pdf'})});
  const first=await get(),same=await get();
  assert.equal(first.headers.get('ETag'),same.headers.get('ETag'),'identical representations retain the same validator');
  const original=pdf;
  pdf=Buffer.from('%PDF-1.7\nFixed representation with /Subtype /Link\n%%EOF');
  const fixed=await get();
  assert.notEqual(first.headers.get('ETag'),fixed.headers.get('ETag'),'a renderer-only fix must invalidate the old representation');
  assert.equal(first.headers.get('X-GeoSub-Snapshot-Id'),fixed.headers.get('X-GeoSub-Snapshot-Id'));
  assert.deepEqual(Buffer.from(await first.arrayBuffer()),original);
  assert.deepEqual(Buffer.from(await fixed.arrayBuffer()),pdf);
  assert.equal(fixed.headers.get('Cache-Control'),'no-cache, max-age=0, must-revalidate');
  for(const name of ['CDN-Cache-Control','Cloudflare-CDN-Cache-Control'])assert.equal(fixed.headers.get(name),'public, max-age=300, must-revalidate');
  assert.equal(fixed.headers.get('Link'),`<${dataset.canonicalReportUrl}>; rel="canonical"`);
});

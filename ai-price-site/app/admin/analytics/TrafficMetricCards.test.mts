import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import * as model from '../../../lib/admin-traffic-model.ts';
import type { TrafficSnapshot } from '../../../lib/admin-traffic-model.ts';
const require=createRequire(import.meta.url);
const ts=require('typescript'), React=require('react'), {renderToStaticMarkup}=require('react-dom/server');
const code=ts.transpileModule(readFileSync(new URL('./TrafficMetricCards.tsx',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
const loaded={exports:{default:()=>null}};
new Function('require','module','exports',code)((id:string)=>id.endsWith('.css')?{}:id.endsWith('/admin-traffic-model')?model:require(id),loaded,loaded.exports);
function fixture(): TrafficSnapshot {
 const day={date:'2026-11-04',pv:540,raw_views:556,uv:15,sessions:15,consented_views:52,missing_session:0,sample_views:52,missing_identity:0,automation_views:14,internal_views:0,unclassified_views:2};
 return {version:2,timezone:'UTC',capturedAt:'2026-11-04T13:28:52.197Z',days:[day],totals:[{...day,range:1,side:0,start:day.date,end:day.date}]};
}
const render=(data:unknown,range=1)=>renderToStaticMarkup(React.createElement(loaded.exports.default,{data:model.validateTrafficSnapshot(data),range,metric:'pv',onSelect:()=>{}}));
const card=(html:string,key:string)=>html.match(new RegExp(`<button[^>]*data-traffic-metric="${key}"[\\s\\S]*?</button>`))![0];
test('actual PV card renders 540 with unclassified 2 and all exclusions',()=>{
 const html=render(fixture());
 assert.match(card(html,'pv'),/<strong>540<small>/);
 assert.match(html,/自动化 14、内部 0、未分类 2/);
 assert.match(html,/覆盖 1\/1 天/);
 assert.match(card(html,'uv'),/同意统计的样本/); assert.match(card(html,'sessions'),/同意统计的样本/);
});
test('actual PV card displays numeric 0, never an em dash',()=>{
 const data=fixture();data.days[0].pv=0;data.totals[0].pv=0;
 assert.match(card(render(data),'pv'),/<strong>0<small>/);
});
test('missing response PV only disables PV with reason and preserves UV/Sessions',()=>{
 const data=fixture();Reflect.deleteProperty(data.totals[0],'pv');Reflect.deleteProperty(data.days[0],'pv');
 const html=render(data);
 assert.match(card(html,'pv'),/<strong>—<small>/);assert.match(card(html,'pv'),/返回数据缺少 PV 字段/);
 assert.match(card(html,'uv'),/<strong>15<small>/);assert.match(card(html,'sessions'),/<strong>15<small>/);
 assert.equal(Object.hasOwn(data.totals[0],'pv'),false,'normalization must not mutate its input');
});
test('partial period shows available sum, coverage/reason and no misleading comparison',()=>{
 const data=fixture();data.totals[0]={...data.totals[0],range:7,start:'2026-10-29'};
 data.days.push({...data.days[0],date:'2026-10-30',pv:null,pv_reason:'classification_mismatch'});
 data.totals.push({...data.totals[0],side:1,pv:300,start:'2026-10-22',end:'2026-10-28'});
 const html=card(render(data,7),'pv');
 assert.match(html,/<strong>540<small>/);assert.match(html,/覆盖 1\/7 天 · 可用日期合计/);
 assert.match(html,/分类计数与原始计数不一致 1 天/);assert.match(html,/缺少日期记录 5 天/);assert.doesNotMatch(html,/较上期/);
});
test('all unavailable keeps dash with reason; invalid PV is still rejected',()=>{
 const data=fixture();data.days[0].pv=null;data.days[0].pv_reason='missing_raw';data.totals[0].pv=null;
 assert.match(card(render(data),'pv'),/<strong>—<small>/);assert.match(render(data),/缺少原始浏览计数/);
 data.totals[0].pv=-1;assert.throws(()=>model.validateTrafficSnapshot(data));
});
test('CSV preserves zero, missing reason and visitor-scoped session definition',()=>{
 const data=fixture();data.days[0].pv=0;
 assert.match(model.trafficCsv(data.days,data.capturedAt),/"2026-11-04","0","yes"/);
 Reflect.deleteProperty(data.days[0],'pv');
 const csv=model.trafficCsv(model.validateTrafficSnapshot(data).days,data.capturedAt);
 assert.match(csv,/sessions_consented_visitor_scoped/);assert.match(csv,/"","no","返回数据缺少 PV 字段"/);
});

test('old snapshots cannot silently reuse the previous session definition',()=>{
 const data={...fixture(),version:1};assert.throws(()=>model.validateTrafficSnapshot(data),/v2 快照/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { createPageViewScreener, headerScreeningReason } from "./page-view-screening.ts";

const chrome="Mozilla/5.0 Chrome/140.0.0.0 Safari/537.36";
const firefox="Mozilla/5.0 Gecko/20100101 Firefox/140.0";
const header=(extra:Record<string,string>={})=>new Headers({"user-agent":chrome,"x-real-ip":"192.0.2.10","sec-fetch-mode":"cors","sec-fetch-dest":"empty",...extra});

test("ordinary browsers, webviews, missing optional headers and old versions are not bots",()=>{
 for(const ua of [chrome,firefox,"Mozilla/5.0 Version/18.0 Safari/605.1.15","Mozilla/5.0 (Linux; Android 14; wv) Chrome/130.0 Mobile Safari/537.36","Mozilla/5.0 Firefox/80.0",""]){
  assert.equal(headerScreeningReason(new Headers({"user-agent":ua})),null);
 }
 assert.equal(headerScreeningReason(header({"sec-ch-ua":'"Chromium";v="140", "Google Chrome";v="140"'})),null);
});
test("known automation agents are separated even when claiming ordinary population",()=>{
 for(const ua of ["Googlebot/2.1","Mozilla/5.0 (compatible; bingbot/2.0)","GPTBot/1.0","ClaudeBot/1.0","HeadlessChrome/140.0","python-requests/2.32","curl/8.0","Go-http-client/1.1","Lighthouse","facebookexternalhit/1.1"]){
  assert.equal(createPageViewScreener().classify("eligible",header({"user-agent":ua}),"/zh",0),"suspected",ua);
 }
});
test("contradictory fetch and browser headers are suspicious, absent hints are not",()=>{
 const cases:Record<string,string>[]=[{"sec-fetch-mode":"navigate"},{"sec-fetch-dest":"document"},{"user-agent":firefox,"sec-ch-ua":'"Chromium";v="140"'}];
 for(const extra of cases){
  assert.equal(headerScreeningReason(header(extra)),"inconsistent_browser_headers");
 }
 assert.equal(headerScreeningReason(header({"user-agent":firefox})),null);
});
test("client opt-out categories remain excluded and do not create rate state",()=>{
 const s=createPageViewScreener();
 for(const population of ["automation","internal","unclassified"] as const)assert.equal(s.classify(population,header({"user-agent":"Googlebot/2.1"}),"/zh",0),population);
 assert.equal(s.size,0);
});
test("rapid broad navigation requires both thresholds and expires at sixty seconds",()=>{
 const s=createPageViewScreener();
 for(let i=0;i<120;i++)assert.equal(s.classify("eligible",header(),`/zh/${i%30}`,i),"eligible");
 assert.equal(s.classify("eligible",header(),"/zh/next",120),"suspected");
 assert.equal(s.classify("eligible",header(),"/zh/next",60_000),"eligible");
});
test("repeated reloads alone and slower broad navigation do not trigger the broad-crawl signal",()=>{
 const s=createPageViewScreener();
 for(let i=0;i<200;i++)assert.equal(s.classify("eligible",header(),"/zh",i),"eligible");
 const slower=createPageViewScreener();
 for(let i=0;i<200;i++)assert.equal(slower.classify("eligible",header(),`/zh/${i}`,i*1000),"eligible");
});
test("different sources and browser agents are independent; unknown IPs never share a bucket",()=>{
 const s=createPageViewScreener();
 for(let i=0;i<150;i++){
  assert.equal(s.classify("eligible",header({"x-real-ip":""}),`/zh/${i}`,i),"eligible");
  assert.equal(s.classify("eligible",header({"x-real-ip":"not-an-ip"}),`/zh/${i}`,i),"eligible");
 }
 assert.equal(s.size,0);
 for(let i=0;i<121;i++)s.classify("eligible",header(),`/zh/${i}`,i);
 assert.equal(s.classify("eligible",header({"x-real-ip":"192.0.2.11"}),"/zh",122),"eligible");
 assert.equal(s.classify("eligible",header({"user-agent":firefox}),"/zh",122),"eligible");
});
test("client-controlled forwarded-for cannot rotate the trusted proxy identity",()=>{
 const s=createPageViewScreener();
 for(let i=0;i<120;i++)s.classify("eligible",header({"x-forwarded-for":`198.51.100.${i}`}),`/zh/${i}`,i);
 assert.equal(s.classify("eligible",header({"x-forwarded-for":"198.51.100.254"}),"/zh/end",121),"suspected");
});
test("memory capacity, inactive expiry and clock reversal are bounded",()=>{
 const s=createPageViewScreener({maxKeys:2});
 for(let i=1;i<=3;i++)s.classify("eligible",header({"x-real-ip":`192.0.2.${i}`}),"/zh",0);
 assert.equal(s.size,2);s.prune(60_000);assert.equal(s.size,0);
 s.classify("eligible",header(),"/zh",100);s.prune(99);assert.equal(s.size,0);
});

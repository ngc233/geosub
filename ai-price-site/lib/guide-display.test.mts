import assert from "node:assert/strict";
import test from "node:test";
import {filterGuideEntries,guideContentsFromHtml,publicGuideTypeLabel,type GuideDirectoryEntry} from "./guide-display.ts";

test("guide search and field-based filters retain unknown article types without reclassification",()=>{
  const entries:GuideDirectoryEntry[]=[{id:"a",href:"/a",title:"价格阅读",description:"税费与汇率",label:"指南",articleType:"GUIDE",core:true,updated:null},{id:"b",href:"/b",title:"采集方法",description:"来源",label:"方法",articleType:"METHODOLOGY",core:true,updated:null},{id:"c",href:"/c",title:"价格更新",description:"动态",label:"资讯",articleType:"NEWS",core:false,updated:null},{id:"d",href:"/d",title:"工具测评",description:"边界",label:"测评",articleType:"REVIEW",core:false,updated:null}];
  const snapshot=structuredClone(entries);
  assert.deepEqual(filterGuideEntries(entries," 汇率 ","all").map(x=>x.id),["a"]);
  assert.deepEqual(filterGuideEntries(entries,"","core").map(x=>x.id),["a","b"]);
  assert.deepEqual(filterGuideEntries(entries,"","NEWS").map(x=>x.id),["c"]);
  assert.equal(filterGuideEntries(entries,"不存在","METHODOLOGY").length,0);
  assert.equal(publicGuideTypeLabel("NEWS","更新"),"资讯");
  assert.equal(publicGuideTypeLabel("REVIEW","测评"),"测评");
  assert.deepEqual(entries,snapshot);
});

test("article contents preserve sanitized markup and existing anchors, avoid new ID collisions",()=>{
  const original='<p>正文 &amp; 来源</p><h2 id="guide-section-2">原锚点</h2><h3><strong>税费</strong> &amp; 汇率</h3><p><a href="/zh/data-sources">来源</a></p><h2>下一节</h2>';
  const result=guideContentsFromHtml(original);
  assert.deepEqual(result.items,[{id:"guide-section-2",title:"原锚点"},{id:"guide-section-3",title:"税费 & 汇率"},{id:"guide-section-4",title:"下一节"}]);
  assert(result.html.includes('<h2 id="guide-section-2">原锚点</h2>'));
  assert(result.html.includes('<strong>税费</strong> &amp; 汇率'));
  assert(result.html.includes('<a href="/zh/data-sources">来源</a>'));
  assert.deepEqual(guideContentsFromHtml('<p>无章节</p>'),{html:'<p>无章节</p>',items:[]});
});

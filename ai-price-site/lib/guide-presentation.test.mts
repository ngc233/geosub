import assert from 'node:assert/strict';
import test from 'node:test';
import { filterGuideCards, guideCategories, guidePriceLinks, guideProgress } from './guide-presentation.ts';
test('guide filters retain source order, full prose and destinations', () => {
 const cards = [{href:'/zh/guides/a',title:'甲',description:'完整正文摘要',category:'付款'}, {href:'/zh/guides/b',title:'乙',category:'账号'}, {href:'/zh/guides/c',title:'丙',category:'付款'}];
 assert.deepEqual(guideCategories(cards), ['付款','账号']); assert.equal(filterGuideCards(cards,'all'),cards);
 assert.deepEqual(filterGuideCards(cards,'付款'),[cards[0],cards[2]]); assert.deepEqual(filterGuideCards(cards,'空'),[]);
});
test('related prices are bounded and only match existing relation destinations', () => {
 const links=['https://example.com/zh/ai-pricing/chatgpt','/zh/guides/methodology','/en/ai-pricing/chatgpt','/zh/ai-pricing/chatgpt','/zh/ai-pricing/chatgpt','/zh/streaming-pricing/netflix/standard','/zh/ai-pricing/claude','/zh/ai-pricing/gemini'].map(href=>({href,title:href}));
 const actual=guidePriceLinks(links);
 assert.deepEqual(actual.map(x=>x.href),[links[3].href,links[5].href,links[6].href]);
 assert.equal(actual[1].planSlug,'standard'); assert.equal(actual[0].planSlug,undefined);
});
test('reading progress has bounded start, middle and end; handles short articles', () => {
 assert.equal(guideProgress(100,2000,800),0); assert.equal(guideProgress(-600,2000,800),50);
 assert.equal(guideProgress(-1500,2000,800),100); assert.equal(guideProgress(0,200,800),0);
 assert.equal(guideProgress(-1,200,800),100);
});

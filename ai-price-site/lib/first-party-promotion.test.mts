import test from 'node:test';
import assert from 'node:assert/strict';
import { APPROVED_DESTINATIONS, PLACEMENTS, canPromote, eligible, promotionRuntime, parseDraft, approvedDestination, publicPromotion, type Revision, type Review } from './first-party-promotion.ts';
const now = Date.parse('2026-10-15T00:00:00Z');
const content = parseDraft({ placement:'zh_home_brand', merchant:'测试商户', title:'测试', description:'仅用于单元测试', cta:'查看', destination:'https://merchant.example/offer', evidence:'fixture-reference', startsAt:'2026-10-14T00:00:00Z', endsAt:'2026-10-16T00:00:00Z' });
const revision: Revision = { id:'revision', campaign:'campaign', author:'writer', digest:'hash', content };
const review: Review = { revision:'revision', digest:'hash', actor:'reviewer', status:'approved', evidence:'fixture', termsDate:'2026-10-14T00:00:00Z', expiresAt:'2026-10-16T00:00:00Z', scope:'home', limitations:'test only' };
const state = { generation:1, enabled:true, placementEnabled:true, revision:'revision' };
const allowed = ['https://merchant.example/offer'];
test('only zh home bound; actual merchant allowlist is empty', () => { assert.equal(PLACEMENTS.length,3); assert.deepEqual(PLACEMENTS.filter(p=>p.path).map(p=>p.path),['/zh']); assert.equal(APPROVED_DESTINATIONS.length,0); assert.equal(publicPromotion(state,revision,review,now),null); });
test('role capability boundary',()=>{ for (const role of ['EDITOR','VIEWER','unknown']) for(const op of ['review','enable','off','pause']) assert.equal(canPromote(role,op),false); assert.equal(canPromote('EDITOR','draft'),true); assert.equal(canPromote('VIEWER','draft'),false); assert.equal(canPromote('OWNER','unknown'),false); });
test('production and generic restored databases cannot activate this phase',()=>{ assert.equal(promotionRuntime('postgres://127.0.0.1/geosub_promotion_test','isolated-v1'),true); for(const url of ['postgres://192.0.2.1/geosub_promotion_test','postgres://127.0.0.1/geosub_app','postgres://127.0.0.1/geosub_release_20260917']) assert.equal(promotionRuntime(url,'isolated-v1'),false); assert.equal(promotionRuntime('postgres://127.0.0.1/geosub_promotion_test','production'),false); });
test('exact approved destination resists scope and URL bypass',()=>{ assert.equal(approvedDestination(allowed[0],allowed),true); for(const u of ['http://merchant.example/offer','https://merchant.example/offer?next=https://evil.example','https://merchant.example.evil/offer','https://user@merchant.example/offer','https://merchant.example:444/offer','https://merchant.example/offer#x','https://merchant.example/%6ffer','https://127.0.0.1/offer']) assert.equal(approvedDestination(u,allowed),false); });
test('all eligibility gates fail closed and start/end are half-open',()=>{
 assert.equal(eligible(state,revision,review,now,allowed),true);
 assert.equal(eligible(state,revision,review,Date.parse(content.startsAt),allowed),true);
 assert.equal(eligible(state,revision,review,Date.parse(content.endsAt),allowed),false);
 assert.equal(eligible(state,revision,review,Date.parse(content.startsAt)-1,allowed),false);
 for(const s of [{...state,enabled:false},{...state,placementEnabled:false},{...state,revision:'other'}]) assert.equal(eligible(s,revision,review,now,allowed),false);
 for(const r of [{...review,status:'revoked' as const},{...review,status:'rejected' as const},{...review,digest:'changed'},{...review,actor:'writer'},{...review,expiresAt:'invalid'},{...review,evidence:''}]) assert.equal(eligible(state,revision,r,now,allowed),false);
 for(const placement of ['zh_google_one_related','zh_telegram_premium_related'] as const) assert.equal(eligible(state,{...revision,content:{...content,placement}},review,now,allowed),false);
 assert.equal(eligible(state,null,review,now,allowed),false);
});
test('draft validates plain text, required expiry, UTC and finite positions',()=>{for(const patch of [{title:'<script>'},{description:'a'.repeat(301)},{endsAt:''},{endsAt:'2026-02-30T00:00:00Z'},{startsAt:'2026-10-14T00:00:00+08:00'},{endsAt:content.startsAt},{placement:'zh_everywhere'}]) assert.throws(()=>parseDraft({...content,...patch})); assert.equal(parseDraft({...content,destination:''}).destination,'');});

test('preproduction fixture policy requires dedicated loopback database and exact mode',async()=>{
 const {preproductionRuntime}=await import('./first-party-promotion.ts');
 assert.equal(preproductionRuntime('postgres://127.0.0.1/geosub_promotion_preprod_test','preproduction-v1'),true);
 for(const url of ['https://127.0.0.1/geosub_promotion_preprod_test','postgres://192.0.2.1/geosub_promotion_preprod_test','postgres://127.0.0.1/geosub_app','postgres://127.0.0.1/geosub_promotion_test'])assert.equal(preproductionRuntime(url,'preproduction-v1'),false);
 assert.equal(preproductionRuntime('postgres://127.0.0.1/geosub_promotion_preprod_test','production'),false);
});

test('foundation mode permits management only on named application DB; never fixture runtime',async()=>{
 const {promotionRuntime,preproductionRuntime}=await import('./first-party-promotion.ts');
 assert.equal(promotionRuntime('postgres://db/geosub_app','foundation-v1'),true);
 assert.equal(preproductionRuntime('postgres://db/geosub_app','foundation-v1'),false);
 assert.equal(promotionRuntime('https://db/geosub_app','foundation-v1'),false);
 assert.equal(promotionRuntime('postgres://db/other','foundation-v1'),false);
 assert.equal(APPROVED_DESTINATIONS.length,0);
});

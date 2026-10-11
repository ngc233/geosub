import assert from 'node:assert/strict';
import test from 'node:test';
import { assertLocalContentDatabase, isContentTarget, parseOverviewContent, pilotDraft, requireGeneration } from './managed-content.ts';
test('scope excludes every plan, Chinese Plus and other products', () => {
  assert.equal(isContentTarget('en', 'chatgpt'), true);
  for (const [locale, slug, plan] of [['zh','chatgpt'],['zh','chatgpt','plus'],['en','chatgpt','pro-5x'],['en','claude']]) assert.equal(isContentTarget(locale, slug, plan), false);
});
test('local pilot refuses production DB even when hosted on loopback', () => {
  assert.doesNotThrow(() => assertLocalContentDatabase('postgresql://localhost/geosub_release_20260917'));
  for (const url of ['postgresql://localhost/geosub_app','postgresql://example.com/geosub_release_20260917', undefined]) assert.throws(() => assertLocalContentDatabase(url));
});
test('stale and malformed generations fail closed', () => {
  requireGeneration(3,3);
  for(const n of [2,4,-1,NaN,1.2]) assert.throws(() => requireGeneration(3,n));
});
test('content validation rejects executable markup, scope overrides and unsafe sources', () => {
  assert.deepEqual(parseOverviewContent(pilotDraft), pilotDraft);
  for(const patch of [{title:'<script>alert(1)</script>'},{canonical:'https://evil.test'}, {sources:['javascript:alert(1)']},{sources:['https://openai.com.evil.test/']},{sources:['https://user:pass@openai.com/']},{description:'Prices from $20'}, {description:'Compare 49 countries'}, {sections: Array(5).fill(pilotDraft.sections[0])}]) assert.throws(() => parseOverviewContent({...pilotDraft,...patch}));
});
test('blank partial blocks and excessive input cannot be published', () => {
  for(const patch of [{title:''},{description:'x'.repeat(241)},{sources:[]},{faqs:[{q:'Question',a:''}]}]) assert.throws(() => parseOverviewContent({...pilotDraft,...patch}));
});


test('production runtime requires explicit activation and exact local production database', async () => {
  const {assertContentRuntime}=await import('./managed-content.ts');
  assert.throws(()=>assertContentRuntime({DATABASE_URL:'postgresql://localhost/geosub_app'}));
  assert.equal(assertContentRuntime({DATABASE_URL:'postgresql://localhost/geosub_app',GEOSUB_CONTENT_RUNTIME:'production-v1'}),'production');
  assert.throws(()=>assertContentRuntime({DATABASE_URL:'postgresql://external.example/geosub_app',GEOSUB_CONTENT_RUNTIME:'production-v1'}));
  assert.throws(()=>assertContentRuntime({DATABASE_URL:'postgresql://localhost/other',GEOSUB_CONTENT_RUNTIME:'production-v1'}));
});

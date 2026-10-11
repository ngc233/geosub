import assert from 'node:assert/strict';
import test from 'node:test';
import { CONTENT_CANONICAL, purgeContentUrl, readContentEndpoint, verifyContentHtml, type HttpClient } from './content-readback.ts';
const expected = { title: 'Plans & prices - GeoSub', description: 'Compare official plans.', heading: 'Compare plans', version: '4', modeGeneration: '2' };
const html = `<html><head><title>Plans &amp; prices - GeoSub</title><meta name="description" content="Compare official plans."><meta property="og:description" content="Compare official plans."><meta name="twitter:description" content="Compare official plans."><link rel="canonical" href="${CONTENT_CANONICAL}"></head><body><main><main data-content-version="4" data-content-mode-generation="2"><h1>Compare <span>plans</span></h1></main></main><script>"<h1>fake</h1>"</script></body></html>`;
test('readback validates decoded rendered HTML and independent output hashes', () => {
  const evidence = verifyContentHtml(html, expected);
  assert.equal(evidence.version, '4');
  assert.equal(evidence.outputHashes.description, evidence.outputHashes['og:description']);
  assert.match(evidence.htmlHash, /^[a-f0-9]{64}$/);
});
test('stale, duplicate, missing and wrong canonical fields fail closed', () => {
  for (const changed of [html.replace('version="4"', 'version="3"'), html.replace('generation="2"', 'generation="1"'), html.replace(CONTENT_CANONICAL, CONTENT_CANONICAL + '?a=b'), html.replace('</head>', '<meta name="description" content="Compare official plans."></head>'), html.replace('<h1>Compare <span>plans</span></h1>', ''), html.replace('property="og:description"', 'property="irrelevant"')]) assert.throws(() => verifyContentHtml(changed, expected), /mismatch/);
});
test('origin readback uses controlled Host and public uses exact canonical without cache busting', async () => {
  const seen: { url: string; init: RequestInit | undefined }[] = [];
  const http = (async (url, init) => { seen.push({ url: String(url), init }); return new Response(html, { headers: { 'content-type': 'text/html', 'cf-cache-status': 'HIT' } }); }) as HttpClient;
  await readContentEndpoint('origin', 3118, expected, http);
  const publicEvidence = await readContentEndpoint('public', 3118, expected, http);
  assert.equal(seen[0].url, 'http://127.0.0.1:3118/en/ai-pricing/chatgpt');
  assert.equal(new Headers(seen[0].init?.headers).get('host'), 'geosub.org');
  assert.equal(seen[1].url, CONTENT_CANONICAL);
  assert.equal(seen[1].init?.redirect, 'error');
  assert.equal(publicEvidence.cacheStatus, 'HIT');
});
test('HTTP errors, wrong content types, oversized bodies and network secrets are rejected safely', async () => {
  for (const response of [new Response('no', { status: 503 }), new Response(html), new Response('x'.repeat(3_000_001), { headers: { 'content-type': 'text/html' } })]) await assert.rejects(readContentEndpoint('public', 3118, expected, (async () => response) as HttpClient), /^Error: public content readback failed$/);
  await assert.rejects(readContentEndpoint('public', 3118, expected, (async () => { throw new Error('private-token'); }) as HttpClient), /^Error: public content readback failed$/);
});
test('CDN adapter refuses unaudited policy, purges one URL and requires API success', async () => {
  const config = { zoneId: 'a'.repeat(32), token: 'test-only', cachePolicy: 'audited-single-url' as const };
  let calls = 0;
  const http = (async (url, init) => {
    calls++;
    assert.equal(String(url), `https://api.cloudflare.com/client/v4/zones/${config.zoneId}/purge_cache`);
    assert.deepEqual(JSON.parse(String(init?.body)), { files: [CONTENT_CANONICAL] });
    assert.equal(init?.redirect, 'error');
    return Response.json({ success: true });
  }) as HttpClient;
  await assert.rejects(purgeContentUrl({ ...config, cachePolicy: 'unverified' }, http), /not ready/);
  assert.equal(calls, 0);
  await purgeContentUrl(config, http);
  assert.equal(calls, 1);
  for (const response of [Response.json({ success: false }), Response.json({ success: true }, { status: 429 }), new Response('not json')]) await assert.rejects(purgeContentUrl(config, (async () => response) as HttpClient), /^Error: Content CDN purge failed$/);
});

test('distribution only verifies after both readbacks and stops on every failed stage', async () => {
  const { verifyContentDistribution } = await import('./content-readback.ts');
  const evidence = verifyContentHtml(html, expected);
  for (const failed of ['none', 'invalidate', 'origin', 'purge', 'public']) {
    const calls: string[] = [];
    const step = (name: string) => { calls.push(name); if (name === failed) throw new Error('sensitive upstream error'); };
    const result = await verifyContentDistribution({
      assertCurrent: async () => { calls.push('current'); },
      invalidateOrigin: async () => step('invalidate'),
      origin: async () => { step('origin'); return evidence; },
      purge: async () => { step('purge'); return { acceptedAt: 'test', url: CONTENT_CANONICAL }; },
      public: async () => { step('public'); return evidence; },
    });
    assert.equal(result.status, failed === 'none' ? 'verified' : 'failed');
    assert.equal(result.stage, failed === 'none' ? 'complete' : failed);
    assert.equal(JSON.stringify(result).includes('sensitive'), false);
    const operations = calls.filter((name) => name !== 'current');
    assert.deepEqual(operations, ['invalidate', 'origin', 'purge', 'public'].slice(0, failed === 'none' ? 4 : ['invalidate', 'origin', 'purge', 'public'].indexOf(failed) + 1));
  }
});
test('fence changes stop subsequent external calls and disallow final verified result', async () => {
  const { verifyContentDistribution } = await import('./content-readback.ts');
  for (let failAt = 1; failAt <= 5; failAt++) {
    let checks = 0;
    let operations = 0;
    const evidence = verifyContentHtml(html, expected);
    const result = await verifyContentDistribution({
      assertCurrent: async () => { if (++checks === failAt) throw new Error('superseded'); },
      invalidateOrigin: async () => { operations++; },
      origin: async () => { operations++; return evidence; },
      purge: async () => { operations++; return { acceptedAt: 'test', url: CONTENT_CANONICAL }; },
      public: async () => { operations++; return evidence; },
    });
    assert.equal(result.status, 'superseded');
    assert.equal(operations, failAt - 1);
  }
});

test('managed prose and source links must match even when metadata is unchanged', () => {
  const content = {title:expected.title, heading:expected.heading, description:expected.description, sections:[{heading:'Choose a plan',body:'Compare features & limits.'}], faqs:[], sources:['https://help.openai.com/']};
  const body = '<section data-managed-editorial="true"><h2>Choose a plan</h2><p>Compare features &amp; limits.</p></section><a data-managed-source="true" href="https://help.openai.com/">Source 1</a>';
  const full = html.replace('</h1>', '</h1>' + body);
  assert.ok(verifyContentHtml(full, {...expected,content}).outputHashes.editorial);
  for (const changed of [full.replace('features &amp; limits.', 'wrong body'),full.replace('https://help.openai.com/', 'https://example.com/'),full.replace(body,'')]) assert.throws(()=>verifyContentHtml(changed,{...expected,content}),/mismatch/);
});

test('visible FAQ and FAQ JSON-LD must both match the revision', () => {
  const faq = {q:'Which plan?',a:'Compare features.'};
  const content = {title:expected.title,heading:expected.heading,description:expected.description,sections:[],sources:[],faqs:[faq]};
  const visible='<summary data-managed-faq-question="true">Which plan?</summary><p data-managed-faq-answer="true">Compare features.</p>';
  const structured=JSON.stringify({'@type':'FAQPage',mainEntity:[{'@type':'Question',name:faq.q,acceptedAnswer:{'@type':'Answer',text:faq.a}}]});
  const full=html.replace('</body>',visible+`<script type="application/ld+json">${structured}</script></body>`);
  assert.ok(verifyContentHtml(full,{...expected,content}).outputHashes.faq);
  for(const changed of [full.replace(visible,''),full.replace('"text":"Compare features."','"text":"Stale answer"'),full.replace(structured,'{}')]) assert.throws(()=>verifyContentHtml(changed,{...expected,content}),/mismatch/);
});
test('baseline rollback requires fallback identity and rejects residual managed text', () => {
  const baseline=html.replace('data-content-version="4"','data-content-kind="fallback" data-content-version="4"');
  const fallback={version:'4',modeGeneration:'2',content:null};
  assert.ok(verifyContentHtml(baseline,fallback).outputHashes.kind);
  assert.throws(()=>verifyContentHtml(html,fallback),/mismatch/);
  assert.throws(()=>verifyContentHtml(baseline.replace('</h1>','</h1><section data-managed-editorial="true"><p>Stale text</p></section>'),fallback),/mismatch/);
});

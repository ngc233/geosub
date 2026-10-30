import assert from 'node:assert/strict';
import test from 'node:test';
import { assertContentTargetRuntime, initialContentDraft, parseOverviewContent } from './managed-content.ts';
import { getRegisteredContentTarget } from './content-target-registry.ts';
import { purgeContentUrl, readContentEndpoint, verifyContentHtml, type HttpClient } from './content-readback.ts';

test('new target runtime refuses production, even with the legacy production activation', () => {
  for (const id of ['overview:en:claude', 'overview:zh:claude']) {
    assert.equal(assertContentTargetRuntime(id, { DATABASE_URL: 'postgresql://localhost/geosub_release_20261026' }), 'local');
    assert.throws(() => assertContentTargetRuntime(id, { DATABASE_URL: 'postgresql://localhost/geosub_app', GEOSUB_CONTENT_RUNTIME: 'production-v1' }), /本地演练/);
    assert.deepEqual(parseOverviewContent(initialContentDraft(id), id), initialContentDraft(id));
    for (const patch of [{ sources: ['https://openai.com/'] }, { price: 20 }, { canonical: '/evil' }, { description: '覆盖 20 个地区' }, { description: '价格为20美元' }, { description: '覆盖率 50%' }, { sections: [{ heading: 'Test', body: 'Body', html: 'ignored?' }] }]) {
      assert.throws(() => parseOverviewContent({ ...initialContentDraft(id), ...patch }, id));
    }
  }
  assert.throws(() => parseOverviewContent(initialContentDraft('overview:en:claude')), /官方/);
});

test('Claude readback and purge use exactly the chosen locale URL and reject cross-target HTML', async () => {
  for (const id of ['overview:en:claude', 'overview:zh:claude']) {
    const target = getRegisteredContentTarget(id);
    const canonical = 'https://geosub.org' + target.canonicalPath;
    const expected = { title: 'Overview - GeoSub', description: 'Check sources.', heading: 'Overview', version: '1', modeGeneration: '0' };
    const html = `<title>Overview - GeoSub</title><meta name="description" content="Check sources."><meta property="og:description" content="Check sources."><meta name="twitter:description" content="Check sources."><link rel="canonical" href="${canonical}"><main data-content-version="1" data-content-mode-generation="0"><h1>Overview</h1></main>`;
    assert.equal(verifyContentHtml(html, expected, id).version, '1');
    assert.throws(() => verifyContentHtml(html, expected, id === 'overview:en:claude' ? 'overview:zh:claude' : 'overview:en:claude'), /canonical/);
    const requests: string[] = [];
    const http = (async (url: string | URL | Request, init?: RequestInit) => {
      requests.push(String(url));
      if (init?.method === 'POST') {
        assert.deepEqual(JSON.parse(String(init.body)), { files: [canonical] });
        return Response.json({ success: true });
      }
      return new Response(html, { headers: { 'content-type': 'text/html' } });
    }) as HttpClient;
    await readContentEndpoint('origin', 3118, expected, http, id);
    await readContentEndpoint('public', 3118, expected, http, id);
    await purgeContentUrl({ zoneId: 'a'.repeat(32), token: 'fake-test-token', cachePolicy: 'audited-single-url' }, http, id);
    assert.deepEqual(requests.slice(0, 2), ['http://127.0.0.1:3118' + target.canonicalPath, canonical]);
  }
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { preflightSeoSearchPageObservationRows as preview, seoSearchImportPreflightPayload, parseSeoSearchPageObservationRows } from './seo-search-observation-import.ts';
const input = { engine: 'google' as const, periodStart: '2026-09-24', periodEnd: '2026-10-21' };
const csv = (rows: string[]) => 'Page,Clicks,Impressions,Position\n' + rows.join('\n');
test('preflight reports every excluded original row, keeps raw line numbers and never writes', () => {
  for (const count of [77, 45]) {
    const text = csv([...Array.from({ length: count - 1 }, (_, i) => `/en/guides/fixture-${i},1,10,5`), '/reports/en/viki-global-pricing.pdf,1,10,5']);
    const result = preview({ ...input, text });
    assert.equal(result.canImport, true); assert.equal(result.inputRows, count);
    assert.equal(result.observations.length, count - 1); assert.equal(result.excluded.length, 1);
    assert.equal(result.excluded[0].line, count + 1); assert.match(result.excluded[0].value, /reports/);
  }
});
test('query grain, duplicate headers, malformed CSV, dates, size and 501-page limits are explicit', () => {
  for (const text of ['Query,Clicks,Impressions\nchatgpt,1,10', 'Page,Clicks,Impressions,Clicks\n/en,1,10,1', '"Page,Clicks,Impressions\n/en,1,10']) {
    assert.equal(preview({ ...input, text }).canImport, false);
  }
  const text = csv(Array.from({ length: 501 }, (_, i) => `/en/guides/${i},1,10,5`));
  const result = preview({ ...input, text });
  assert.equal(result.canImport, false); assert.equal(result.observations.length, 501);
  assert.throws(() => parseSeoSearchPageObservationRows({ ...input, text }), /500/);
  assert.equal(preview({ ...input, periodStart: '2026-02-30', text }).canImport, false);
  assert.equal(preview({ ...input, periodEnd: '2026-09-01', text }).canImport, false);
  assert.equal(preview({ ...input, text: 'x'.repeat(250001) }).canImport, false);
});
test('rounded, unsafe, negative, inconsistent and malformed data are never corrected silently', () => {
  const text = csv(['/en,1,20,2', '/en/a,1K,20,2', '/en/b,1,9007199254740992,2', '/en/c,-1,20,2', '/en/d,21,20,2', '/en/e,1,20,1001', '/en/f,1,20', '/en/g,"1,20,2', 'https://evil.invalid/en,1,20,2']);
  const result = preview({ ...input, text });
  assert.equal(result.observations.length, 1); assert.equal(result.excluded.length, 8);
  assert.equal(result.acceptedRows + result.excluded.length, result.inputRows);
});
test('canonical duplicate merges count all rows and weight only known positions', () => {
  const result = preview({ ...input, text: csv(['/en/ai-pricing/chatgpt?plan=plus,1,10,', '/en/ai-pricing/chatgpt/plus,2,20,5', '/en/ai-pricing/chatgpt/plus/,3,30,9']) });
  assert.equal(result.canImport, true); assert.equal(result.mergedRows, 2);
  assert.deepEqual(result.observations[0], { ...input, path: '/en/ai-pricing/chatgpt/plus', clicks: 6, impressions: 60, averagePosition: 7.4 });
  assert.equal(preview({ ...input, text: 'Page;Clicks;Impressions\n/en;0;0' }).canImport, true);
  assert.equal(preview({ ...input, engine: 'bing', text: '页面\t点击次数\t印象数\n/en\t1\t10' }).canImport, true);
});

test('multipart CRLF, CR and LF encode the same preflight payload without changing values', () => {
  const text = csv(['/en,1,20,5']);
  assert.equal(seoSearchImportPreflightPayload({ ...input, text }), seoSearchImportPreflightPayload({ ...input, text: text.replaceAll('\n', '\r\n') }));
  assert.deepEqual(preview({ ...input, text: text.replaceAll('\n', '\r') }), preview({ ...input, text }));
});

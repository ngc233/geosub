import assert from 'node:assert/strict';
import test from 'node:test';
import { appendSeoSearchPageImportBatch as append, type SeoSearchPageImportBatch as Batch, type SeoSearchPageImportState as State } from './seo-search-observation-import.ts';
import { planSeoSearchImportRecovery as restore, strictSeoSearchImportState as strict } from './seo-search-import-recovery.ts';
const batch = (id: string, engine: 'google' | 'bing' = 'google', start = '2026-09-24'): Batch => ({ id, engine, periodStart: start, periodEnd: '2026-10-21', importedAt: '2026-10-22T00:00:00Z', actorLabel: 'fixture', observations: [{ engine, periodStart: start, periodEnd: '2026-10-21', path: '/en', clicks: 1, impressions: 10 }] });
const empty: State = { version: 1, batches: [] };
test('A→B→C restores prior same-window versions in order and never rewinds other windows/engines', () => {
  const a = batch('a'), b = batch('b'), c = batch('c');
  const sa = append(empty, a), sb = append(sa, b), sc = append(sb, c);
  const bing = batch('bing', 'bing'), old = batch('old', 'google', '2026-09-01');
  // The last Google import is an older window. Undo it first, retaining C and Bing.
  const withBing = append(sc, bing), withOld = append(withBing, old);
  assert.deepEqual(restore(withOld, 'google', { id: 'old-audit', oldValue: withBing, newValue: withOld }).nextState, withBing);
  const oldAudit = { id: 'c-audit', oldValue: sb, newValue: sc };
  const frozen = JSON.stringify(oldAudit);
  const result = restore(withBing, 'google', oldAudit);
  assert.equal(result.restored?.id, 'b'); assert.deepEqual(result.nextState.batches, [b, bing]);
  assert.equal(JSON.stringify(oldAudit), frozen);
  const second = restore(result.nextState, 'google', { id: 'b-audit', oldValue: sa, newValue: sb });
  assert.deepEqual(second.nextState.batches, [a, bing]);
  const first = restore(second.nextState, 'google', { id: 'a-audit', oldValue: empty, newValue: sa });
  assert.equal(first.restored, null); assert.deepEqual(first.nextState.batches, [bing]);
});
test('missing, malformed, cross-engine and mismatched audit snapshots fail closed', () => {
  const sa = append(empty, batch('a'));
  assert.throws(() => restore(sa, 'google', null));
  for (const audit of [
    { id: 'x', oldValue: null, newValue: sa },
    { id: 'x', oldValue: empty, newValue: append(empty, batch('a', 'bing')) },
    { id: 'x', oldValue: empty, newValue: append(sa, batch('unrelated', 'bing')) },
    { id: 'x', oldValue: sa, newValue: sa },
  ]) assert.throws(() => restore(sa, 'google', audit));
  const corrupt = structuredClone(sa); corrupt.batches[0].observations[0].periodStart = '2026-01-01';
  assert.throws(() => strict(corrupt));
  assert.throws(() => strict({ version: 1, batches: [batch('a'), batch('b')] }));
});

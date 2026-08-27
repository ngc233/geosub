import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const backendDir = path.resolve(import.meta.dirname, '..');

test('production health report measures the current rate for each quote currency', async () => {
  const report = await readFile(
    path.join(backendDir, 'deploy/linux-arm64/production-health-report.sh'),
    'utf8',
  );

  assert.match(report, /WITH latest_by_quote AS \(/);
  assert.match(report, /SELECT DISTINCT ON \(quote_currency\)/);
  assert.match(report, /ORDER BY quote_currency, fetched_at DESC, rate_date DESC/);
  assert.match(report, /FROM latest_by_quote;/);
  assert.match(report, /\|\| "\$fx_stale" != "0"/);
  assert.match(
    report,
    /Current USD exchange rates older than \$MAX_FX_AGE_HOURS hours: \$fx_stale/,
  );
});

import { appendFileSync, readFileSync } from "node:fs";
import { claudePricingUrl, claudeProHelpUrl } from "../scripts/lib/claude-pro-official-web.mjs";

export function assertSchedulerTestDatabase(value) {
  let url;
  try { url = new URL(value); } catch { throw Error("isolated_scheduler_database_required"); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)
    || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    || url.port !== '55433'
    || !/^\/geosub_collector_test_claude_scheduler_[a-z0-9_]+$/.test(url.pathname)) {
    throw Error("isolated_scheduler_database_required");
  }
  return url;
}

// Installed only by the isolated scheduler harness in its child processes.
// No production code imports this module and no request falls back to the network.
if (process.env.GEOSUB_CLAUDE_SCHEDULER_FIXTURE === '1') {
  assertSchedulerTestDatabase(process.env.DATABASE_URL);
  const mode = process.env.GEOSUB_CLAUDE_SCHEDULER_MODE;
  if (!['valid', 'http503', 'mismatch', 'delayed'].includes(mode)) throw Error('invalid_scheduler_fixture_mode');
  const log = process.env.GEOSUB_CLAUDE_SCHEDULER_LOG;
  if (!log) throw Error('scheduler_fixture_log_required');
  const pricing = readFileSync(new URL('../scripts/fixtures/claude-pro-pricing.html', import.meta.url), 'utf8');
  const help = readFileSync(new URL('../scripts/fixtures/claude-pro-help.html', import.meta.url), 'utf8');
  globalThis.fetch = async url => {
    const kind = url === claudePricingUrl ? 'pricing' : url === claudeProHelpUrl ? 'support' : null;
    if (!kind) throw Error('scheduler_fixture_network_request_rejected');
    appendFileSync(log, JSON.stringify({ kind, mode }) + '\n');
    if (mode === 'delayed') await new Promise(resolve => setTimeout(resolve, 200));
    if (mode === 'http503') return new Response('Fixture service unavailable', { status: 503 });
    const body = kind === 'pricing' ? pricing : mode === 'mismatch' ? help.replace('$20', '$25') : help;
    return new Response(body, { headers: { 'content-type': 'text/html' } });
  };
}

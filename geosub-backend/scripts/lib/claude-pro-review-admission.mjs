import { assertClaudeProSource, claudeProRule } from './claude-pro-official-web.mjs';

export const claudeReviewPolicy = 'claude-us-pro-local-review-v1';

export function assertClaudeReviewDatabase(parameters) {
  if (!['localhost','127.0.0.1','::1'].includes(parameters?.host)
    || String(parameters?.port) !== '55433'
    || !/^geosub_collector_test_claude_scheduler_[a-z0-9_]+$/.test(parameters?.database ?? '')) {
    throw Error('claude_review_admission_requires_disposable_database');
  }
}

export function claudeReviewConnectionFromUrl(value) {
  let url;
  try { url=new URL(value); } catch { throw Error('claude_review_admission_requires_explicit_database'); }
  if (!['postgres:','postgresql:'].includes(url.protocol)) {
    throw Error('claude_review_admission_requires_disposable_database');
  }
  const parameters={host:url.hostname==='[::1]'?'::1':url.hostname,port:url.port,database:url.pathname.slice(1)};
  assertClaudeReviewDatabase(parameters);
  return parameters;
}

export function resolveClaudeReviewAdmission({source,policy,connectionParameters}) {
  if (policy !== claudeReviewPolicy) throw Error('unknown_claude_review_admission_policy');
  assertClaudeReviewDatabase(connectionParameters);
  assertClaudeProSource(source);
  if (source.auto_review) throw Error('claude_review_admission_requires_pending_source');
  return {...source,review_admission_policy:claudeReviewPolicy,
    auto_review:{rule_id:claudeProRule,publish_product:false}};
}

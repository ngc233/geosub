import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { assessCollectorExecution, type CollectorExecutionInput } from "./execution-status.ts";

const successful: CollectorExecutionInput = { status: 'succeeded', collector_kind: 'pricing_page' };

test('website monitoring success cannot imply price collection or publication', () => {
  const status = assessCollectorExecution({ ...successful, collection_outcome: 'source_monitoring_only', published_count: 99 });
  assert.equal(status.label, '巡检完成');
  assert.match(status.reason, /没有采集或更新价格/);
  assert.equal(assessCollectorExecution({ ...successful, collector_kind: 'official_site' }).label, '巡检完成');
});

test('pending-only observations and an executed automatic review have distinct next steps', () => {
  const pending = assessCollectorExecution({ ...successful, collected_count: 1, has_automatic_review: false });
  assert.equal(pending.label, '已采集，待核验');
  assert.match(pending.reason, /未确认自动审核/);
  assert.equal(assessCollectorExecution({ ...successful, collected_count: 1, has_automatic_review: true }).label, '等待稳定证据');
  assert.equal(assessCollectorExecution({ ...successful, published_count: 1 }).label, '正式价格已更新');
});

test('deduplicated observations and unreported outcomes do not imply new samples or successful repair', () => {
  assert.equal(assessCollectorExecution({ ...successful, collected_count: 0, skipped_count: 1 }).label, '本轮无新增');
  assert.equal(assessCollectorExecution(successful).label, '执行完成');
  const unresolved = assessCollectorExecution({ ...successful, published_count: 1, repair_state: 'unresolved' });
  assert.equal(unresolved.label, '仍有未解决问题');
  assert.equal(assessCollectorExecution({ ...successful, isolated_count: 1 }).label, '异常已隔离');
});

test('configured active retries show the next automatic action without requiring manual restart', () => {
  for (const operational_state of ['retry_scheduled', 'official_web_isolated_retry', 'recovery_retry_scheduled']) {
    const status = assessCollectorExecution({ status: 'failed', job_status: 'active', operational_state,
      next_run_at: '2026-10-30T00:00:00Z', error_message: 'HTTP503' });
    assert.equal(status.label, '等待自动重试');
    assert.match(status.next, /无需重复点击/);
  }
  const due = assessCollectorExecution({ status: 'failed', job_status: 'active', is_due: true,
    next_run_at: '2026-10-28T00:00:00Z' });
  assert.match(due.next, /已到期/);
});

test('permanent or exhausted failures and missing retry dates never promise automatic retries', () => {
  for (const operational_state of ['permanent_failure', 'retry_exhausted']) {
    assert.equal(assessCollectorExecution({ status: 'failed', job_status: 'active', operational_state,
      next_run_at: '2026-10-30T00:00:00Z' }).label, '需要排查');
  }
  assert.equal(assessCollectorExecution({ status: 'failed', job_status: 'active' }).label, '需要排查');
  const history = assessCollectorExecution({ status: 'failed' });
  assert.equal(history.label, '本轮失败');
  assert.match(history.next, /当前重试安排见产品任务/);
});

test('a paused rule-only repair still explains why recollection cannot resolve it', () => {
  assert.equal(assessCollectorExecution({ status: 'skipped', job_status: 'paused', repair_state: 'unresolved' }).label, '需要处理规则');
  assert.equal(assessCollectorExecution({ status: 'succeeded', job_status: 'paused' }).label, '已暂停');
  assert.equal(assessCollectorExecution({ status: 'running', job_status: 'paused' }).label, '正在执行');
  assert.equal(assessCollectorExecution({ status: null, is_due: true }).label, '等待执行');
  assert.equal(assessCollectorExecution({ status: null, is_due: false }).label, '按计划采集');
});

test('known failure codes become readable reasons without echoing raw secrets', () => {
  for (const [code, expected] of [
    ['missing_canonical_plans', /配置/], ['official_sources_disagree', /证据/],
    ['parser_incomplete', /解析/], ['claude_document_unavailable_or_redirected', /来源访问/],
  ] as const) {
    const assessment = assessCollectorExecution({ status: 'failed', failure_reason: code, error_message: 'secret-token' });
    assert.match(assessment.reason, expected);
    assert.ok(!JSON.stringify(assessment).includes('secret-token'));
  }
});

test('queries read explicit official-Web run counts before inferred legacy windows', () => {
  const query = readFileSync(new URL('./queries.ts', import.meta.url), 'utf8');
  assert.match(query, /inserted_observation_count'\)::int,[\s\S]*?review_outcome,observed_count/);
  assert.match(query, /published_price_count'\)::int,[\s\S]*?review_outcome,published_price_count/);
  assert.match(query, /jsonb_path_exists[\s\S]*?auto_review/);
  assert.match(query, /operational_state' AS operational_state/);
});

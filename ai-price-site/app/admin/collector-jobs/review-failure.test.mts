import assert from 'node:assert/strict';
import test from 'node:test';
import { assessCollectorExecution } from './execution-status.ts';
import { buildCollectorRunTimeline } from './job-state.ts';

test('review failure preserves successful collection and marks only review failed', () => {
  for (const evidence of [
    { collector_status: 'succeeded', auto_review_status: 'failed', error_message: null },
    { error_message: 'Automatic review failed after collection: existing historical failure' },
  ]) {
    const run = { status: 'failed', runner_state: null, process_id: null,
      output_excerpt: null, duration_ms: null, run_age_seconds: null, ...evidence };
    assert.equal(assessCollectorExecution(run).label, '采集成功，审核失败');
    const steps = buildCollectorRunTimeline(run);
    assert.equal(steps.find(step => step.key === 'collect')?.state, 'done');
    assert.equal(steps.find(step => step.key === 'review')?.state, 'failed');
  }
});

test('network collection failure is not mistaken for an automatic review failure', () => {
  const run = { status: 'failed', error_message: 'HTTP 503', runner_state: null,
    process_id: null, output_excerpt: null, duration_ms: null, run_age_seconds: null };
  assert.equal(assessCollectorExecution(run).label, '本轮失败');
  assert.equal(buildCollectorRunTimeline(run).find(step => step.key === 'collect')?.state, 'failed');
});

test('review retry explains evidence reuse without claiming publication', () => {
  const assessment = assessCollectorExecution({ status: 'failed', collector_status: 'succeeded',
    auto_review_status: 'failed', operational_state: 'review_retry_scheduled' });
  assert.match(assessment.next, /复用已有证据/);
  assert.match(assessment.reason, /不能据此确认正式价格已更新/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { getProductCollectionPresentation, getProductHealth, getProductOperationalAssessment, type ProductQualityRow } from './model.ts';

const base={slug:'spotify',status:'published',plan_count:2,source_integration_status:'official_page_only',
  app_store_job_count:0,active_app_store_job_count:0,official_web_job_count:1,active_official_web_job_count:1,
  paused_official_web_job_count:0,pending_web_observation_count:0,pending_web_country_count:0,
  published_web_price_count:2,published_web_country_count:1,stale_web_price_count:0,
  latest_web_observed_at:'2026-10-22T12:00:00Z',published_price_count:0,published_country_count:0} as ProductQualityRow;

test('published Web prices produce an actual published state without fabricating iOS coverage',()=>{
  const presentation=getProductCollectionPresentation(base);
  assert.equal(presentation.coverageTitle,'1 个 Web 地区');
  assert.match(presentation.coverageDetail,/2 条正式 Web 价格/);
  assert.equal(presentation.supportsManualCollection,false);
  assert.equal(getProductHealth(base).level,'good');
  assert.equal(getProductOperationalAssessment(base)?.status,'published');
});
test('new Web observations retain automatic schedule and existing valid publication',()=>{
  const row={...base,pending_web_observation_count:2,pending_web_country_count:1};
  assert.equal(getProductHealth(row).label,'Web 自动验证中');
  assert.equal(getProductCollectionPresentation(row).nextCollection,'按官网任务调度');
  assert.equal(getProductOperationalAssessment(row)?.status,'published');
});
test('first observations and stale Web prices cannot be reported as fully published',()=>{
  assert.equal(getProductOperationalAssessment({...base,published_web_price_count:0})?.status,'pending');
  assert.equal(getProductHealth({...base,stale_web_price_count:2}).level,'warning');
  assert.equal(getProductOperationalAssessment({...base,stale_web_price_count:2})?.status,'pending');
});

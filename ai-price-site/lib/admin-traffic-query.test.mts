import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { ADMIN_TRAFFIC_SQL } from './admin-traffic-query.ts';
import { validateTrafficSnapshot, trafficPvCoverage } from './admin-traffic-model.ts';
const require = createRequire(import.meta.url);
const { Client } = require('pg');
const url = process.env.GEOSUB_TRAFFIC_TEST_DATABASE_URL || (process.env.CI ? process.env.DATABASE_URL : undefined);

test('traffic SQL executes against isolated PostgreSQL fixtures', { skip: !url }, async t => {
 const target = new URL(url!);
 assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) && /(?:_test|_ci)$/.test(target.pathname), 'Traffic SQL tests require an explicitly configured local test/CI database');
 const db = new Client({ connectionString: url });
 await db.connect();
 try {
  await db.query('BEGIN');
  await db.query(`CREATE TEMP TABLE event_logs(created_at timestamptz, anonymous_id text, session_id text, event_key text, page_path text, source text) ON COMMIT DROP;
   CREATE TEMP TABLE daily_stats(stat_date date, metric_key text, metric_value int, dimension_type text, dimension_key text) ON COMMIT DROP;
   INSERT INTO daily_stats SELECT d::date, 'cookieless_page_views'||suffix, value, 'global', 'global'
   FROM generate_series('2026-05-08'::date,'2026-11-04'::date,interval '1 day')d
   CROSS JOIN (VALUES('',100),('_eligible_v2',90),('_automation_v2',5),('_internal_v2',3),('_unclassified_v2',2))v(suffix,value);
   UPDATE daily_stats SET metric_value=CASE metric_key WHEN 'cookieless_page_views' THEN 556 WHEN 'cookieless_page_views_eligible_v2' THEN 540 WHEN 'cookieless_page_views_automation_v2' THEN 14 WHEN 'cookieless_page_views_internal_v2' THEN 0 ELSE 2 END WHERE stat_date='2026-11-04';
   INSERT INTO event_logs VALUES
   ('2026-05-08T01:00Z','earliest','earliest','page_view','/zh','frontend_auto'),
   ('2026-11-03T01:00Z','yesterday','yesterday','page_view','/en','frontend_auto'),
   ('2026-11-04T01:00Z','a','shared','page_view','/zh','frontend_auto'),
   ('2026-11-04T01:01Z','b','shared','page_view','/zh','frontend_auto'),
   ('2026-11-04T01:02Z','a','shared','page_view','/zh','frontend_auto'),
   ('2026-11-04T01:03Z','c','session-2','page_view','/en','frontend_auto'),
   ('2026-11-04T01:04Z','missing-session',NULL,'page_view','/en','frontend_auto'),
   ('2026-11-04T01:05Z',NULL,'missing-visitor','page_view','/en','frontend_auto'),
   ('2026-11-04T01:06Z','test','test','page_view','/zh/tracking-test','frontend_auto'),
   ('2026-11-04T01:07Z','test','test','page_view','/zh','manual_test'),
   ('2026-11-04T01:08Z','test','test','page_view','/admin','frontend_auto');`);
  const read = async () => validateTrafficSnapshot((await db.query(ADMIN_TRAFFIC_SQL, ['2026-11-04T13:28:52.197Z'])).rows[0].data);
  await t.test('unclassified 2 keeps today eligible 540; exclusions and four ranges are exact', async () => {
   const data = await read();
   for (const range of [1,7,30,90]) {
    const row = data.totals.find(r => r.range===range && r.side===0)!;
    assert.equal(row.pv, range===1 ? 540 : 90*range);
    assert.equal(trafficPvCoverage(row,data.days).complete,true);
    assert.ok(row.sample_views! >= row.sessions! && row.sessions! >= row.uv!);
   }
   const today=data.totals.find(r=>r.range===1)!;
   assert.equal(today.automation_views,14); assert.equal(today.internal_views,0); assert.equal(today.unclassified_views,2);
   assert.equal(today.uv,3); assert.equal(today.sessions,3); assert.equal(today.sample_views,4);
   assert.equal(today.consented_views,6); assert.equal(today.missing_session,1); assert.equal(today.missing_identity,2);
   const day=data.days.find(r=>r.date==='2026-11-04')!;
   assert.equal(day.sessions,3); assert.equal(day.pv_reason,null);
  });
  await t.test('a missing day keeps available total and disables full coverage', async () => {
   await db.query("SAVEPOINT scenario; DELETE FROM daily_stats WHERE stat_date='2026-11-03'");
   const data=await read(), row=data.totals.find(r=>r.range===7&&r.side===0)!;
   assert.equal(row.pv,540); assert.equal(row.automation_views,30);
   assert.equal(trafficPvCoverage(row,data.days).text,'覆盖 6/7 天');
   assert.match(trafficPvCoverage(row,data.days).reason,/缺少原始浏览计数 1 天/);
   await db.query('ROLLBACK TO SAVEPOINT scenario');
  });
  await t.test('raw-only and inconsistent classifications have distinct reasons; all missing stays null', async () => {
   await db.query("SAVEPOINT scenario; DELETE FROM daily_stats WHERE stat_date>='2026-10-28' AND stat_date<'2026-11-04' AND metric_key<>'cookieless_page_views'; UPDATE daily_stats SET metric_value=557 WHERE stat_date='2026-11-04' AND metric_key='cookieless_page_views'");
   const data=await read();
   assert.equal(data.totals.find(r=>r.range===7&&r.side===0)!.pv,null);
   assert.equal(data.days.find(r=>r.date==='2026-11-03')!.pv_reason,'missing_classification');
   assert.equal(data.days.find(r=>r.date==='2026-11-04')!.pv_reason,'classification_mismatch');
   assert.equal(data.totals.find(r=>r.range===1)!.automation_views,null);
   await db.query('ROLLBACK TO SAVEPOINT scenario');
  });
  await t.test('measured zero and absent eligible with fully excluded traffic remain zero', async () => {
   await db.query("SAVEPOINT scenario; UPDATE daily_stats SET metric_value=0 WHERE stat_date='2026-11-04'");
   assert.equal((await read()).totals.find(r=>r.range===1)!.pv,0);
   await db.query("DELETE FROM daily_stats WHERE stat_date='2026-11-04' AND metric_key='cookieless_page_views_eligible_v2'; UPDATE daily_stats SET metric_value=2 WHERE stat_date='2026-11-04' AND metric_key IN ('cookieless_page_views','cookieless_page_views_unclassified_v2')");
   const today=(await read()).totals.find(r=>r.range===1)!;
   assert.equal(today.pv,0); assert.equal(today.unclassified_views,2);
   await db.query('ROLLBACK TO SAVEPOINT scenario');
  });
  await t.test('no complete sample identity is unavailable, never an invented session', async () => {
   await db.query("SAVEPOINT scenario; UPDATE event_logs SET session_id=NULL WHERE created_at>='2026-11-04'");
   const today=(await read()).totals.find(r=>r.range===1)!;
   assert.equal(today.sessions,null); assert.equal(today.uv,null); assert.equal(today.sample_views,0);
   await db.query('ROLLBACK TO SAVEPOINT scenario');
  });
 } finally { await db.query('ROLLBACK'); await db.end(); }
});

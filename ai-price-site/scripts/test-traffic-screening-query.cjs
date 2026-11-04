// Local PostgreSQL only. Temporary fixtures are rolled back; no persistent writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { Client } = require('pg');
const url = new URL(process.env.DATABASE_URL || 'postgres://localhost/');
if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw Error('Only an isolated local PostgreSQL database is allowed');
const sql = fs.readFileSync('lib/admin-traffic-query.ts', 'utf8').split('`')[1];
const db = new Client({connectionString:url.toString()});
(async()=>{
 await db.connect();
 try {
  await db.query('BEGIN');
  await db.query(`CREATE TEMP TABLE event_logs(created_at timestamptz,anonymous_id text,session_id text,event_key text,page_path text,source text);
   CREATE TEMP TABLE daily_stats(stat_date date,metric_key text,metric_value int,dimension_type text,dimension_key text);
   INSERT INTO daily_stats SELECT d,metric,n,'global','global' FROM generate_series('2026-10-27'::date,'2026-11-03'::date,'1 day')d
   CROSS JOIN(VALUES('cookieless_page_views',100),('cookieless_page_views_eligible_v2',90),('cookieless_page_views_automation_v2',10),
   ('cookieless_page_views_eligible_v3',20),('cookieless_page_views_suspected_v3',70),('cookieless_page_views_automation_v3',5),('cookieless_page_views_internal_v3',3),('cookieless_page_views_unclassified_v3',2))m(metric,n);
   INSERT INTO event_logs VALUES('2026-10-27T01:00Z','a','s1','page_view','/zh','auto'),('2026-10-28T01:00Z','a','s1','page_view','/en','auto'),('2026-10-29T01:00Z','b','s2','page_view','/zh','auto'),('2026-10-29T02:00Z','test','test','page_view','/zh/tracking-test','auto'),('2026-10-29T02:00Z','test','test','page_view','/zh','manual_test');`);
  const read=async()=> (await db.query(sql,['2026-11-03T12:00:00Z'])).rows[0].data;
  const total=(d,n=7)=>d.totals.find(t=>t.range===n&&t.side===0);
  let d=await read(),t=total(d);
  assert.equal(d.version,2);assert.equal(t.pv,140);assert.equal(t.suspected,490);assert.equal(t.excluded_views,70);assert.equal(t.screened_views,700);assert.equal(t.raw_views,700);
  assert.equal(t.uv,2);assert.equal(t.sessions,2);assert.equal(t.consented_views,3);
  // Neither legacy counts nor the additional page dimensions multiply global PV.
  await db.query("INSERT INTO daily_stats VALUES('2026-10-27','cookieless_page_views_eligible_v3',9000,'page','/zh')");
  assert.equal(total(await read()).pv,140);
  // Transition day: show screened part with an explicit raw-count coverage gap.
  await db.query("UPDATE daily_stats SET metric_value=150 WHERE stat_date='2026-11-03' AND metric_key='cookieless_page_views'");
  t=total(await read(),1);assert.equal(t.pv,20);assert.equal(t.suspected,70);assert.equal(t.screened_views,100);assert.equal(t.raw_views,150);
  // Historical v2-only day is missing, never a zero or a cleaned 90.
  await db.query("DELETE FROM daily_stats WHERE stat_date='2026-10-29' AND metric_key LIKE '%_v3'");
  d=await read();assert.equal(total(d).pv,null);assert.equal(total(d).suspected,null);assert.equal(total(d).raw_views,700);
  assert.equal(d.days.find(r=>r.date==='2026-10-29').pv,null);
  // A truly measured zero is retained when all observed traffic is excluded.
  await db.query("UPDATE daily_stats SET metric_value=0 WHERE stat_date='2026-10-28' AND metric_key='cookieless_page_views_eligible_v3';UPDATE daily_stats SET metric_value=90 WHERE stat_date='2026-10-28' AND metric_key='cookieless_page_views_suspected_v3'");
  assert.equal((await read()).days.find(r=>r.date==='2026-10-28').pv,0);
  // Corrupt sums cannot produce a trusted clean count.
  await db.query("UPDATE daily_stats SET metric_value=99 WHERE stat_date='2026-10-30' AND metric_key='cookieless_page_views'");
  assert.equal((await read()).days.find(r=>r.date==='2026-10-30').pv,null);
  await db.query("INSERT INTO event_logs VALUES('2026-11-02T02:00Z','c',NULL,'page_view','/zh','auto')");
  d=await read();assert.equal(total(d).sessions,2);assert.equal(total(d).missing_session,1);assert.equal(d.days.find(r=>r.date==='2026-11-02').sessions,null);
  console.log('PASS: v3 exclusion, exact totals, period dedup, legacy isolation, partial coverage, zero/missing, corrupt sums, session gaps. Temporary fixtures rolled back.');
 }finally{await db.query('ROLLBACK');await db.end();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});

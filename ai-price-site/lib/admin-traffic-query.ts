/** Aggregate-only read model. $1 is the capture time; no identity leaves PostgreSQL. */
export const ADMIN_TRAFFIC_SQL = `
WITH clock AS (SELECT $1::timestamptz AS captured, date_trunc('day',$1::timestamptz AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' AS today),
events AS MATERIALIZED (
 SELECT created_at, anonymous_id, session_id FROM event_logs,clock
 WHERE created_at >= today - INTERVAL '180 days' AND created_at < captured
 AND event_key='page_view' AND page_path ~ '^/(zh-tw|zh|en|ja|ko|es|tr|ar|fr|it|de|pt)(/|$)'
 AND page_path !~ '^/(zh-tw|zh|en|ja|ko|es|tr|ar|fr|it|de|pt)/(tracking-test|cms-test)(/|$)'
 AND COALESCE(source,'') NOT IN ('manual_test','affiliate_test')
),
counters AS (
 SELECT stat_date, SUM(metric_value) FILTER(WHERE metric_key='cookieless_page_views') AS raw,
 SUM(metric_value) FILTER(WHERE metric_key='cookieless_page_views_eligible_v2') AS eligible,
 SUM(metric_value) FILTER(WHERE metric_key IN ('cookieless_page_views_eligible_v2','cookieless_page_views_internal_v2','cookieless_page_views_automation_v2','cookieless_page_views_unclassified_v2')) AS classified,
 SUM(metric_value) FILTER(WHERE metric_key='cookieless_page_views_unclassified_v2') AS unknown
 FROM daily_stats,clock WHERE stat_date >= (today AT TIME ZONE 'UTC')::date-180 AND stat_date <= (today AT TIME ZONE 'UTC')::date
 AND dimension_type='global' AND dimension_key='global' AND metric_key LIKE 'cookieless_page_views%' GROUP BY stat_date
),
days AS (
 SELECT to_char(d AT TIME ZONE 'UTC','YYYY-MM-DD') AS date,
 CASE WHEN c.classified IS NOT NULL AND c.classified=c.raw AND COALESCE(c.unknown,0)=0 THEN COALESCE(c.eligible,0) ELSE NULL END AS pv,
 CASE WHEN (SELECT min(created_at) FROM events)<d+INTERVAL '1 day' THEN COUNT(DISTINCT NULLIF(e.anonymous_id,'')) ELSE NULL END AS uv,
 CASE WHEN (SELECT min(created_at) FROM events)<d+INTERVAL '1 day' AND NOT(COUNT(e.created_at)>0 AND COUNT(NULLIF(e.session_id,''))=0) THEN COUNT(DISTINCT NULLIF(e.session_id,'')) ELSE NULL END AS sessions,
 COUNT(e.created_at) AS consented_views, COUNT(e.created_at) FILTER(WHERE NULLIF(e.session_id,'') IS NULL) AS missing_session,
 c.raw AS raw_views
 FROM clock CROSS JOIN LATERAL generate_series(today-INTERVAL '180 days',today,INTERVAL '1 day') d
 LEFT JOIN counters c ON c.stat_date=(d AT TIME ZONE 'UTC')::date
 LEFT JOIN events e ON e.created_at>=d AND e.created_at<d+INTERVAL '1 day'
 GROUP BY d,c.classified,c.raw,c.unknown,c.eligible
),
windows AS (
 SELECT n AS range, side, today - (n * (side+1)) * INTERVAL '1 day' AS start_at,today-(n*side)*INTERVAL '1 day' AS end_at FROM clock CROSS JOIN (VALUES(7),(30),(90)) r(n) CROSS JOIN (VALUES(0),(1)) s(side)
 UNION ALL SELECT 1,0,today,captured FROM clock
),
totals AS (
 SELECT w.range,w.side,to_char(w.start_at AT TIME ZONE 'UTC','YYYY-MM-DD') AS start,
 to_char((CASE WHEN w.range=1 THEN w.end_at ELSE w.end_at-INTERVAL '1 second' END) AT TIME ZONE 'UTC','YYYY-MM-DD') AS end,
 (SELECT CASE WHEN COUNT(pv)=w.range THEN SUM(pv) ELSE NULL END FROM days WHERE date>=to_char(w.start_at AT TIME ZONE 'UTC','YYYY-MM-DD') AND date<=to_char((CASE WHEN w.range=1 THEN w.end_at ELSE w.end_at-INTERVAL '1 second' END) AT TIME ZONE 'UTC','YYYY-MM-DD')) AS pv,
 CASE WHEN (SELECT min(created_at) FROM events)<w.start_at+INTERVAL '1 day' THEN COUNT(DISTINCT NULLIF(e.anonymous_id,'')) ELSE NULL END AS uv,
 CASE WHEN (SELECT min(created_at) FROM events)<w.start_at+INTERVAL '1 day' AND NOT(COUNT(e.created_at)>0 AND COUNT(NULLIF(e.session_id,''))=0) THEN COUNT(DISTINCT NULLIF(e.session_id,'')) ELSE NULL END AS sessions,
 COUNT(e.created_at) AS consented_views,COUNT(e.created_at) FILTER(WHERE NULLIF(e.session_id,'') IS NULL) AS missing_session
 FROM windows w LEFT JOIN events e ON e.created_at>=w.start_at AND e.created_at<w.end_at GROUP BY w.range,w.side,w.start_at,w.end_at
)
SELECT json_build_object('version',1,'capturedAt',(SELECT captured FROM clock),'timezone','UTC','days',(SELECT json_agg(days ORDER BY date) FROM days),'totals',(SELECT json_agg(totals ORDER BY range,side) FROM totals)) AS data
`;

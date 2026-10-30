import 'server-only';
import { prisma } from './prisma';
import type { WorkspaceRow } from './admin-workspace-model';
export async function readWorkspaceProducts(){
 const rows=await prisma.$queryRaw<WorkspaceRow[]>`
 SELECT p.id::text,p.slug,p.name,p.status::text AS publish_status,
 scope.billing_platform,
 COALESCE(pr.price_count,0)::int AS price_count,COALESCE(pr.stale_count,0)::int AS stale_count,pr.latest_checked::text,
 COALESCE(j.job_count,0)::int AS job_count,COALESCE(j.running_count,0)::int AS running_count,
 COALESCE(j.failed_count,0)::int AS failed_count,COALESCE(j.queued_count,0)::int AS queued_count
 FROM products p
 LEFT JOIN LATERAL(
  SELECT
   count(*) FILTER(WHERE COALESCE(jobs.job_config->>'collector_kind',source.type::text,'unknown')='app_store') AS app_store_count,
   count(*) FILTER(WHERE jobs.job_config->>'collector_kind'='pricing_page'
    AND jobs.job_config->>'official_web_source_key'=p.slug) AS official_web_count
  FROM collector_jobs jobs
  LEFT JOIN price_sources source ON source.id=jobs.source_id
  WHERE jobs.product_id=p.id AND jobs.job_type IN ('ai_pricing','streaming_pricing') AND jobs.status<>'archived'
 ) supported ON true
 LEFT JOIN LATERAL(
  SELECT CASE WHEN p.slug IN ('spotify','apple-music')
   AND supported.official_web_count>0 AND supported.app_store_count=0
   THEN 'web' ELSE 'ios' END AS billing_platform
 ) scope ON true
 LEFT JOIN LATERAL(
  SELECT count(*) AS price_count,
   count(*) FILTER(WHERE last_checked_at IS NULL OR last_checked_at<NOW()-INTERVAL '14 days') AS stale_count,
   max(last_checked_at) AS latest_checked
  FROM region_prices
  WHERE product_id=p.id AND status::text='published' AND billing_platform::text=scope.billing_platform
 ) pr ON true
 LEFT JOIN LATERAL(
  SELECT count(*) AS job_count,
   count(*) FILTER(WHERE latest.status='running') AS running_count,
   count(*) FILTER(WHERE latest.status='failed') AS failed_count,
   count(*) FILTER(WHERE latest.status IS DISTINCT FROM 'running' AND jobs.next_run_at<=NOW()) AS queued_count
  FROM collector_jobs jobs
  LEFT JOIN price_sources source ON source.id=jobs.source_id
  LEFT JOIN LATERAL(
   SELECT status FROM collector_job_runs WHERE job_id=jobs.id ORDER BY started_at DESC LIMIT 1
  ) latest ON true
  WHERE jobs.product_id=p.id AND jobs.status='active'
   AND CASE WHEN scope.billing_platform='web'
    THEN jobs.job_type IN ('ai_pricing','streaming_pricing')
     AND jobs.job_config->>'collector_kind'='pricing_page'
     AND jobs.job_config->>'official_web_source_key'=p.slug
    ELSE COALESCE(jobs.job_config->>'collector_kind',source.type::text,'unknown')='app_store'
   END
 ) j ON true
 WHERE p.status::text<>'archived' ORDER BY p.name`;
 return rows;
}

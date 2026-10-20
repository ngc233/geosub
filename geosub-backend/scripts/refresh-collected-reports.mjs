import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const reportLocales = ['zh','zh-tw','en','ja','ko','es','tr','ar','fr','it','de','pt'];
export function reportPaths(product) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(product)) throw Error('Invalid report product');
  return reportLocales.map(locale => `/reports/${locale}/${product}-global-pricing.pdf`);
}

export async function refreshCollectedReports(products, env = process.env, http = fetch, read = fs.readFileSync) {
  if (env.GEOSUB_CONTENT_DISTRIBUTION !== 'cloudflare') return { mode: 'inactive', products: 0, reports: 0 };
  if (env.GEOSUB_WEB_RUNTIME_FILE) {
    const runtime = JSON.parse(read(env.GEOSUB_WEB_RUNTIME_FILE, 'utf8'));
    env = {...env, GEOSUB_FRONTEND_DIR: runtime.app, GEOSUB_NEXT_DIST_DIR: runtime.dist, GEOSUB_WEB_HEALTH_URL: runtime.healthUrl};
  }
  if (!Array.isArray(products) || products.length > 50) throw Error('Invalid completed products');
  const unique = [...new Set(products)];
  const groups = unique.map(product => reportPaths(product));
  const origin = new URL(env.GEOSUB_WEB_HEALTH_URL || '');
  if (origin.protocol !== 'http:' || origin.hostname !== '127.0.0.1' || !origin.port || origin.username || origin.password) throw Error('Loopback report origin required');
  const zone = env.GEOSUB_CONTENT_CF_ZONE_ID || '', token = env.GEOSUB_CONTENT_CF_API_TOKEN || '';
  if (!/^[a-f0-9]{32}$/i.test(zone) || !token || /\s/.test(token) || env.GEOSUB_CONTENT_CACHE_POLICY !== 'audited-single-url') throw Error('Report CDN configuration unavailable');
  const app = env.GEOSUB_FRONTEND_DIR || '', dist = env.GEOSUB_NEXT_DIST_DIR || '.next';
  if (!path.isAbsolute(app) || dist !== '.next') throw Error('Active report build required');
  const preview = JSON.parse(read(path.join(app,dist,'prerender-manifest.json'),'utf8')).preview?.previewModeId;
  if (typeof preview !== 'string' || !/^[a-f0-9]+$/i.test(preview)) throw Error('Report origin revalidation unavailable');
  async function retry(action) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try { return await action(); } catch { if (attempt === 2) throw Error('Automatic report cache refresh failed after 3 attempts'); }
    }
  }
  let reports = 0;
  for (const paths of groups) {
    // Warm current origin data before invalidating the edge. The privileged
    // revalidation header never leaves loopback; CDN credentials only go to CF.
    for (let i = 0; i < paths.length; i += 3) {
      await Promise.all(paths.slice(i,i+3).map(report => retry(async () => {
        const response = await http(origin.origin + report, {redirect:'error',signal:AbortSignal.timeout(15_000),headers:{Host:'geosub.org','x-prerender-revalidate':preview}});
        // All prices may have been quarantined, making a report correctly 404.
        if (response.status !== 404 && (response.status !== 200 || !response.headers.get('content-type')?.includes('application/pdf'))) throw Error('Origin report unavailable');
        await response.arrayBuffer();
      })));
    }
    await retry(async () => {
      const response = await http(`https://api.cloudflare.com/client/v4/zones/${zone}/purge_cache`, {method:'POST',redirect:'error',signal:AbortSignal.timeout(10_000),headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({files:paths.map(p => 'https://geosub.org'+p)})});
      if (!response.ok || (await response.json()).success !== true) throw Error('Report purge rejected');
    });
    reports += paths.length;
  }
  return {mode:'refreshed',products:unique.length,reports};
}

if (process.argv[1] && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href) {
  try {
    if (process.argv[2] !== '--products-json') throw Error('Completed products required');
    console.log('Automatic report cache refresh: '+JSON.stringify(await refreshCollectedReports(JSON.parse(process.argv[3] || '[]'))));
  } catch { console.error('Automatic report cache refresh failed; see collector system-task status. No credentials logged.'); process.exitCode = 1; }
}

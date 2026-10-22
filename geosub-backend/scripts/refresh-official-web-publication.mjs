import fs from 'node:fs';
import path from 'node:path';
import { createHmac } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export async function refreshOfficialWebPublication(jobIds, env=process.env, http=fetch, read=fs.readFileSync) {
  if (!Array.isArray(jobIds) || jobIds.length>5 || jobIds.some(id=>!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))) throw Error('Invalid official Web completed jobs');
  if (!jobIds.length) return {jobs:0};
  if (!env.GEOSUB_WEB_RUNTIME_FILE) throw Error('Current website runtime required');
  const runtime=JSON.parse(read(env.GEOSUB_WEB_RUNTIME_FILE,'utf8'));
  const origin=new URL(runtime.healthUrl);
  if(origin.protocol!=='http:' || origin.hostname!=='127.0.0.1' || !origin.port || origin.username || origin.password || !path.isAbsolute(runtime.app) || runtime.dist!=='.next') throw Error('Loopback website runtime required');
  const preview=JSON.parse(read(path.join(runtime.app,runtime.dist,'prerender-manifest.json'),'utf8')).preview?.previewModeId;
  if(typeof preview!=='string' || !/^[a-f0-9]{32,128}$/i.test(preview)) throw Error('Current build publication key unavailable');
  for(const jobId of [...new Set(jobIds)]) {
    const proof=`${jobId}.`+createHmac('sha256',preview).update(`collector-publication-v1:${jobId}`).digest('hex');
    let complete=false;
    for(let attempt=0;attempt<3;attempt++){
      try{
        const response=await http(origin.origin+'/api/internal/revalidate/collector-success',{
          method:'POST',redirect:'error',signal:AbortSignal.timeout(10_000),
          headers:{'Content-Type':'application/json','x-geosub-collector-publication':proof},body:JSON.stringify({jobId})});
        if(response.status!==204) throw Error('Publication refresh rejected');
        complete=true;break;
      }catch{ /* Bounded retry on the private loopback connection only. */ }
    }
    if(!complete) throw Error('Official Web publication refresh failed after 3 attempts');
  }
  return {jobs:new Set(jobIds).size};
}
if(process.argv[1] && import.meta.url===pathToFileURL(fs.realpathSync(process.argv[1])).href){
  try{
    if(process.argv[2]!=='--job-ids-json') throw Error('Completed jobs required');
    console.log('Official Web publication cache refresh: '+JSON.stringify(await refreshOfficialWebPublication(JSON.parse(process.argv[3]||'[]'))));
  }catch{console.error('Official Web publication refresh failed; no credentials logged.');process.exitCode=1;}
}

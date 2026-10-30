/* Restart-safe local recovery runner. Server and runner share a private random
 * GEOSUB_CONTENT_RECOVERY_TOKEN. Never accepts a public origin or production DB.
 * --once performs one sweep; otherwise poll until stopped. No auto-installation.
 */
const {setTimeout:sleep}=require('node:timers/promises');
let db,origin;
try { db=new URL(process.env.DATABASE_URL||'invalid:');origin=new URL(process.env.GEOSUB_CONTENT_RECOVERY_ORIGIN||'invalid:'); }
catch { throw Error('Invalid local recovery configuration'); }
const token=process.env.GEOSUB_CONTENT_RECOVERY_TOKEN;
if(!['postgres:','postgresql:'].includes(db.protocol)||!['localhost','127.0.0.1','[::1]'].includes(db.hostname)||!/^\/geosub_release_\d{8}$/.test(db.pathname))throw Error('Dedicated local release DB required');
if(origin.protocol!=='http:'||origin.hostname!=='127.0.0.1'||!origin.port||origin.pathname!=='/'||origin.username||origin.password||origin.search||origin.hash)throw Error('Exact loopback origin required');
if(!token||!/^[a-f0-9]{64}$/.test(token))throw Error('Private recovery token required');
if(process.argv.slice(2).some(arg=>arg!=='--once'))throw Error('Only --once is supported');
const controller=new AbortController();
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>controller.abort());
(async()=>{
 do {
  try {
   const response=await fetch(new URL('/api/internal/content/recover',origin),{method:'POST',redirect:'error',headers:{'x-geosub-content-recovery':token},signal:AbortSignal.any([controller.signal,AbortSignal.timeout(20000)])});
   if(!response.ok)throw Error('Recovery request failed');
   const body=await response.json();
   console.log(JSON.stringify({at:new Date().toISOString(),results:body.results}));
  } catch { if(!controller.signal.aborted){console.error('Recovery sweep incomplete; next sweep will inspect durable state.');if(process.argv.includes('--once'))process.exitCode=1;} }
  if(process.argv.includes('--once')||controller.signal.aborted)break;
  await sleep(5000,undefined,{signal:controller.signal}).catch(()=>{});
 } while(!controller.signal.aborted);
})().catch(()=>{console.error('Local recovery runner failed.');process.exitCode=1;});
